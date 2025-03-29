const express = require('express');
const router = express.Router();
const { getAccessToken } = require('../services/wechatService');
const User = require('../models/User');

/**
 * @route   GET /api/wechat/token
 * @desc    Get WeChat access token (for testing purposes)
 * @access  Public
 */
router.get('/token', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ success: true, token });
  } catch (error) {
    console.error('Error in token route:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/wechat/subscribe
 * @desc    Subscribe a user to water reminders
 * @access  Public
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { openid, nickname } = req.body;
    
    if (!openid) {
      return res.status(400).json({ success: false, error: 'OpenID is required' });
    }
    
    // 查找用户并更新订阅状态
    const user = await User.findOne({ openid });
    
    if (!user) {
      // 如果用户不存在，创建新用户
      const newUser = new User({
        openid,
        nickname: nickname || '用户',
        subscribed: true
      });
      await newUser.save();
      return res.json({ 
        success: true, 
        message: `User ${nickname || '用户'} with OpenID ${openid} subscribed successfully` 
      });
    }
    
    // 更新用户订阅状态
    user.subscribed = true;
    if (nickname) {
      user.nickname = nickname;
    }
    await user.save();
    
    res.json({ 
      success: true, 
      message: `User ${user.nickname} with OpenID ${openid} subscribed successfully` 
    });
  } catch (error) {
    console.error('Error in subscribe route:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/wechat/unsubscribe
 * @desc    Unsubscribe a user from water reminders
 * @access  Public
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { openid } = req.body;
    
    if (!openid) {
      return res.status(400).json({ success: false, error: 'OpenID is required' });
    }
    
    // 查找用户并更新订阅状态
    const user = await User.findOne({ openid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // 更新用户订阅状态
    user.subscribed = false;
    await user.save();
    
    res.json({ 
      success: true, 
      message: `User with OpenID ${openid} unsubscribed successfully` 
    });
  } catch (error) {
    console.error('Error in unsubscribe route:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/wechat/users
 * @desc    Get all subscribed users
 * @access  Public
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ subscribed: true });
    res.json({ 
      success: true, 
      count: users.length,
      users: users.map(user => ({
        openid: user.openid,
        nickname: user.nickname,
        lastReminded: user.lastReminded
      }))
    });
  } catch (error) {
    console.error('Error in get users route:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/wechat/allusers
 * @desc    Get all users (both subscribed and unsubscribed)
 * @access  Public
 */
router.get('/allusers', async (req, res) => {
  try {
    const users = await User.find();
    res.json({ 
      success: true, 
      count: users.length,
      users: users.map(user => ({
        openid: user.openid,
        nickname: user.nickname,
        subscribed: user.subscribed,
        lastReminded: user.lastReminded,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('Error in get all users route:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/wechat/user/:openid
 * @desc    Get user by openid
 * @access  Public
 */
router.get('/user/:openid', async (req, res) => {
  try {
    const user = await User.findOne({ openid: req.params.openid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      user: {
        openid: user.openid,
        nickname: user.nickname,
        subscribed: user.subscribed,
        lastReminded: user.lastReminded,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error in get user route:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
