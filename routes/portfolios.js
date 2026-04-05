const express = require('express');
const mongoose = require('mongoose');
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
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid portfolio id' });
    }
    const { portfolioName, portfolioType } = req.body;
    const updates = {};
    if (portfolioName !== undefined) {
      updates.portfolioName = String(portfolioName).trim();
    }
    if (portfolioType !== undefined) {
      updates.portfolioType = portfolioType;
    }
    if (Object.keys(updates).length === 0) {
      const existing = await Portfolio.findById(id);
      if (!existing) return res.status(404).json({ error: 'Portfolio not found' });
      return res.json(existing);
    }
    const portfolio = await Portfolio.findByIdAndUpdate(id, { $set: updates }, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    res.json(portfolio);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a portfolio
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid portfolio id' });
    }
    const deleted = await Portfolio.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Portfolio not found' });
    res.json({ message: 'Portfolio deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;