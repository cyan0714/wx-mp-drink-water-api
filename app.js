require('dotenv').config();
const express = require('express');
const schedule = require('node-schedule');
const { sendWaterReminder } = require('./services/wechatService');
const { setupExpirationChecker, createWaterTask, createDailyTasks, setupDailyTasksScheduler } = require('./services/waterTaskService');
const connectDB = require('./config/db');
const User = require('./models/User');
const WaterTask = require('./models/WaterTask');

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
app.use('/api/water-task', require('./routes/waterTaskRoutes'));

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

// Setup scheduled job - at specific times (7:00, 9:30, 11:00, 13:30, 15:30, 17:00, 19:30, 21:00)
const reminderTimes = [
  '0 7 * * *',   // 7:00
  '30 9 * * *',  // 9:30
  '0 11 * * *',  // 11:00
  '30 13 * * *', // 13:30
  '30 15 * * *', // 15:30
  '0 17 * * *',  // 17:00
  '30 19 * * *', // 19:30
  '0 21 * * *'   // 21:00
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
    
    const now = new Date();
    const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    for (const user of users) {
      // 发送提醒消息
      await sendWaterReminder(user.openid, user.nickname);
      
      // Update lastReminded timestamp
      user.lastReminded = now;
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
    
    // 启动过期任务检查器
    // setupExpirationChecker();
    // console.log('Task expiration checker is active');
    
    // 启动每日任务创建调度器
    setupDailyTasksScheduler();
    console.log('Daily water tasks scheduler is active');
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
});
