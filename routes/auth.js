const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');

// Register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, userPassword });
    await user.save();
    res.json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: 'Username already exists' });
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

    // Find the user's portfolio
    const portfolio = await Portfolio.findOne({ userId: user._id });

    res.json({
      message: 'Login successful',
      role: user.userRole,
      userId: user._id,
      portfolioId: portfolio ? portfolio._id : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;