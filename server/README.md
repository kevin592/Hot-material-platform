# 标题库后端服务

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写你的 DeepSeek API Key:

```bash
cp .env.example .env
```

编辑 `.env` 文件:

```env
DEEPSEEK_API_KEY=sk-your-actual-api-key-here
```

**获取 DeepSeek API Key:**
1. 访问 https://platform.deepseek.com/
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新的 API Key
5. 复制 Key 到 .env 文件

### 3. 初始化数据库

```bash
npm run init-db
```

### 4. 启动服务器

```bash
npm start
```

或者使用开发模式(自动重启):

```bash
npm run dev
```

服务器将在 `http://localhost:3001` 启动

## API 接口文档

### 标题库

#### 获取标题列表
```
GET /api/titles?status=all&limit=100&offset=0
```

#### 添加标题并AI分析
```
POST /api/titles/analyze
Content-Type: application/json

{
  "title": "3个方法让你快速涨粉10万",
  "source": "今日头条"
}
```

#### 审核通过标题
```
POST /api/titles/:id/approve
Content-Type: application/json

{
  "psychology": ["心理分析1", "心理分析2"],
  "elements": [{"text": "3个方法", "category": "降低门槛", "explain": "..."}],
  "routine": "数字降门槛 + 速度刺激",
  "scenario": "教程类内容"
}
```

#### 删除标题
```
DELETE /api/titles/:id
```

### 元素库

#### 获取元素列表
```
GET /api/elements?category=all&limit=100
```

#### 添加元素
```
POST /api/elements
Content-Type: application/json

{
  "text": "3个方法",
  "category": "降低门槛",
  "explain": "具体数字降低认知成本"
}
```

### AI生成

#### 生成标题
```
POST /api/generate/titles
Content-Type: application/json

{
  "article": "文章正文内容...",
  "count": 5
}
```

## 数据库结构

### titles 表
- id: 主键
- title: 标题文本
- source: 来源
- status: 状态(pending/approved)
- psychology: 心理分析(JSON)
- elements: 元素列表(JSON)
- routine: 核心套路
- scenario: 适用场景
- created_at: 创建时间
- updated_at: 更新时间

### elements 表
- id: 主键
- text: 元素文本
- category: 分类
- explain: 说明
- examples: 示例(JSON)
- usage: 使用次数
- effectiveness: 有效率
- tags: 标签(JSON)
- created_at: 创建时间
- updated_at: 更新时间

## 成本估算

使用 DeepSeek API:
- 价格: ¥0.001/千tokens
- 分析1个标题: 约500 tokens = ¥0.0005
- 生成5个标题: 约1000 tokens = ¥0.001

每天100次分析 + 50次生成 = 约 ¥0.1/天 = ¥3/月
