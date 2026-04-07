const mongoose = require('mongoose');

const SimulationSchema = new mongoose.Schema({
  portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  simulationName: { type: String, required: true },
  growthRate: { type: Number, required: true },
  timeHorizon: { type: Number, required: true },
  projectedValue: { type: Number, required: true },
  startingValue: { type: Number, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Simulation', SimulationSchema);