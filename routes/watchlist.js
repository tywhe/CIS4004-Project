const express = require('express');
const router = express.Router();
const Watchlist = require('../models/Watchlist');

// Get watchlist for a user
router.get('/:userId', async (req, res) => {
  try {
    const watchlist = await Watchlist.find({ userId: req.params.userId });
    res.json(watchlist);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add to watchlist
router.post('/', async (req, res) => {
  try {
    const item = new Watchlist(req.body);
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete from watchlist
router.delete('/:id', async (req, res) => {
  try {
    await Watchlist.findByIdAndDelete(req.params.id);
    res.json({ message: 'Removed from watchlist' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;