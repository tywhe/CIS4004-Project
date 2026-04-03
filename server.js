const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 8080;
const cors = require('cors')
app.use(cors());

// Connect to MongoDB
// Create a database for your app (e.g. "portfolio") and a "users" collection inside it.
mongoose.connect('mongodb://localhost:27017/portfolio')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB error:', err));

// User model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "user" }
});
const User = mongoose.model('User', UserSchema);

// Middleware
app.use(express.json());

// Register route
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Never store plaintext passwords in MongoDB.
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ email, passwordHash });
    await user.save();
    res.json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: 'Email already exists' });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Look up by email only, then verify password by comparing against passwordHash.
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    res.json({ message: "Login successful", role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const distPath = path.join(__dirname, 'client', 'reactapp', 'dist');
const indexHtml = path.join(distPath, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.error(
    'React production build not found. From the project root run:\n' +
      '  npm run build\n' +
      'Then start again with:\n' +
      '  npm start\n' +
      '\n' +
      'For local development with hot reload, use:\n' +
      '  npm run dev',
  );
}

app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api')) return next();
  if (path.extname(req.path)) return next();
  res.sendFile(indexHtml);
});

app.listen(PORT, () => {
  console.log(`Login route: http://localhost:${PORT}/`);
  console.log(`Dashboard route: http://localhost:${PORT}/dashboard`);
});