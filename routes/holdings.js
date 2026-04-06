const express = require('express');
const router = express.Router();
const Holding = require('../models/Holding');

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB = 'https://finnhub.io/api/v1';

// Returns current price for a ticker, or null on failure
async function getLivePrice(ticker) {
  try {
    const res = await fetch(`${FINNHUB}/quote?symbol=${ticker}&token=${FINNHUB_KEY}`);
    const data = await res.json();
    return (data && data.c) ? data.c : null;
  } catch {
    return null;
  }
}

// Returns { name, sector } for a ticker — tries company profile first, falls back to symbol search
async function getCompanyProfile(ticker) {
  try {
    const res = await fetch(`${FINNHUB}/stock/profile2?symbol=${ticker}&token=${FINNHUB_KEY}`);
    const data = await res.json();
    if (data && data.name) {
      return { name: data.name, sector: data.finnhubIndustry || '' };
    }
    // Fallback: symbol search covers ETFs, crypto, etc.
    const searchRes = await fetch(`${FINNHUB}/search?q=${ticker}&token=${FINNHUB_KEY}`);
    const searchData = await searchRes.json();
    const match = searchData?.result?.find(r => r.symbol === ticker) ?? searchData?.result?.[0];
    if (match) {
      return { name: match.description || match.displaySymbol || ticker, sector: '' };
    }
    return null;
  } catch {
    return null;
  }
}

// Ticker lookup — returns name, sector, and current price for use in the Add Holding form
router.get('/lookup/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase().trim();
  try {
    const [profile, price] = await Promise.all([
      getCompanyProfile(ticker),
      getLivePrice(ticker),
    ]);

    if (!profile && !price) {
      return res.status(404).json({ error: `No data found for ticker "${ticker}"` });
    }

    res.json({
      ticker,
      name: profile?.name ?? '',
      sector: profile?.sector ?? '',
      currentPrice: price ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Refresh live prices for all of a user's holdings (skips holdings updated within the last hour)
router.post('/user/:userId/refresh', async (req, res) => {
  try {
    const Portfolio = require('../models/Portfolio');
    const portfolios = await Portfolio.find({ userId: req.params.userId });
    const portfolioIds = portfolios.map(p => p._id);
    const holdings = await Holding.find({ portfolioId: { $in: portfolioIds } });

    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    const updated = await Promise.all(holdings.map(async (h) => {
      const lastUpdated = h.priceLastUpdated ? new Date(h.priceLastUpdated).getTime() : 0;
      if (now - lastUpdated < ONE_HOUR) return h; // still fresh, skip
      const livePrice = await getLivePrice(h.ticker);
      if (livePrice) {
        h.currentPrice = livePrice;
        h.priceLastUpdated = new Date();
        await h.save();
      }
      return h;
    }));

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all holdings for a user across all portfolios
router.get('/user/:userId', async (req, res) => {
  try {
    const Portfolio = require('../models/Portfolio');
    const portfolios = await Portfolio.find({ userId: req.params.userId });
    const portfolioIds = portfolios.map(p => p._id);
    const holdings = await Holding.find({ portfolioId: { $in: portfolioIds } });
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Full real-time quote for a ticker — used by the Watchlist table
// IMPORTANT: must be declared BEFORE the /:portfolioId wildcard below
router.get('/quote/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase().trim();
  try {
    const [quoteRes, profileRes] = await Promise.all([
      fetch(`${FINNHUB}/quote?symbol=${ticker}&token=${FINNHUB_KEY}`),
      fetch(`${FINNHUB}/stock/profile2?symbol=${ticker}&token=${FINNHUB_KEY}`),
    ]);
    const quote = await quoteRes.json();
    const profile = await profileRes.json();

    res.json({
      ticker,
      currentPrice: quote.c ?? null,
      dayChange: quote.d ?? null,       // $ change
      dayChangePct: quote.dp ?? null,   // % change
      open: quote.o ?? null,
      high: quote.h ?? null,
      low: quote.l ?? null,
      prevClose: quote.pc ?? null,
      sector: profile?.finnhubIndustry ?? null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Get all holdings for a portfolio
router.get('/:portfolioId', async (req, res) => {
  try {
    const holdings = await Holding.find({ portfolioId: req.params.portfolioId });
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a holding
router.post('/', async (req, res) => {
  try {
    const holding = new Holding(req.body);
    // Fetch live price on creation only if one wasn't already provided (e.g. via the lookup form)
    if (!holding.currentPrice) {
      const livePrice = await getLivePrice(holding.ticker);
      if (livePrice) {
        holding.currentPrice = livePrice;
        holding.priceLastUpdated = new Date();
      }
    }
    await holding.save();
    res.json(holding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a holding
router.put('/:id', async (req, res) => {
  try {
    const holding = await Holding.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(holding);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a holding
router.delete('/:id', async (req, res) => {
  try {
    await Holding.findByIdAndDelete(req.params.id);
    res.json({ message: 'Holding deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Full real-time quote is now declared above the /:portfolioId wildcard. Keeping module export.
module.exports = router;
