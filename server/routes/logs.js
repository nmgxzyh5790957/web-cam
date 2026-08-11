import express from 'express'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { addLog, getLogs, clearLogs, getLogStats } from '../services/logService.js'

const router = express.Router()

// 查询操作日志
router.get('/', authenticate, (req, res) => {
  try {
    const { page, pageSize, type, module, search, startDate, endDate, username } = req.query
    const result = getLogs({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 50,
      type,
      module,
      search,
      startDate,
      endDate,
      username
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: '查询日志失败: ' + error.message })
  }
})

// 获取日志统计
router.get('/stats', authenticate, (req, res) => {
  try {
    const stats = getLogStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ message: '获取统计失败: ' + error.message })
  }
})

// 记录操作日志（由后端内部调用，也允许前端上报）
router.post('/', authenticate, (req, res) => {
  try {
    const { type, module, action, target, targetType, details } = req.body
    const entry = addLog({
      type: type || 'operation',
      module: module || 'unknown',
      action: action || '未知操作',
      target: target || '',
      targetType: targetType || '',
      details: details || '',
      userId: req.user.id,
      username: req.user.nickname || req.user.username
    })
    res.json({ success: true, data: entry })
  } catch (error) {
    res.status(500).json({ message: '记录日志失败: ' + error.message })
  }
})

// 清空日志（管理员）
router.delete('/', authenticate, requirePermission('manage_config'), (req, res) => {
  try {
    const result = clearLogs()
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: '清空日志失败: ' + error.message })
  }
})

export default router
