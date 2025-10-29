const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { analyzeTitle, generateTitles } = require('./services/ai.cjs');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.db');

// 初始化数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err);
    process.exit(1);
  }
  console.log('✓ 数据库连接成功');
});

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ============ 图片上传相关 ============
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式'));
    }
  }
});

function generateFileName(originalName) {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '没有上传文件' });
    }

    const fileName = generateFileName(req.file.originalname);
    const filePath = path.join(UPLOAD_DIR, fileName);

    await sharp(req.file.buffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(filePath);

    res.json({
      code: 0,
      message: '上传成功',
      data: {
        url: `/uploads/${fileName}`,
        fileName: fileName,
        size: req.file.size,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ code: 500, message: error.message || '上传失败' });
  }
});

app.delete('/api/upload/image/:fileName', (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(UPLOAD_DIR, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ code: 0, message: '删除成功' });
    } else {
      res.status(404).json({ code: 404, message: '文件不存在' });
    }
  } catch (error) {
    console.error('删除失败:', error);
    res.status(500).json({ code: 500, message: '删除失败' });
  }
});

// ============ 标题库API ============

// 获取标题列表
app.get('/api/titles', (req, res) => {
  const { status, limit = 100, offset = 0 } = req.query;

  let sql = 'SELECT * FROM titles';
  let params = [];

  if (status && status !== 'all') {
    sql += ' WHERE status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, message: '查询失败', error: err.message });
    }

    // 统计总数
    let countSql = 'SELECT COUNT(*) as total FROM titles';
    let countParams = [];
    if (status && status !== 'all') {
      countSql += ' WHERE status = ?';
      countParams.push(status);
    }

    db.get(countSql, countParams, (err, countRow) => {
      if (err) {
        return res.status(500).json({ code: 500, message: '统计失败' });
      }

      res.json({
        code: 0,
        message: '成功',
        data: {
          list: rows.map(row => ({
            ...row,
            psychology: row.psychology ? JSON.parse(row.psychology) : [],
            elements: row.elements ? JSON.parse(row.elements) : []
          })),
          total: countRow.total
        }
      });
    });
  });
});

// 添加标题并AI分析
app.post('/api/titles/analyze', async (req, res) => {
  try {
    const { title, source } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ code: 400, message: '标题不能为空' });
    }

    // 调用AI分析
    console.log('开始AI分析标题:', title);
    const analysis = await analyzeTitle(title.trim());
    console.log('AI分析结果:', analysis);

    // 保存到数据库
    db.run(`
      INSERT INTO titles (title, source, status, psychology, elements, routine, scenario)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      source || '',
      'pending',
      JSON.stringify(analysis.psychology || []),
      JSON.stringify(analysis.elements || []),
      analysis.routine || '',
      analysis.scenario || ''
    ], function(err) {
      if (err) {
        console.error('保存标题失败:', err);
        return res.status(500).json({ code: 500, message: '保存失败', error: err.message });
      }

      // 将元素添加到元素库（如果不存在）
      if (analysis.elements && analysis.elements.length > 0) {
        analysis.elements.forEach(element => {
          db.run(`
            INSERT OR IGNORE INTO elements (text, category, explain, usage, effectiveness)
            VALUES (?, ?, ?, 1, 75)
          `, [element.text, element.category, element.explain]);
        });
      }

      res.json({
        code: 0,
        message: '分析成功',
        data: {
          id: this.lastID,
          title: title.trim(),
          source: source || '',
          status: 'pending',
          ...analysis
        }
      });
    });
  } catch (error) {
    console.error('AI分析失败:', error);
    res.status(500).json({
      code: 500,
      message: 'AI分析失败',
      error: error.message
    });
  }
});

// 审核通过标题
app.post('/api/titles/:id/approve', (req, res) => {
  const { id } = req.params;
  const { psychology, elements, routine, scenario } = req.body;

  db.run(`
    UPDATE titles
    SET status = 'approved',
        psychology = ?,
        elements = ?,
        routine = ?,
        scenario = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    JSON.stringify(psychology),
    JSON.stringify(elements),
    routine,
    scenario,
    id
  ], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, message: '审核失败', error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ code: 404, message: '标题不存在' });
    }

    res.json({ code: 0, message: '审核通过' });
  });
});

// 更新标题
app.put('/api/titles/:id', (req, res) => {
  const { id } = req.params;
  const { psychology, elements, routine, scenario } = req.body;

  db.run(`
    UPDATE titles
    SET psychology = ?,
        elements = ?,
        routine = ?,
        scenario = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    JSON.stringify(psychology),
    JSON.stringify(elements),
    routine,
    scenario,
    id
  ], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, message: '更新失败', error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ code: 404, message: '标题不存在' });
    }

    res.json({ code: 0, message: '更新成功' });
  });
});

// 删除标题
app.delete('/api/titles/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM titles WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, message: '删除失败', error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ code: 404, message: '标题不存在' });
    }

    res.json({ code: 0, message: '删除成功' });
  });
});

// ============ 元素库API ============

// 获取元素列表
app.get('/api/elements', (req, res) => {
  const { category, limit = 100, offset = 0 } = req.query;

  let sql = 'SELECT * FROM elements';
  let params = [];

  if (category && category !== 'all') {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  sql += ' ORDER BY usage DESC, effectiveness DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, message: '查询失败', error: err.message });
    }

    res.json({
      code: 0,
      message: '成功',
      data: {
        list: rows.map(row => ({
          ...row,
          examples: row.examples ? JSON.parse(row.examples) : [],
          tags: row.tags ? JSON.parse(row.tags) : []
        }))
      }
    });
  });
});

// 添加元素
app.post('/api/elements', (req, res) => {
  const { text, category, explain, examples, tags } = req.body;

  if (!text || !category) {
    return res.status(400).json({ code: 400, message: '元素文本和分类不能为空' });
  }

  db.run(`
    INSERT INTO elements (text, category, explain, examples, tags, usage, effectiveness)
    VALUES (?, ?, ?, ?, ?, 0, 70)
  `, [
    text,
    category,
    explain || '',
    JSON.stringify(examples || []),
    JSON.stringify(tags || [])
  ], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ code: 400, message: '元素已存在' });
      }
      return res.status(500).json({ code: 500, message: '添加失败', error: err.message });
    }

    res.json({
      code: 0,
      message: '添加成功',
      data: { id: this.lastID }
    });
  });
});

// ============ AI生成标题 ============

app.post('/api/generate/titles', async (req, res) => {
  try {
    const { article, count = 5 } = req.body;

    if (!article || !article.trim()) {
      return res.status(400).json({ code: 400, message: '文章内容不能为空' });
    }

    // 获取所有元素
    db.all('SELECT * FROM elements ORDER BY usage DESC LIMIT 30', async (err, elements) => {
      if (err) {
        return res.status(500).json({ code: 500, message: '查询元素失败' });
      }

      try {
        console.log('开始生成标题, 文章长度:', article.length);
        const titles = await generateTitles(article.trim(), elements, count);
        console.log('生成的标题:', titles);

        res.json({
          code: 0,
          message: '生成成功',
          data: { titles }
        });
      } catch (error) {
        console.error('生成标题失败:', error);
        res.status(500).json({
          code: 500,
          message: 'AI生成失败',
          error: error.message
        });
      }
    });
  } catch (error) {
    console.error('生成标题失败:', error);
    res.status(500).json({ code: 500, message: '生成失败', error: error.message });
  }
});

// ============ 健康检查 ============

app.get('/api/health', (req, res) => {
  res.json({
    code: 0,
    message: 'Server is running',
    timestamp: Date.now(),
    database: DB_PATH
  });
});

// ============ 热点搜索代理 ============
const axios = require('axios');

app.post('/api/hots/search', async (req, res) => {
  try {
    const response = await axios.post(
      'https://www.czgts.cn/muse/content/api/v1/hots/search',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('热点搜索请求失败:', error.message);
    res.status(error.response?.status || 500).json({
      code: error.response?.data?.code || 500,
      message: error.response?.data?.message || '热点搜索失败'
    });
  }
});

// ============ 错误处理 ============

app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: 400, message: '文件大小超过限制(最大10MB)' });
    }
  }

  res.status(500).json({
    code: 500,
    message: err.message || '服务器错误'
  });
});

// ============ 启动服务器 ============

app.listen(PORT, () => {
  console.log(`\n🚀 标题库服务已启动:`);
  console.log(`   地址: http://localhost:${PORT}`);
  console.log(`   数据库: ${DB_PATH}`);
  console.log(`   上传目录: ${UPLOAD_DIR}\n`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  db.close((err) => {
    if (err) {
      console.error('关闭数据库失败:', err);
    } else {
      console.log('数据库已关闭');
    }
    process.exit(0);
  });
});
