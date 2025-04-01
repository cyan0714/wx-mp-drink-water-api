# API 测试用例文档

本文档提供了所有API接口的测试用例，主要使用curl命令进行测试。

## 目录

1. [首页接口](#首页接口)
2. [登录接口](#登录接口)
3. [微信接口](#微信接口)
   - [获取访问令牌](#获取访问令牌)
   - [订阅提醒](#订阅提醒)
   - [取消订阅](#取消订阅)
   - [获取所有用户](#获取所有用户)
4. [喝水任务接口](#喝水任务接口)
   - [完成喝水任务](#完成喝水任务)
   - [获取任务列表](#获取任务列表)
   - [获取今日状态统计](#获取今日状态统计)

## 首页接口

### GET /

检查服务器是否正常运行。

```bash
curl -X GET https://ewjkubagteyd.sealoshzh.site/
```

预期响应：
```
Water Reminder Backend is running!
```

## 登录接口

### POST /api/login

通过微信小程序的code获取用户的openid并创建或更新用户信息。

**参数说明：**

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| code | String | 是 | 微信小程序登录时获取的code |
| nickname | String | 否 | 用户昵称 |

**测试用例：**

```bash
curl -X POST https://ewjkubagteyd.sealoshzh.site/api/login \
  -H "Content-Type: application/json" \
  -d '{"code":"023Bj3000QWnXM1Qqr300Ot0Ug0Bj30q", "nickname":"测试用户"}'
```

预期响应：
```json
{
  "openid": "oXYZ123456789",
  "subscribed": false,
  "nickname": "测试用户"
}
```

错误响应（缺少code参数）：
```json
{
  "error": "缺少code参数"
}
```

## 微信接口

### 获取访问令牌

#### GET /api/wechat/token

获取微信访问令牌（仅用于测试目的）。

```bash
curl -X GET https://ewjkubagteyd.sealoshzh.site/api/wechat/token
```

预期响应：
```json
{
  "success": true,
  "token": "ACCESS_TOKEN_VALUE"
}
```

错误响应：
```json
{
  "success": false,
  "error": "错误信息"
}
```

### 订阅提醒

#### POST /api/wechat/subscribe

订阅喝水提醒服务。

**参数说明：**

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| openid | String | 是 | 用户的微信openid |
| nickname | String | 否 | 用户昵称 |

**测试用例：**

```bash
curl -X POST https://ewjkubagteyd.sealoshzh.site/api/wechat/subscribe \
  -H "Content-Type: application/json" \
  -d '{"openid":"oXYZ123456789", "nickname":"测试用户"}'
```

预期响应：
```json
{
  "success": true,
  "message": "User 测试用户 with OpenID oXYZ123456789 subscribed successfully"
}
```

错误响应（缺少openid参数）：
```json
{
  "success": false,
  "error": "OpenID is required"
}
```

### 取消订阅

#### POST /api/wechat/unsubscribe

取消喝水提醒服务的订阅。

**参数说明：**

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| openid | String | 是 | 用户的微信openid |

**测试用例：**

```bash
curl -X POST https://ewjkubagteyd.sealoshzh.site/api/wechat/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"openid":"oXYZ123456789"}'
```

预期响应：
```json
{
  "success": true,
  "message": "User with OpenID oXYZ123456789 unsubscribed successfully"
}
```

错误响应（用户不存在）：
```json
{
  "success": false,
  "error": "User not found"
}
```

错误响应（缺少openid参数）：
```json
{
  "success": false,
  "error": "OpenID is required"
}
```

### 获取所有用户

#### GET /api/wechat/allusers

获取所有用户信息（包括已订阅和未订阅的用户）。

```bash
curl -X GET https://ewjkubagteyd.sealoshzh.site/api/wechat/allusers
```

预期响应：
```json
{
  "success": true,
  "count": 2,
  "users": [
    {
      "openid": "oXYZ123456789",
      "nickname": "测试用户1",
      "subscribed": true,
      "lastReminded": "2023-05-01T08:00:00.000Z",
      "createdAt": "2023-04-15T10:30:00.000Z"
    },
    {
      "openid": "oABC987654321",
      "nickname": "测试用户2",
      "subscribed": false,
      "lastReminded": null,
      "createdAt": "2023-04-20T14:45:00.000Z"
    }
  ]
}
```

错误响应：
```json
{
  "success": false,
  "error": "错误信息"
}
```

## 喝水任务接口

### 完成喝水任务

#### POST /api/water-task/complete

完成一个喝水任务。

**参数说明：**

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| openid | String | 是 | 用户的微信openid |
| taskId | String | 否 | 任务ID，如不提供则完成最近的待完成任务 |

**测试用例1（使用任务ID完成特定任务）：**

```bash
curl -X POST https://ewjkubagteyd.sealoshzh.site/api/water-task/complete \
  -H "Content-Type: application/json" \
  -d '{"openid":"oXYZ123456789", "taskId":"60a1e2c3d4e5f6g7h8i9j0k1"}'
```

预期响应：
```json
{
  "success": true,
  "message": "任务已完成",
  "task": {
    "_id": "60a1e2c3d4e5f6g7h8i9j0k1",
    "openid": "oXYZ123456789",
    "scheduledTime": "2023-05-01T09:25:00.000Z",
    "status": "completed",
    "waterAmount": 250,
    "completedAt": "2023-05-01T09:30:00.000Z",
    "createdAt": "2023-05-01T06:55:00.000Z"
  }
}
```

**测试用例2（完成最近的待完成任务）：**

```bash
curl -X POST https://ewjkubagteyd.sealoshzh.site/api/water-task/complete \
  -H "Content-Type: application/json" \
  -d '{"openid":"oXYZ123456789"}'
```

预期响应：
```json
{
  "success": true,
  "message": "任务已完成",
  "task": {
    "_id": "60a1e2c3d4e5f6g7h8i9j0k2",
    "openid": "oXYZ123456789",
    "scheduledTime": "2023-05-01T13:25:00.000Z",
    "status": "completed",
    "waterAmount": 250,
    "completedAt": "2023-05-01T13:30:00.000Z",
    "createdAt": "2023-05-01T06:55:00.000Z"
  }
}
```

错误响应（任务不存在）：
```json
{
  "success": false,
  "error": "任务不存在"
}
```

错误响应（任务已完成或过期）：
```json
{
  "success": false,
  "error": "任务已完成，无法再次完成"
}
```

错误响应（没有待完成任务）：
```json
{
  "success": false,
  "error": "没有找到待完成的任务"
}
```

### 获取任务列表

#### GET /api/water-task/list/:openid

获取用户的喝水任务列表。

**参数说明：**

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| openid | String | 是 | 用户的微信openid（路径参数） |
| date | String | 否 | 查询特定日期的任务（查询参数，格式：YYYY-MM-DD） |

**测试用例1（获取所有任务）：**

```bash
curl -X GET https://ewjkubagteyd.sealoshzh.site/api/water-task/list/oXYZ123456789
```

预期响应：
```json
{
  "success": true,
  "count": 2,
  "tasks": [
    {
      "_id": "60a1e2c3d4e5f6g7h8i9j0k1",
      "openid": "oXYZ123456789",
      "scheduledTime": "2023-05-01T09:25:00.000Z",
      "status": "completed",
      "waterAmount": 250,
      "completedAt": "2023-05-01T09:30:00.000Z",
      "createdAt": "2023-05-01T06:55:00.000Z"
    },
    {
      "_id": "60a1e2c3d4e5f6g7h8i9j0k2",
      "openid": "oXYZ123456789",
      "scheduledTime": "2023-05-01T13:25:00.000Z",
      "status": "completed",
      "waterAmount": 250,
      "completedAt": "2023-05-01T13:30:00.000Z",
      "createdAt": "2023-05-01T06:55:00.000Z"
    }
  ]
}
```

**测试用例2（获取特定日期的任务）：**

```bash
curl -X GET "https://ewjkubagteyd.sealoshzh.site/api/water-task/list/oXYZ123456789?date=2023-05-01"
```

预期响应：
```json
{
  "success": true,
  "count": 2,
  "tasks": [
    {
      "_id": "60a1e2c3d4e5f6g7h8i9j0k1",
      "openid": "oXYZ123456789",
      "scheduledTime": "2023-05-01T09:25:00.000Z",
      "status": "completed",
      "waterAmount": 250,
      "completedAt": "2023-05-01T09:30:00.000Z",
      "createdAt": "2023-05-01T06:55:00.000Z"
    },
    {
      "_id": "60a1e2c3d4e5f6g7h8i9j0k2",
      "openid": "oXYZ123456789",
      "scheduledTime": "2023-05-01T13:25:00.000Z",
      "status": "completed",
      "waterAmount": 250,
      "completedAt": "2023-05-01T13:30:00.000Z",
      "createdAt": "2023-05-01T06:55:00.000Z"
    }
  ]
}
```

### 获取今日状态统计

#### GET /api/water-task/today-status/:openid

获取用户今日喝水状态统计。

**参数说明：**

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| openid | String | 是 | 用户的微信openid（路径参数） |

**测试用例：**

```bash
curl -X GET https://ewjkubagteyd.sealoshzh.site/api/water-task/today-status/oXYZ123456789
```

预期响应：
```json
{
  "success": true,
  "todayStats": {
    "totalTasks": 8,
    "completedTasks": 5,
    "missedTasks": 1,
    "pendingTasks": 2,
    "totalWater": 1250,
    "completionRate": 63
  },
  "tasks": [
    {
      "_id": "60a1e2c3d4e5f6g7h8i9j0k1",
      "openid": "oXYZ123456789",
      "scheduledTime": "2023-05-01T06:55:00.000Z",
      "status": "completed",
      "waterAmount": 250,
      "completedAt": "2023-05-01T07:00:00.000Z",
      "createdAt": "2023-05-01T06:55:00.000Z"
    },
    {
      "_id": "60a1e2c3d4e5f6g7h8i9j0k2",
      "openid": "oXYZ123456789",
      "scheduledTime": "2023-05-01T09:25:00.000Z",
      "status": "completed",
      "waterAmount": 250,
      "completedAt": "2023-05-01T09:30:00.000Z",
      "createdAt": "2023-05-01T06:55:00.000Z"
    },
    // 其他任务...
  ]
}
```

## 注意事项

1. 所有接口都需要确保服务器正在运行，可以通过 `npm run dev` 启动开发服务器。
2. 微信相关接口需要配置正确的环境变量（WECHAT_APP_ID, WECHAT_APP_SECRET, WECHAT_TEMPLATE_ID）。
3. 登录接口中的code参数需要从微信小程序获取，测试时需要替换为有效的code。
4. openid参数在实际测试中需要替换为真实的用户openid。