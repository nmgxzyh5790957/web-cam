import { Router } from 'express'
import { getFtpConfig, updateFtpConfig, testFtpConnection } from '../services/ftpService.js'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { addLog } from '../services/logService.js'

const router = Router()

// 所有配置路由都需要认证
router.use(authenticate)

// 获取FTP配置（隐藏密码）
router.get('/ftp', requirePermission('view'), (req, res) => {
  const config = getFtpConfig()
  const ftpConfig = { ...config.ftp }
  // 返回时隐藏密码，只返回是否已设置
  const passwordSet = !!ftpConfig.password
  ftpConfig.password = ''
  ftpConfig.passwordSet = passwordSet
  res.json({ config: ftpConfig })
})

// 更新FTP配置
router.put('/ftp', requirePermission('manage_config'), (req, res) => {
  try {
    const { host, port, user, password, secure, rootPath } = req.body
    
    const updateData = { host, port, user, secure, rootPath }
    // 只有当提供了非空密码时才更新密码
    if (password) {
      updateData.password = password
    }
    
    const config = updateFtpConfig(updateData)
    
    addLog({
      type: 'system',
      module: '系统设置',
      action: '保存FTP配置',
      target: `${host}:${port}`,
      targetType: 'FTP配置',
      details: `主机: ${host}:${port}, 用户: ${user}`,
      userId: req.user.id,
      username: req.user.nickname || req.user.username
    })
    
    // 返回时隐藏密码
    const safeConfig = { ...config }
    safeConfig.password = ''
    safeConfig.passwordSet = !!config.password
    
    res.json({ message: 'FTP配置更新成功', config: safeConfig })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// 测试FTP连接
router.post('/ftp/test', requirePermission('manage_config'), async (req, res) => {
  try {
    const { host, port, user, password, secure } = req.body
    
    // 如果没有提供密码，使用已保存的密码
    let testConfig = { host, port: port || 21, user, secure: secure || false }
    if (password) {
      testConfig.password = password
    } else {
      const savedConfig = getFtpConfig()
      testConfig.password = savedConfig.ftp.password || ''
    }
    
    const result = await testFtpConnection(testConfig)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
