const express = require('express');
const router = express.Router();
const WaterTask = require('../models/WaterTask');
const User = require('../models/User');
const moment = require('moment-timezone');

// 设置默认时区为北京时区
moment.tz.setDefault('Asia/Shanghai');

// 格式化日期为指定格式的字符串
const formatDateTime = (date) => {
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * @route   POST /api/water-task/complete
 * @desc    完成喝水任务
 * @access  Public
 */
router.post('/complete', async (req, res) => {
  try {
    const { openid, taskId } = req.body;

    if (!openid) {
      return res.status(400).json({ success: false, error: '缺少openid参数' });
    }

    // 如果提供了特定任务ID，则更新该任务
    if (taskId) {
      const task = await WaterTask.findById(taskId);

      if (!task) {
        return res.status(404).json({ success: false, error: '任务不存在' });
      }

      if (task.openid !== openid) {
        return res.status(403).json({ success: false, error: '无权操作此任务' });
      }

      // 只有待完成的任务才能被标记为完成
      if (task.status === 'pending') {
        task.status = 'completed';
        task.completedAt = formatDateTime(new Date());
        await task.save();

        return res.json({
          success: true,
          message: '任务已完成',
          task
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `任务已${task.status === 'completed' ? '完成' : '过期'}，无法再次完成`
        });
      }
    } else {
      // 如果没有提供任务ID，则查找当前时间最近的待完成任务
      const now = new Date();
      const formattedNow = formatDateTime(now);
      const task = await WaterTask.findOne({
        openid,
        status: 'pending',
        scheduledTime: { $lte: formattedNow }
      }).sort({ scheduledTime: -1 }); // 获取最近的一个任务

      if (!task) {
        return res.status(404).json({ success: false, error: '没有找到待完成的任务' });
      }

      task.status = 'completed';
      task.completedAt = formattedNow;
      await task.save();

      return res.json({
        success: true,
        message: '任务已完成',
        task
      });
    }
  } catch (error) {
    console.error('完成任务失败:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/water-task/cancel
 * @desc    Cancel a completed water task
 * @access  Public
 */
router.post('/cancel', async (req, res) => {
  try {
    const { openid, taskId } = req.body;

    if (!openid) {
      return res.status(400).json({ success: false, error: '缺少openid参数' });
    }

    if (!taskId) {
      return res.status(400).json({ success: false, error: '缺少taskId参数' });
    }

    const task = await WaterTask.findById(taskId);

    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    if (task.openid !== openid) {
      return res.status(403).json({ success: false, error: '无权操作此任务' });
    }

    // Only completed tasks can be cancelled
    if (task.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: '只有已完成的任务可以被取消'
      });
    }

    // Reset task status to pending and clear completedAt
    task.status = 'pending';
    task.completedAt = null;
    await task.save();

    return res.json({
      success: true,
      message: '任务已取消完成',
      task
    });
  } catch (error) {
    console.error('取消完成任务失败:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * @route   GET /api/water-task/list
 * @desc    获取用户的喝水任务列表
 * @access  Public
 */
router.get('/list/:openid', async (req, res) => {
  try {
    const { openid } = req.params;
    const { date } = req.query;

    if (!openid) {
      return res.status(400).json({ success: false, error: '缺少openid参数' });
    }

    // 查询条件
    const query = { openid };

    // 如果提供了日期，则只查询该日期的任务
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      query.scheduledTime = {
        $gte: formatDateTime(startDate),
        $lte: formatDateTime(endDate)
      };
    }

    const tasks = await WaterTask.find(query).sort({ scheduledTime: 1 });
    // Update status to 'missed' for overdue tasks
    const now = formatDateTime(new Date());
    tasks.forEach(task => {
      if (task.scheduledTime < now && !task.completedAt) {
        task.status = 'missed';
      }
    });

    // Save all updated tasks
    await Promise.all(tasks.map(task => task.save()));

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('获取任务列表失败:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/water-task/today-status/:openid
 * @desc    获取用户今日喝水状态
 * @access  Public
 */
router.get('/today-status/:openid', async (req, res) => {
  try {
    const { openid } = req.params;

    if (!openid) {
      return res.status(400).json({ success: false, error: '缺少openid参数' });
    }

    // 获取今天的开始和结束时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 查询今天的所有任务
    const tasks = await WaterTask.find({
      openid,
      scheduledTime: {
        $gte: formatDateTime(today),
        $lt: formatDateTime(tomorrow)
      }
    }).sort({ scheduledTime: 1 });

    // 计算总饮水量和完成率
    let totalWater = 0;
    let completedTasks = 0;

    tasks.forEach(task => {
      if (task.status === 'completed') {
        totalWater += task.waterAmount;
        completedTasks++;
      }
    });

    const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    res.json({
      success: true,
      todayStats: {
        totalTasks: tasks.length,
        completedTasks,
        missedTasks: tasks.filter(t => t.status === 'missed').length,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        totalWater,
        completionRate: Math.round(completionRate)
      },
      tasks
    });
  } catch (error) {
    console.error('获取今日状态失败:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   DELETE /api/water-task/delete/:openid
 * @desc    Delete user's water task list
 * @access  Public
 */
router.delete('/delete/:openid', async (req, res) => {
  try {
    const { openid } = req.params;

    if (!openid) {
      return res.status(400).json({ success: false, error: '缺少openid参数' });
    }

    // Query conditions
    const query = { openid };

    // Delete tasks matching the query
    const result = await WaterTask.deleteMany(query);

    res.json({
      success: true,
      message: '删除成功',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('删除任务列表失败:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/water-task/today-water/:openid
 * @desc    获取用户当天喝水量
 * @access  Public
 */
router.get('/today-water/:openid', async (req, res) => {
  try {
    const { openid } = req.params;

    if (!openid) {
      return res.status(400).json({ success: false, error: '缺少openid参数' });
    }

    // 获取今天的开始和结束时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 查询今天已完成的任务
    const completedTasks = await WaterTask.find({
      openid,
      status: 'completed',
      scheduledTime: {
        $gte: formatDateTime(today),
        $lt: formatDateTime(tomorrow)
      }
    }).sort({ scheduledTime: 1 });

    // 计算总饮水量
    let totalWater = 0;
    completedTasks.forEach(task => {
      totalWater += task.waterAmount;
    });

    res.json({
      success: true,
      totalWater,
      completedCount: completedTasks.length,
      tasks: completedTasks
    });
  } catch (error) {
    console.error('获取当天喝水量失败:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
