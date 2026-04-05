const express = require('express');
const router = express.Router();
const Holding = require('../models/Holding');

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;

// Fetch live price from Alpha Vantage
async function getLivePrice(ticker) {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`
    );
    const data = await response.json();
    const price = data['Global Quote']['05. price'];
    return price ? parseFloat(price) : null;
  } catch (err) {
    return null;
  }
}

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

// Get all holdings for a portfolio (with live prices)
router.get('/:portfolioId', async (req, res) => {
  try {
    const holdings = await Holding.find({ portfolioId: req.params.portfolioId });
    const updated = await Promise.all(holdings.map(async (h) => {
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

// Create a holding
router.post('/', async (req, res) => {
  try {
    const holding = new Holding(req.body);
    const livePrice = await getLivePrice(holding.ticker);
    if (livePrice) {
      holding.currentPrice = livePrice;
      holding.priceLastUpdated = new Date();
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

module.exports = router;