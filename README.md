# 喝水提醒后端服务

一个基于Node.js和Express的后端服务，通过微信订阅消息向用户发送喝水提醒。
前端代码在[这里](https://github.com/cyan0714/wx-mp-drink-water)

## 项目简介

本项目是一个简单而实用的喝水提醒服务，通过微信小程序向用户定时发送喝水提醒，帮助用户养成良好的饮水习惯，保持健康的生活方式。

### 项目结构

```
├── app.js              # 应用入口文件
├── config/             # 配置文件目录
│   └── db.js           # 数据库连接配置
├── models/             # 数据模型目录
│   └── User.js         # 用户模型
├── routes/             # 路由目录
│   └── wechatRoutes.js # 微信相关路由
├── services/           # 服务目录
│   └── wechatService.js # 微信服务
├── .env.example        # 环境变量示例
├── package.json        # 项目依赖
└── README.md           # 项目说明文档
```

## 功能特点

- 微信小程序登录集成
- 微信订阅消息推送
- 定时喝水提醒（每分钟检查一次）
- 用户订阅管理
- MongoDB数据库存储用户信息
- RESTful API接口

## 技术栈

- **后端框架**：Node.js + Express
- **数据库**：MongoDB
- **定时任务**：node-schedule
- **HTTP客户端**：axios
- **环境变量**：dotenv
- **跨域支持**：cors

## 安装与配置

### 前提条件

- Node.js (v12+)
- MongoDB数据库
- 微信小程序开发者账号

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/cyan0714/wx-mp-drink-water-api
   cd wx-mp-drink-water-api
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 配置环境变量
   - 复制`.env.example`文件并重命名为`.env`
   - 填写微信小程序的配置信息和MongoDB连接信息
   ```
   # WeChat Configuration
   WECHAT_APP_ID=your_wechat_app_id
   WECHAT_APP_SECRET=your_wechat_app_secret
   WECHAT_TEMPLATE_ID=your_wechat_template_id

   # Server Configuration
   PORT=3000

   # Database Configuration
   MONGODB_URI=mongodb://username:password@hostname:port/database_name
   ```

4. 启动服务
   ```bash
   npm start
   ```

## API接口文档

### 首页接口

#### GET /
- **描述**：检查服务器是否正常运行
- **响应**：文本消息确认服务器运行状态

### 登录接口

#### POST /api/login
- **描述**：通过微信小程序的code获取用户的openid并创建或更新用户信息
- **请求参数**：
  ```json
  {
    "code": "微信小程序登录时获取的code",
    "nickname": "用户昵称（可选）"
  }
  ```
- **响应**：
  ```json
  {
    "openid": "用户的微信openid",
    "subscribed": true/false,
    "nickname": "用户昵称"
  }
  ```

### 微信相关接口

#### GET /api/wechat/token
- **描述**：获取当前微信访问令牌（仅用于测试目的）
- **响应**：
  ```json
  {
    "success": true,
    "token": "ACCESS_TOKEN_VALUE"
  }
  ```

#### GET /api/wechat/users
- **描述**：获取所有用户信息（获取所有已订阅的用户）
- **响应**：
  ```json
  {
    "success": true,
    "count": 2,
    "users": [
      {
        "openid": "oXYZ123456789",
        "nickname": "测试用户1",
        "lastReminded": "上次提醒时间"
      }
  }

#### GET /api/wechat/allusers
- **描述**：获取所有用户信息（包括已订阅和未订阅的用户）
- **响应**：
  ```json
  {
    "success": true,
    "count": 2,
    "users": [
      {
        "openid": "oXYZ123456789",
        "nickname": "测试用户1",
        "lastReminded": "上次提醒时间",
        "subscribed": true/false
      }
  }

#### GET /api/wechat/user/:openid
- **描述**：获取指定用户的信息
- **请求参数**：
  ```json
  {
    "openid": "用户的微信openid"
  }
  ```
- **响应**：
  ```json
  {
    "success": true,
    "user": {
      "openid": "用户的微信openid",
      "nickname": "用户昵称",
      "lastReminded": "上次提醒时间",
      "subscribed": true/false
    }
  }
#### POST /api/wechat/subscribe
- **描述**：订阅喝水提醒服务
- **请求参数**：
  ```json
  {
    "openid": "用户的微信openid",
    "nickname": "用户昵称（可选）"
  }
  ```
- **响应**：
  ```json
  {
    "success": true,
    "message": "User xxx with OpenID xxx subscribed successfully"
  }
  ```

#### POST /api/wechat/unsubscribe
- **描述**：取消订阅喝水提醒服务
- **请求参数**：
  ```json
  {
    "openid": "用户的微信openid"
  }
  ```
- **响应**：
  ```json
  {
    "success": true,
    "message": "User with OpenID xxx unsubscribed successfully"
  }
  ```

## 微信订阅消息格式

订阅消息包含以下字段：
- `time2`：发送提醒的当前时间
- `thing3`：提醒消息内容，包含用户昵称

## 开发指南

### 开发模式

使用nodemon实现文件变更自动重启：
```bash
 npm run dev
```

## 部署说明

1. 确保服务器已安装Node.js和MongoDB
2. 配置正确的环境变量
3. 使用PM2或其他进程管理工具启动应用
   ```bash
   npm install -g pm2
   pm2 start app.js --name "water-reminder"
   ```

## 注意事项

- 请确保微信小程序已正确配置订阅消息模板
- 用户需要授权订阅消息才能接收提醒
- 默认提醒频率为每分钟一次，可根据需要在app.js中修改定时任务配置

## 许可证

[MIT](LICENSE)
