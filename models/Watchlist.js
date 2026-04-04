const mongoose = require('mongoose');

const WatchlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticker: { type: String, required: true },
  name: { type: String, required: true },
  assetClass: { type: String, enum: ['stock', 'ETF', 'crypto', 'bond', 'other'] },
  currentPrice: { type: Number },
  priceLastUpdated: { type: Date },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Watchlist', WatchlistSchema);