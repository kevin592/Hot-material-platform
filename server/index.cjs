const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// SQLite数据库设置
const sqlite3 = require('sqlite3').verbose();
const DB_PATH = path.join(__dirname, 'style-analysis.db');
const db = new sqlite3.Database(DB_PATH);

const app = express();
const PORT = 3006;

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

// ============ 数据库初始化 ============

// 创建数据库表 - 简化结构
db.serialize(() => {
  // 作者表 - 简化结构
  db.run(`
    CREATE TABLE IF NOT EXISTS authors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bio TEXT,
      article_count INTEGER DEFAULT 0,
      fingerprint_status TEXT DEFAULT 'none',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 文章表
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      analysis_status TEXT DEFAULT 'pending',
      analysis_progress INTEGER DEFAULT 0,
      upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES authors (id)
    )
  `);

  // 7层分析结果表
  db.run(`
    CREATE TABLE IF NOT EXISTS layer_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id TEXT,
      article_id INTEGER,
      layer_name TEXT NOT NULL,
      score REAL DEFAULT 0,
      features TEXT,
      analysis_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES authors (id),
      FOREIGN KEY (article_id) REFERENCES articles (id)
    )
  `);

  console.log('✅ 数据库表初始化完成');
});

// ============ 作者库API ============

// 获取作者列表
app.get('/api/authors', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const status = req.query.status;

    let query = 'SELECT * FROM authors';
    let params = [];

    if (status && status !== 'all') {
      query += ' WHERE fingerprint_status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);

    db.all(query, params, (err, authors) => {
      if (err) {
        console.error('获取作者列表失败:', err);
        return res.status(500).json({ code: 500, message: '获取作者列表失败' });
      }

      // 格式化数据，适配前端期望的字段名
      const formattedAuthors = authors.map(author => ({
        id: author.id,
        name: author.name,
        description: author.bio, // 将bio映射为description
        articleCount: author.article_count || 0,
        totalWords: 0, // 临时值，需要从文章表计算
        avgWordsPerArticle: 0, // 临时值，需要从文章表计算
        analysisStatus: author.fingerprint_status === 'generated' ? 'completed' :
                       author.fingerprint_status === 'none' ? 'pending' : 'analyzing',
        styleScore: 0, // 临时值，需要从分析结果计算
        tags: [], // 临时空数组
        createdAt: author.created_at
      }));

      // 获取总数
      const countQuery = status && status !== 'all'
        ? 'SELECT COUNT(*) as total FROM authors WHERE fingerprint_status = ?'
        : 'SELECT COUNT(*) as total FROM authors';

      db.get(countQuery, status && status !== 'all' ? [status] : [], (err, countResult) => {
        if (err) {
          return res.status(500).json({ code: 500, message: '获取总数失败' });
        }

        res.json({
          code: 0,
          message: '获取成功',
          data: formattedAuthors,
          total: countResult.total,
          page,
          pageSize
        });
      });
    });
  } catch (error) {
    console.error('获取作者列表失败:', error);
    res.status(500).json({ code: 500, message: '获取作者列表失败' });
  }
});

// 创建作者
app.post('/api/authors', (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ code: 400, message: '作者姓名和描述不能为空' });
    }

    // 生成唯一ID
    const authorId = `author_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const sql = `
      INSERT INTO authors (id, name, bio, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;

    db.run(sql, [authorId, name, description], function(err) {
      if (err) {
        console.error('创建作者失败:', err);
        return res.status(500).json({ code: 500, message: '创建作者失败' });
      }

      res.json({
        code: 0,
        message: '创建成功',
        data: {
          id: authorId,
          name,
          description,
          tags: [], // 临时返回空数组
          articleCount: 0,
          analysisStatus: 'pending'
        }
      });
    });
  } catch (error) {
    console.error('创建作者失败:', error);
    res.status(500).json({ code: 500, message: '创建作者失败' });
  }
});

// 删除作者
app.delete('/api/authors/:id', (req, res) => {
  try {
    const authorId = req.params.id;

    // 先删除该作者的所有文章和相关分析数据
    db.serialize(() => {
      // 删除文章分析数据
      db.run('DELETE FROM layer_analysis WHERE article_id IN (SELECT id FROM articles WHERE author_id = ?)', [authorId]);

      // 删除文章
      db.run('DELETE FROM articles WHERE author_id = ?', [authorId]);

      // 删除作者
      db.run('DELETE FROM authors WHERE id = ?', [authorId], function(err) {
        if (err) {
          console.error('删除作者失败:', err);
          return res.status(500).json({ code: 500, message: '删除作者失败' });
        }

        res.json({
          code: 0,
          message: '删除成功'
        });
      });
    });
  } catch (error) {
    console.error('删除作者失败:', error);
    res.status(500).json({ code: 500, message: '删除作者失败' });
  }
});

// 更新作者
app.put('/api/authors/:id', (req, res) => {
  try {
    const authorId = req.params.id;
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ code: 400, message: '作者姓名和描述不能为空' });
    }

    const sql = `
      UPDATE authors
      SET name = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(sql, [name, description, authorId], function(err) {
      if (err) {
        console.error('更新作者失败:', err);
        return res.status(500).json({ code: 500, message: '更新作者失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ code: 404, message: '作者不存在' });
      }

      res.json({
        code: 0,
        message: '更新成功',
        data: {
          id: authorId,
          name,
          description
        }
      });
    });
  } catch (error) {
    console.error('更新作者失败:', error);
    res.status(500).json({ code: 500, message: '更新作者失败' });
  }
});

// 上传文章
app.post('/api/authors/:id/articles', (req, res) => {
  try {
    const authorId = req.params.id;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ code: 400, message: '标题和内容不能为空' });
    }

    const wordCount = content.length;
    const sql = `
      INSERT INTO articles (author_id, title, content, word_count, upload_time)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    db.run(sql, [authorId, title, content, wordCount], function(err) {
      if (err) {
        console.error('上传文章失败:', err);
        return res.status(500).json({ code: 500, message: '上传文章失败' });
      }

      const articleId = this.lastID;

      // 更新作者统计
      const updateStats = `
        UPDATE authors
        SET article_count = article_count + 1,
            total_words = total_words + ?,
            avg_words_per_article = ROUND((total_words + ?) / (article_count + 1), 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(updateStats, [wordCount, wordCount, authorId]);

      // 启动7层分析（这里只是模拟，实际应该调用LLM API）
      startLayerAnalysis(authorId, articleId);

      res.json({
        code: 0,
        message: '上传成功，开始7层分析',
        data: {
          articleId,
          title,
          wordCount,
          analysisStatus: 'analyzing'
        }
      });
    });
  } catch (error) {
    console.error('上传文章失败:', error);
    res.status(500).json({ code: 500, message: '上传文章失败' });
  }
});

// 获取7层分析结果
app.get('/api/authors/:id/analysis', (req, res) => {
  try {
    const authorId = req.params.id;

    // 获取作者基本信息
    db.get('SELECT * FROM authors WHERE id = ?', [authorId], (err, author) => {
      if (err || !author) {
        return res.status(404).json({ code: 404, message: '作者不存在' });
      }

      // 模拟7层分析结果 - 因为layer_analysis表可能不存在数据
      const layerAnalysis = {
        language: {
          score: 8.2,
          status: 'completed',
          features: [{ '口语化程度': 8.2 }, { '词汇丰富度': 7.8 }]
        },
        techniques: {
          score: 7.5,
          status: 'completed',
          features: [{ '讽刺力度': 7.5 }, { '修辞手法': 7.2 }]
        },
        structure: {
          score: 6.8,
          status: 'completed',
          features: [{ '段落逻辑': 6.8 }, { '结构清晰度': 7.0 }]
        },
        viewpoint: {
          score: 8.9,
          status: 'completed',
          features: [{ '观点鲜明度': 8.9 }, { '立场坚定': 8.5 }]
        },
        adaptation: {
          score: 8.7,
          status: 'completed',
          features: [{ '体裁适配': 8.7 }, { '风格多变': 8.3 }]
        },
        interaction: {
          score: 7.2,
          status: 'completed',
          features: [{ '互动性': 7.2 }, { '传播力': 7.0 }]
        },
        fingerprint: {
          score: 9.1,
          status: 'completed',
          features: [{ '独特性': 9.1 }, { '一致性': 8.9 }]
        }
      };

      res.json({
        code: 0,
        message: '获取成功',
        data: {
          author: {
            id: author.id,
            name: author.name,
            description: author.bio,
            articleCount: author.article_count || 0,
            totalWords: 0,
            avgWordsPerArticle: 0,
            analysisStatus: author.fingerprint_status === 'generated' ? 'completed' :
                           author.fingerprint_status === 'none' ? 'pending' : 'analyzing',
            styleScore: 8.5, // 计算平均分
            tags: [],
            createdAt: author.created_at
          },
          layerAnalysis
        }
      });
    });
  } catch (error) {
    console.error('获取分析结果失败:', error);
    res.status(500).json({ code: 500, message: '获取分析结果失败' });
  }
});

// 模拟7层分析函数
function startLayerAnalysis(authorId, articleId) {
  console.log(`🚀 开始为作者 ${authorId} 的文章 ${articleId} 进行7层分析...`);

  // 模拟7层分析
  const layers = [
    { name: 'language', score: 8.2, features: { '口语化程度': 8.2, '词汇丰富度': 7.8 } },
    { name: 'techniques', score: 7.5, features: { '讽刺力度': 7.5, '修辞手法': 7.2 } },
    { name: 'structure', score: 6.8, features: { '段落逻辑': 6.8, '结构清晰度': 7.0 } },
    { name: 'viewpoint', score: 8.9, features: { '观点鲜明度': 8.9, '立场坚定': 8.5 } },
    { name: 'adaptation', score: 8.7, features: { '体裁适配': 8.7, '风格多变' : 8.3 } },
    { name: 'interaction', score: 7.2, features: { '互动性': 7.2, '传播力': 7.0 } },
    { name: 'fingerprint', score: 9.1, features: { '独特性': 9.1, '一致性': 8.9 } }
  ];

  // 模拟每层分析延迟
  layers.forEach((layer, index) => {
    setTimeout(() => {
      const sql = `
        INSERT INTO layer_analysis (author_id, article_id, layer_name, score, features)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.run(sql, [authorId, articleId, layer.name, layer.score, JSON.stringify(layer.features)]);
      console.log(`✅ ${layer.name}层分析完成: ${layer.score}/10`);
    }, (index + 1) * 2000); // 每2秒完成一层
  });

  // 更新文章状态
  setTimeout(() => {
    db.run('UPDATE articles SET analysis_status = ?, analysis_progress = 100 WHERE id = ?', ['completed', articleId]);
    console.log(`✅ 文章 ${articleId} 的7层分析完成`);

    // 更新作者状态和风格分数
    const avgScore = layers.reduce((sum, layer) => sum + layer.score, 0) / layers.length;
    db.run(
      'UPDATE authors SET analysis_status = ?, style_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', avgScore, authorId]
    );

    console.log(`✅ 作者 ${authorId} 的风格分析完成，总评分: ${avgScore.toFixed(1)}/10`);
  }, layers.length * 2000 + 1000);
}

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
  console.log(`\n🚀 后端服务已启动:`);
  console.log(`   地址: http://localhost:${PORT}`);
  console.log(`   上传目录: ${UPLOAD_DIR}\n`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  process.exit(0);
});