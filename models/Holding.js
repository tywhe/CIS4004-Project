const mongoose = require('mongoose');

const HoldingSchema = new mongoose.Schema({
  portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true },
  ticker: { type: String, required: true },
  name: { type: String, required: true },
  assetClass: { type: String, enum: ['stock', 'ETF', 'crypto', 'bond', 'other'], required: true },
  sector: { type: String },
  quantity: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  currentPrice: { type: Number },
  priceLastUpdated: { type: Date },
  purchaseDate: { type: Date },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Holding', HoldingSchema);