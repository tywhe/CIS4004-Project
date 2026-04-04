const express = require('express');
const router = express.Router();
const Holding = require('../models/Holding');

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
    await holding.save();
    res.json(holding);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a holding
router.put('/:id', async (req, res) => {
  try {
    const holding = await Holding.findByIdAndUpdate(req.params.id, req.body, { new: true });
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