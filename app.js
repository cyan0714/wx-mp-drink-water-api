require('dotenv').config();
const express = require('express');
const schedule = require('node-schedule');
const { sendWaterReminder } = require('./services/wechatService');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const cors = require('cors');
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
app.use('/api/wechat', require('./routes/wechatRoutes'));

// 添加登录接口获取openid和用户信息
app.post('/api/login', async (req, res) => {
  const { code, nickname, avatarUrl, gender, country, province, city } = req.body;
  if (!code) {
    return res.status(400).json({ error: '缺少code参数' });
  }
  
  try {
    const appid = process.env.WECHAT_APP_ID;
    const secret = process.env.WECHAT_APP_SECRET;
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    
    const axios = require('axios');
    const response = await axios.get(url);
    
    if (response.data.errcode) {
      return res.status(400).json({ error: '获取openid失败', details: response.data });
    }
    
    // 将openid保存到数据库中
    const { openid, session_key } = response.data;
    console.log('个人信息', response.data);
    
    // 查找用户或创建新用户
    let user = await User.findOne({ openid });
    
    if (user) {
      // 如果用户存在，更新用户信息（如果提供了）
      if (nickname) {
        user.nickname = nickname;
      }
      await user.save();
    } else {
      // 创建新用户
      user = new User({
        openid,
        nickname: nickname || '用户',
        subscribed: false // 默认未订阅
      });
      await user.save();
    }
    
    // 返回openid和订阅状态给客户端
    res.json({ 
      openid, 
      subscribed: user.subscribed,
      nickname: user.nickname
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// Home route
app.get('/', (req, res) => {
  res.send('Water Reminder Backend is running!');
});

// Setup scheduled job - at specific times (6:55, 9:25, 10:55, 13:25, 15:25, 16:55, 19:25, 20:55)
const reminderTimes = [
  '55 6 * * *',  // 6:55
  '25 9 * * *',  // 9:25
  '55 10 * * *', // 10:55
  '25 13 * * *', // 13:25
  '25 15 * * *', // 15:25
  '55 16 * * *', // 16:55
  '25 19 * * *', // 19:25
  '55 20 * * *'  // 20:55
  // '* * * * *'
];

// 创建多个定时任务，每个时间点一个
const reminderJobs = reminderTimes.map(time => {
  return schedule.scheduleJob(time, async () => {
    console.log(`Running scheduled water reminder job at ${new Date().toLocaleTimeString()}...`);
    console.log('Running scheduled water reminder job...');
  try {
    // Fetch all subscribed users from the database
    const users = await User.find({ subscribed: true });
    
    if (users.length === 0) {
      console.log('No subscribed users found');
      return;
    }
    
    console.log(`Sending water reminder to ${users.length} users`);
    
    for (const user of users) {
      await sendWaterReminder(user.openid, user.nickname);
      
      // Update lastReminded timestamp
      user.lastReminded = new Date();
      await user.save();
    }
    console.log('Water reminder sent successfully');
    } catch (error) {
      console.error('Error sending water reminder:', error.message);
    }
  });
});

// Connect to MongoDB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Water reminder scheduled job is active');
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
});
