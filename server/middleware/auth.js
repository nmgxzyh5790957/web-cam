import jwt from 'jsonwebtoken'
import { findUserById } from '../services/userService.js'

const JWT_SECRET = 'ftp-media-platform-secret-key-2026'
const JWT_EXPIRES_IN = '24h'

// 生成JWT token
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

// 验证token并返回用户（供header和query两种方式使用）
function verifyToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET)
  const user = findUserById(decoded.id)
  
  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }
  
  if (user.status !== 'active') {
    throw new Error('USER_DISABLED')
  }
  
  return user
}

// 验证JWT token中间件（仅支持Header）
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证令牌', code: 'NO_TOKEN' })
  }
  
  const token = authHeader.split(' ')[1]
  
  try {
    req.user = verifyToken(token)
    next()
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(401).json({ message: '用户不存在', code: 'USER_NOT_FOUND' })
    }
    if (error.message === 'USER_DISABLED') {
      return res.status(403).json({ message: '账号已被禁用', code: 'USER_DISABLED' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '令牌已过期，请重新登录', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ message: '无效的认证令牌', code: 'INVALID_TOKEN' })
  }
}

// 支持Header和Query参数两种方式的认证（用于img/video等原生请求）
export function authenticateFlexible(req, res, next) {
  let token = null
  
  // 优先从Header获取
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  }
  
  // 其次从Query参数获取
  if (!token && req.query.token) {
    token = req.query.token
  }
  
  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌', code: 'NO_TOKEN' })
  }
  
  try {
    req.user = verifyToken(token)
    next()
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(401).json({ message: '用户不存在', code: 'USER_NOT_FOUND' })
    }
    if (error.message === 'USER_DISABLED') {
      return res.status(403).json({ message: '账号已被禁用', code: 'USER_DISABLED' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '令牌已过期，请重新登录', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ message: '无效的认证令牌', code: 'INVALID_TOKEN' })
  }
}

// 权限检查中间件
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '未认证', code: 'UNAUTHORIZED' })
    }
    
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        message: `无权限执行此操作，需要权限: ${permission}`, 
        code: 'FORBIDDEN' 
      })
    }
    
    next()
  }
}

// 管理员权限检查
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限', code: 'ADMIN_REQUIRED' })
  }
  next()
}
