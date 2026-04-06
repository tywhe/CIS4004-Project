const express = require('express');
const router = express.Router();
const Simulation = require('../models/Simulation');

// Get all simulations for a user
router.get('/:userId', async (req, res) => {
  try {
    const simulations = await Simulation.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(simulations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a simulation
router.post('/', async (req, res) => {
  try {
    const simulation = new Simulation(req.body);
    await simulation.save();
    res.json(simulation);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a simulation
router.delete('/:id', async (req, res) => {
  try {
    await Simulation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Simulation deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;