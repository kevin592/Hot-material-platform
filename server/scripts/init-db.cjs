const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../database.db');

// 删除旧数据库(如果存在)
if (fs.existsSync(DB_PATH)) {
  console.log('删除旧数据库...');
  fs.unlinkSync(DB_PATH);
}

// 创建新数据库
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('创建数据库失败:', err);
    process.exit(1);
  }
  console.log('✓ 数据库创建成功');
});

// 创建表结构
db.serialize(() => {
  // 1. 标题表
  db.run(`
    CREATE TABLE titles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source TEXT,
      status TEXT DEFAULT 'pending',
      psychology TEXT,
      elements TEXT,
      routine TEXT,
      scenario TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建titles表失败:', err);
    } else {
      console.log('✓ titles表创建成功');
    }
  });

  // 2. 元素表
  db.run(`
    CREATE TABLE elements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      explain TEXT,
      examples TEXT,
      usage INTEGER DEFAULT 0,
      effectiveness INTEGER DEFAULT 0,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建elements表失败:', err);
    } else {
      console.log('✓ elements表创建成功');
    }
  });

  // 3. AI配置表
  db.run(`
    CREATE TABLE ai_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      api_key TEXT,
      model TEXT,
      prompt_template TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建ai_config表失败:', err);
    } else {
      console.log('✓ ai_config表创建成功');

      // 插入默认配置
      db.run(`
        INSERT INTO ai_config (provider, model, prompt_template)
        VALUES ('deepseek', 'deepseek-chat', '你是一个爆款标题分析专家')
      `);
    }
  });

  // 插入示例数据
  console.log('\n插入示例数据...');

  // 示例标题
  const sampleTitles = [
    {
      title: '3个方法让你快速涨粉10万',
      source: '今日头条',
      status: 'approved'
    },
    {
      title: '普通人也能做的5个赚钱副业',
      source: '小红书',
      status: 'approved'
    },
    {
      title: '你还在用这种方式带娃？难怪孩子越来越叛逆',
      source: '抖音',
      status: 'pending'
    }
  ];

  sampleTitles.forEach(item => {
    db.run(`
      INSERT INTO titles (title, source, status)
      VALUES (?, ?, ?)
    `, [item.title, item.source, item.status]);
  });

  // 示例元素
  const sampleElements = [
    {
      text: '3个方法',
      category: '降低门槛',
      explain: '具体数字降低认知成本，让人觉得简单可学、不会太难',
      usage: 67,
      effectiveness: 85
    },
    {
      text: '普通人也能',
      category: '降低门槛',
      explain: '扩大受众范围，让更多人觉得"这个我也能做"',
      usage: 35,
      effectiveness: 74
    },
    {
      text: '快速',
      category: '制造紧迫感',
      explain: '强调速度，刺激焦虑和欲望，暗示短时间就能见效',
      usage: 46,
      effectiveness: 80
    }
  ];

  sampleElements.forEach(item => {
    db.run(`
      INSERT INTO elements (text, category, explain, usage, effectiveness)
      VALUES (?, ?, ?, ?, ?)
    `, [item.text, item.category, item.explain, item.usage, item.effectiveness]);
  });

  console.log('✓ 示例数据插入成功\n');
});

// 关闭数据库
db.close((err) => {
  if (err) {
    console.error('关闭数据库失败:', err);
  } else {
    console.log('✓ 数据库初始化完成!');
    console.log(`  数据库位置: ${DB_PATH}\n`);
  }
});
