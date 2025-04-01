const WaterTask = require('../models/WaterTask');
const schedule = require('node-schedule');

// 格式化日期为指定格式的字符串
const formatDateTime = (date) => {
  const pad = (num) => String(num).padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 创建喝水任务
 * @param {String} openid 用户的openid
 * @param {Date} scheduledTime 计划喝水时间
 * @param {Number} waterAmount 喝水量(ml)
 */
const createWaterTask = async (openid, scheduledTime, waterAmount = 250) => {
  try {
    // 将Date对象转换为格式化的字符串
    const formattedTime = formatDateTime(scheduledTime);
    
    // 检查是否已存在相同时间的任务
    const existingTask = await WaterTask.findOne({ openid, scheduledTime: formattedTime });
    
    if (existingTask) {
      return existingTask;
    }
    
    const task = new WaterTask({
      openid,
      scheduledTime: formattedTime,
      waterAmount,
      status: 'pending'
    });
    
    console.log('创建新任务:', task);
    await task.save();
    return task;
  } catch (error) {
    console.error('创建喝水任务失败:', error);
    throw error;
  }
};

/**
 * 更新任务状态为已完成
 * @param {String} taskId 任务ID
 */
const completeWaterTask = async (taskId) => {
  try {
    const task = await WaterTask.findById(taskId);
    
    if (!task) {
      throw new Error('任务不存在');
    }
    
    if (task.status !== 'pending') {
      throw new Error(`任务已${task.status === 'completed' ? '完成' : '过期'}，无法再次完成`);
    }
    
    task.status = 'completed';
    task.completedAt = formatDateTime(new Date());
    await task.save();
    
    return task;
  } catch (error) {
    console.error('完成喝水任务失败:', error);
    throw error;
  }
};

/**
 * 检查并更新过期的任务
 */
const checkExpiredTasks = async () => {
  try {
    const now = new Date();
    // 查找所有已过期但仍为pending状态的任务
    // 设置15分钟的宽限期
    const cutoffTime = new Date(now.getTime() - 15 * 60 * 1000);
    const formattedCutoffTime = formatDateTime(cutoffTime);
    
    const expiredTasks = await WaterTask.find({
      status: 'pending',
      scheduledTime: { $lt: formattedCutoffTime }
    });
    
    console.log(`找到 ${expiredTasks.length} 个过期任务`);
    
    for (const task of expiredTasks) {
      task.status = 'missed';
      await task.save();
    }
    
    return expiredTasks.length;
  } catch (error) {
    console.error('检查过期任务失败:', error);
    throw error;
  }
};

/**
 * 为用户创建一天的喝水任务
 * @param {String} openid 用户的openid
 * @param {Array} times 时间数组，格式为 ["7:00", "9:30", ...]
 * @param {Number} waterAmount 每次喝水量
 */
const createDailyTasks = async (openid, times = ["7:00", "9:30", "11:00", "13:30", "15:30", "17:00", "19:30", "21:00"], waterAmount = 200) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasks = [];
    
    for (const timeStr of times) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      const timeDate = new Date(today);
      timeDate.setHours(hours, minutes, 0, 0);
      
      // 如果时间已经过了，就不创建任务
      if (timeDate < new Date()) {
        continue;
      }
      
      const task = await createWaterTask(openid, timeDate, waterAmount);
      tasks.push(task);
    }
    
    return tasks;
  } catch (error) {
    console.error('创建每日任务失败:', error);
    throw error;
  }
};

/**
 * 删除用户某一天的所有喝水任务
 * @param {String} openid 用户的openid
 * @param {Date} date 指定日期，默认为今天
 * @returns {Number} 删除的任务数量
 */
const deleteUserDailyTasks = async (openid) => {
  try {
    const result = await WaterTask.deleteMany({
      openid,
    });
    
    console.log(`已删除用户 ${openid} 的 ${result.deletedCount} 个喝水任务`);
    return result.deletedCount;
  } catch (error) {
    console.error('删除用户每日任务失败:', error);
    throw error;
  }
};

// 设置定时任务，每5分钟检查一次过期任务
const setupExpirationChecker = () => {
  return schedule.scheduleJob('*/5 * * * *', async () => {
    console.log('检查过期任务...');
    try {
      const count = await checkExpiredTasks();
      console.log(`已将 ${count} 个任务标记为过期`);
    } catch (error) {
      console.error('自动检查过期任务失败:', error);
    }
  });
};

/**
 * 设置每日凌晨自动创建喝水任务的定时器
 * 在每天00:00时为所有订阅用户创建当天的喝水任务
 */
const setupDailyTasksScheduler = () => {
  // 立即检查并创建今日任务
  checkAndCreateTodayTasks();
  
  // 保持原有的每日凌晨调度
  return schedule.scheduleJob('0 0 * * *', async () => {
    console.log('开始为用户创建每日喝水任务...');
    await checkAndCreateTodayTasks();
  });
};

/**
 * 检查并为没有今日任务的用户创建任务
 */
const checkAndCreateTodayTasks = async () => {
  try {
    const User = require('../models/User');
    // 获取所有订阅的用户
    const users = await User.find({});
    
    console.log(`检查 ${users.length} 个用户的今日喝水任务`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formattedToday = formatDateTime(today);
    const formattedTomorrow = formatDateTime(tomorrow);
    
    for (const user of users) {
      // 检查用户今天是否已有任务
      const existingTasks = await WaterTask.find({
        openid: user.openid,
        scheduledTime: { $gte: formattedToday, $lt: formattedTomorrow }
      });
      
      if (existingTasks.length === 0) {
        // 如果没有今日任务，立即创建
        await createDailyTasks(user.openid);
        console.log(`已为用户 ${user.openid} 创建今日喝水任务`);
      } else {
        console.log(`用户 ${user.openid} 已有 ${existingTasks.length} 个今日任务，跳过创建`);
      }
    }
    
    console.log('所有用户的每日喝水任务检查完成');
  } catch (error) {
    console.error('检查和创建每日喝水任务失败:', error);
  }
};

// 不要忘记在模块导出中添加新函数
module.exports = {
  createWaterTask,
  completeWaterTask,
  checkExpiredTasks,
  createDailyTasks,
  setupExpirationChecker,
  setupDailyTasksScheduler,
  checkAndCreateTodayTasks,  // 添加新函数到导出
  deleteUserDailyTasks
};
