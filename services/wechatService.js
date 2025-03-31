const axios = require('axios');

// 缓存 access token
let accessTokenCache = {
  token: null,
  expiresAt: null
};

/**
 * 获取微信 access token
 */
const getAccessToken = async () => {
  // 如果缓存中有有效的 token，直接返回
  if (accessTokenCache.token && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  try {
    const appid = process.env.WECHAT_APP_ID;
    const secret = process.env.WECHAT_APP_SECRET;
    
    if (!appid || !secret) {
      throw new Error('WECHAT_APP_ID or WECHAT_APP_SECRET not configured');
    }
    
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    const response = await axios.get(url);
    
    if (response.data.errcode) {
      throw new Error(`WeChat API error: ${response.data.errmsg}`);
    }
    
    // 缓存 token，设置过期时间（提前5分钟过期）
    const expiresIn = response.data.expires_in || 7200;
    accessTokenCache = {
      token: response.data.access_token,
      expiresAt: Date.now() + (expiresIn - 300) * 1000
    };
    
    return accessTokenCache.token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

/**
 * 发送喝水提醒
 */
const sendWaterReminder = async (openid, nickname) => {
  try {
    const token = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`;
    
    const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const timeString = `${now.getUTCHours()}:${now.getUTCMinutes().toString().padStart(2, '0')}`;
    console.log('北京时间:', timeString);
    
    // 构建消息数据
    const data = {
      touser: openid,
      template_id: process.env.WECHAT_TEMPLATE_ID,
      page: 'pages/index/index',
      data: {
        time2: {
          value: timeString
        },
        // thing3: `亲爱的${nickname}，该喝水啦！保持水分对健康很重要哦。`
        thing3: {
          value: `${nickname}，该喝水啦！`
        }
      }
    };
    
    const response = await axios.post(url, data);
    
    if (response.data.errcode !== 0) {
      throw new Error(`Send reminder failed: ${response.data.errmsg}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending water reminder:', error);
    throw error;
  }
};

module.exports = {
  getAccessToken,
  sendWaterReminder
};
