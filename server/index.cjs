const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

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
