import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import fileRoutes from './routes/files.js'
import configRoutes from './routes/config.js'
import logRoutes from './routes/logs.js'
import statsRoutes from './routes/stats.js'
import { ensureDataDir } from './services/dataService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// 确保数据目录存在
ensureDataDir()

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 静态文件服务（用于缩略图/缓存）
const cacheDir = path.join(__dirname, 'data', 'cache')
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true })
}
app.use('/cache', express.static(cacheDir, { maxAge: '1h' }))

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/config', configRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/stats', statsRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 生产环境：服务前端静态文件
const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '1d' }))
  // SPA 回退：所有非 API/cache 路由返回 index.html
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/cache/')) {
      res.sendFile(path.join(distDir, 'index.html'))
    } else {
      next()
    }
  })
  console.log('生产模式：前端静态文件已启用')
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err)
  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
    code: err.code || 'INTERNAL_ERROR'
  })
})

app.listen(PORT, () => {
  console.log(`兴野智汇远程图像采集管理平台后端服务已启动: http://localhost:${PORT}`)
  console.log(`API 健康检查: http://localhost:${PORT}/api/health`)
})

// 防止未捕获异常导致进程退出
process.on('uncaughtException', (err) => {
  console.error('未捕获异常:', err.message)
})
process.on('unhandledRejection', (err) => {
  console.error('未处理的Promise拒绝:', err)
})

export default app
