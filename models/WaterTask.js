const mongoose = require('mongoose');
const moment = require('moment-timezone');

// 设置默认时区为北京时区
moment.tz.setDefault('Asia/Shanghai');

const WaterTaskSchema = new mongoose.Schema({
  openid: {
    type: String,
    required: true,
    trim: true,
    ref: 'User'
  },
  scheduledTime: {
    type: String,
    required: true,
    default: () => moment().format('YYYY-MM-DD HH:mm:ss')
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'missed'],
    default: 'pending'
  },
  waterAmount: {
    type: Number,
    default: 250 // 默认250ml
  },
  completedAt: {
    type: String,
    default: null
  },
  createdAt: {
    type: String,
    default: () => moment().format('YYYY-MM-DD HH:mm:ss')
  }
});

// 创建复合索引，确保每个用户在特定时间只有一个任务
WaterTaskSchema.index({ openid: 1, scheduledTime: 1 }, { unique: true });

module.exports = mongoose.model('WaterTask', WaterTaskSchema);