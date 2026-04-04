const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  userPassword: { type: String, required: true },
  userRole: { type: String, default: "user" }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);