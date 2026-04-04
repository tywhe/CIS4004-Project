const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');

// Get all portfolios for a user
router.get('/:userId', async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ userId: req.params.userId });
    res.json(portfolios);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a portfolio
router.post('/', async (req, res) => {
  try {
    const portfolio = new Portfolio(req.body);
    await portfolio.save();
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a portfolio
router.put('/:id', async (req, res) => {
  try {
    const portfolio = await Portfolio.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a portfolio
router.delete('/:id', async (req, res) => {
  try {
    await Portfolio.findByIdAndDelete(req.params.id);
    res.json({ message: 'Portfolio deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;