import { Router } from 'express'
import { findUserByUsername, verifyPassword } from '../services/userService.js'
import { generateToken, authenticate } from '../middleware/auth.js'
import { addLog } from '../services/logService.js'

const router = Router()

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body
  
  if (!username || !password) {
    return res.status(400).json({ message: '请输入用户名和密码' })
  }
  
  const user = findUserByUsername(username)
  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误', code: 'INVALID_CREDENTIALS' })
  }
  
  if (!verifyPassword(password, user.password)) {
    return res.status(401).json({ message: '用户名或密码错误', code: 'INVALID_CREDENTIALS' })
  }
  
  if (user.status !== 'active') {
    return res.status(403).json({ message: '账号已被禁用', code: 'USER_DISABLED' })
  }
  
  const token = generateToken(user)
  
  addLog({
    type: 'system',
    module: '系统登录',
    action: '用户登录',
    target: user.username,
    targetType: '用户',
    details: `用户 ${user.nickname || user.username} 登录系统`,
    userId: user.id,
    username: user.nickname || user.username
  })
  
  const { password: _, ...userWithoutPwd } = user
  
  res.json({
    message: '登录成功',
    token,
    user: userWithoutPwd
  })
})

// 获取当前用户信息
router.get('/me', authenticate, (req, res) => {
  const { password, ...userWithoutPwd } = req.user
  res.json({ user: userWithoutPwd })
})

// 修改自己的密码（后续可扩展）

export default router
