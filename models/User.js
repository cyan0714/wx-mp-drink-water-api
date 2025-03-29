const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  openid: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nickname: {
    type: String,
    default: '用户',
    trim: true
  },
  subscribed: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastReminded: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('User', UserSchema);