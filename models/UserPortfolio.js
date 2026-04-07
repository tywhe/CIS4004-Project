const mongoose = require('mongoose');

// Join table implementing the many-to-many relationship between Users and Portfolios.
// A user can have many portfolios; a portfolio can be shared with many users.
const UserPortfolioSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',      required: true },
  portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true },
  role:        { type: String, enum: ['owner', 'viewer'], default: 'owner' },
}, { timestamps: true });

// Prevent duplicate memberships
UserPortfolioSchema.index({ userId: 1, portfolioId: 1 }, { unique: true });

module.exports = mongoose.model('UserPortfolio', UserPortfolioSchema);
