const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');

const ALLOWED_ROLES = ['user', 'admin'];

function normalizeRole(v) {
  return v === 'admin' ? 'admin' : 'user';
}

// Register (optional userRole for admin-created accounts)
router.post('/register', async (req, res) => {
  const { username, password, userRole } = req.body;
  if (username == null || String(username).trim() === '' || password == null || password === '') {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const userPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username: String(username).trim(),
      userPassword,
      userRole: normalizeRole(userRole),
    });
    await user.save();
    const safe = user.toObject();
    delete safe.userPassword;
    res.status(201).json({ message: 'User created', user: safe });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid username or password' });

    const isPasswordValid = await bcrypt.compare(password, user.userPassword);
    if (!isPasswordValid) return res.status(400).json({ error: 'Invalid username or password' });

    const portfolio = await Portfolio.findOne({ userId: user._id });

    res.json({
      message: 'Login successful',
      role: user.userRole,
      userId: user._id,
      portfolioId: portfolio ? portfolio._id : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List users (no password hashes)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-userPassword').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Single user — after /users so "users" is not captured as :id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-userPassword');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { username, userRole, password } = req.body;
    const updates = {};
    if (username !== undefined && String(username).trim() !== '') {
      updates.username = String(username).trim();
    }
    if (userRole !== undefined && ALLOWED_ROLES.includes(userRole)) {
      updates.userRole = userRole;
    }
    if (password !== undefined && password !== '') {
      updates.userPassword = await bcrypt.hash(password, 10);
    }
    if (Object.keys(updates).length === 0) {
      const existing = await User.findById(req.params.id).select('-userPassword');
      if (!existing) return res.status(404).json({ error: 'User not found' });
      return res.json(existing);
    }
    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).select(
      '-userPassword',
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
