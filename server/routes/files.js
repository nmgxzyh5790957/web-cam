import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import mime from 'mime-types'
import {
  listFiles,
  downloadToCache,
  downloadThumbnail,
  deleteFile,
  deleteDirectory
} from '../services/ftpService.js'
import {
  getMarking,
  getMarkingsBatch,
  setMarking,
  deleteMarking,
  getAllMarkedFiles
} from '../services/markingService.js'
import { authenticate, authenticateFlexible, requirePermission } from '../middleware/auth.js'
import { addLog } from '../services/logService.js'

const router = Router()

// 列出目录文件（带标记信息）
router.get('/list', authenticate, requirePermission('view'), async (req, res) => {
  try {
    const dirPath = req.query.path || '/'
    const files = await listFiles(dirPath)
    
    const filePaths = files.filter(f => !f.isDirectory).map(f => f.path)
    const markings = getMarkingsBatch(filePaths)
    
    const filesWithMarkings = files.map(file => ({
      ...file,
      marking: markings[file.path] || null
    }))
    
    res.json({ files: filesWithMarkings, currentPath: dirPath })
  } catch (error) {
    console.error('列出文件失败:', error)
    res.status(500).json({ message: error.message })
  }
})

// 预览文件（返回缓存URL）
router.get('/preview', authenticate, requirePermission('view'), async (req, res) => {
  try {
    const filePath = req.query.path
    if (!filePath) {
      return res.status(400).json({ message: '缺少文件路径参数' })
    }
    
    const cachePath = await downloadToCache(filePath)
    const cacheName = path.basename(cachePath)
    
    res.json({
      url: `/cache/${cacheName}`,
      filename: path.basename(filePath)
    })
  } catch (error) {
    console.error('预览文件失败:', error)
    res.status(500).json({ message: error.message })
  }
})

// 获取缩略图（用于网格视图快速加载，支持query token认证）
router.get('/thumbnail', authenticateFlexible, requirePermission('view'), async (req, res) => {
  try {
    const filePath = req.query.path
    if (!filePath) {
      return res.status(400).json({ message: '缺少文件路径参数' })
    }

    const thumbPath = await downloadThumbnail(filePath)
    const stat = fs.statSync(thumbPath)

    res.setHeader('Content-Type', 'image/webp')
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Cache-Control', 'public, max-age=86400')

    const stream = fs.createReadStream(thumbPath)
    stream.pipe(res)
  } catch (error) {
    console.error('获取缩略图失败:', error)
    res.status(500).json({ message: error.message })
  }
})

// 直接获取文件内容（用于img/video标签src，支持query token认证）
router.get('/stream', authenticateFlexible, requirePermission('view'), async (req, res) => {
  try {
    const filePath = req.query.path
    if (!filePath) {
      return res.status(400).json({ message: '缺少文件路径参数' })
    }
    
    const cachePath = await downloadToCache(filePath)
    const mimeType = mime.lookup(cachePath) || 'application/octet-stream'
    const stat = fs.statSync(cachePath)
    
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    
    // 支持范围请求（视频播放需要）
    const range = req.headers.range
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
      const chunkSize = end - start + 1
      
      res.status(206)
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
      res.setHeader('Content-Length', chunkSize)
      
      const stream = fs.createReadStream(cachePath, { start, end })
      stream.pipe(res)
    } else {
      const stream = fs.createReadStream(cachePath)
      stream.pipe(res)
    }
  } catch (error) {
    console.error('获取文件流失败:', error)
    res.status(500).json({ message: error.message })
  }
})

// 删除文件
router.delete('/file', authenticate, requirePermission('delete'), async (req, res) => {
  try {
    const filePath = req.query.path
    if (!filePath) {
      return res.status(400).json({ message: '缺少文件路径参数' })
    }
    
    await deleteFile(filePath)
    deleteMarking(filePath)
    
    addLog({
      type: 'file',
      module: '文件操作',
      action: '删除文件',
      target: filePath,
      targetType: '文件',
      details: `路径: ${filePath}`,
      userId: req.user.id,
      username: req.user.nickname || req.user.username
    })
    
    res.json({ message: '文件删除成功' })
  } catch (error) {
    console.error('删除文件失败:', error)
    res.status(500).json({ message: error.message })
  }
})

// 删除目录
router.delete('/directory', authenticate, requirePermission('delete'), async (req, res) => {
  try {
    const dirPath = req.query.path
    if (!dirPath) {
      return res.status(400).json({ message: '缺少目录路径参数' })
    }
    
    await deleteDirectory(dirPath)
    
    addLog({
      type: 'file',
      module: '文件操作',
      action: '删除目录',
      target: dirPath,
      targetType: '目录',
      details: `路径: ${dirPath}`,
      userId: req.user.id,
      username: req.user.nickname || req.user.username
    })
    
    res.json({ message: '目录删除成功' })
  } catch (error) {
    console.error('删除目录失败:', error)
    res.status(500).json({ message: error.message })
  }
})

// 批量删除文件
router.post('/batch-delete', authenticate, requirePermission('delete'), async (req, res) => {
  try {
    const { paths } = req.body
    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ message: '请提供要删除的文件路径数组' })
    }
    
    const results = []
    for (const p of paths) {
      try {
        await deleteFile(p)
        deleteMarking(p)
        results.push({ path: p, success: true })
      } catch (error) {
        results.push({ path: p, success: false, error: error.message })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    addLog({
      type: 'file',
      module: '文件操作',
      action: '批量删除',
      target: `${successCount} 个文件`,
      targetType: '文件',
      details: `批量删除 ${successCount} 个文件: ${results.filter(r => r.success).map(r => r.path).join(', ')}`,
      userId: req.user.id,
      username: req.user.nickname || req.user.username
    })
    
    res.json({ message: '批量删除完成', results })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// === 内容标记相关 ===

// 获取单个文件标记
router.get('/marking', authenticate, requirePermission('view'), (req, res) => {
  const filePath = req.query.path
  if (!filePath) {
    return res.status(400).json({ message: '缺少文件路径参数' })
  }
  
  const marking = getMarking(filePath)
  res.json({ marking })
})

// 获取所有已标记文件
router.get('/markings', authenticate, requirePermission('view'), (req, res) => {
  const markedFiles = getAllMarkedFiles()
  res.json({ markings: markedFiles })
})

// 设置/更新文件标记
router.post('/marking', authenticate, requirePermission('mark'), (req, res) => {
  try {
    const { path: filePath, label, color, note, tags } = req.body
    
    if (!filePath) {
      return res.status(400).json({ message: '缺少文件路径' })
    }
    
    const marking = setMarking(filePath, {
      label, color, note, tags,
      markedBy: req.user.nickname || req.user.username
    })
    
    addLog({
      type: 'marking',
      module: '内容标记',
      action: '保存标记',
      target: filePath,
      targetType: '文件',
      details: `标签: ${label || ''}, 颜色: ${color || ''}`,
      userId: req.user.id,
      username: req.user.nickname || req.user.username
    })
    
    res.json({ message: '标记保存成功', marking })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// 删除文件标记
router.delete('/marking', authenticate, requirePermission('mark'), (req, res) => {
  const filePath = req.query.path
  if (!filePath) {
    return res.status(400).json({ message: '缺少文件路径参数' })
  }
  
  const deleted = deleteMarking(filePath)
  if (deleted) {
    addLog({
      type: 'marking',
      module: '内容标记',
      action: '删除标记',
      target: filePath,
      targetType: '文件',
      details: `移除文件标记`,
      userId: req.user.id,
      username: req.user.nickname || req.user.username
    })
    res.json({ message: '标记删除成功' })
  } else {
    res.status(404).json({ message: '标记不存在' })
  }
})

export default router
