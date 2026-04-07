const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const UserPortfolio = require('../models/UserPortfolio');
const User = require('../models/User');

// Get all portfolios for a user (owned + shared via UserPortfolio join table)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all UserPortfolio records for this user
    const memberships = await UserPortfolio.find({ userId }).populate('portfolioId');

    // Build response: attach role to each portfolio
    const portfolios = memberships
      .filter(m => m.portfolioId) // guard against orphaned records
      .map(m => ({
        ...m.portfolioId.toObject(),
        role: m.role,
      }));

    res.json(portfolios);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a portfolio — also creates the owner UserPortfolio record
router.post('/', async (req, res) => {
  try {
    const { userId, portfolioName, portfolioType } = req.body;

    const portfolio = new Portfolio({ userId, portfolioName, portfolioType });
    await portfolio.save();

    // Create the many-to-many join record with role 'owner'
    await UserPortfolio.create({ userId, portfolioId: portfolio._id, role: 'owner' });

    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Share a portfolio with another user by username
router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, requestingUserId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid portfolio id' });
    }

    // Verify the portfolio exists
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    // Only the owner can share
    const ownerRecord = await UserPortfolio.findOne({
      portfolioId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(requestingUserId),
      role: 'owner',
    });
    if (!ownerRecord) return res.status(403).json({ error: 'Only the portfolio owner can share it' });

    // Find the target user by username
    const targetUser = await User.findOne({ username: username.trim() });
    if (!targetUser) return res.status(404).json({ error: `No user found with username "${username}"` });

    // Don't share with yourself
    if (String(targetUser._id) === String(requestingUserId)) {
      return res.status(400).json({ error: 'You cannot share a portfolio with yourself' });
    }

    // Create the join record (upsert — idempotent if already shared)
    await UserPortfolio.findOneAndUpdate(
      { userId: targetUser._id, portfolioId: id },
      { userId: targetUser._id, portfolioId: id, role: 'viewer' },
      { upsert: true, new: true }
    );

    res.json({ message: `Portfolio shared with ${targetUser.username}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Revoke a user's access to a portfolio
router.delete('/:id/share/:targetUserId', async (req, res) => {
  try {
    const { id, targetUserId } = req.params;
    const { requestingUserId } = req.body;

    const ownerRecord = await UserPortfolio.findOne({ portfolioId: id, userId: requestingUserId, role: 'owner' });
    if (!ownerRecord) return res.status(403).json({ error: 'Only the portfolio owner can revoke access' });

    await UserPortfolio.findOneAndDelete({ portfolioId: id, userId: targetUserId });
    res.json({ message: 'Access revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Migration: create missing UserPortfolio join records for existing portfolios
// Safe to call repeatedly — upsert prevents duplicates
router.post('/migrate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const portfolios = await Portfolio.find({ userId });
    await Promise.all(portfolios.map(p =>
      UserPortfolio.findOneAndUpdate(
        { userId, portfolioId: p._id },
        { userId, portfolioId: p._id, role: 'owner' },
        { upsert: true, new: true }
      )
    ));
    res.json({ migrated: portfolios.length });
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
    if (portfolioName !== undefined) updates.portfolioName = String(portfolioName).trim();
    if (portfolioType !== undefined) updates.portfolioType = portfolioType;

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
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a portfolio — also cleans up all UserPortfolio join records
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid portfolio id' });
    }
    const deleted = await Portfolio.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Portfolio not found' });

    // Clean up all join records for this portfolio
    await UserPortfolio.deleteMany({ portfolioId: id });

    res.json({ message: 'Portfolio deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
