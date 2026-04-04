const mongoose = require('mongoose');

const PortfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  portfolioName: { type: String, required: true },
  portfolioType: { type: String, enum: ['investment', 'theoretical', 'crypto', 'retirement'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', PortfolioSchema);