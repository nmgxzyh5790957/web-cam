import { Router } from 'express'
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../services/userService.js'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { addLog } from '../services/logService.js'

const router = Router()

// 获取所有用户列表
router.get('/', authenticate, requirePermission('manage_users'), (req, res) => {
  const users = getAllUsers()
  res.json({ users })
})

// 创建用户
router.post('/', authenticate, requirePermission('manage_users'), (req, res) => {
  try {
    const { username, password, nickname, role, permissions, status } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' })
    }
    
    const user = createUser({
      username,
      password,
      nickname,
      role,
      permissions,
      status
    })
    
    addLog({
      type: 'user',
      module: '用户管理',
      action: '创建用户',
      target: username,
      targetType: '用户',
      details: `创建用户: ${username}, 角色: ${role}`,
      userId: req.user.id,
      username: req.user.nickname || req.user.username
    })
    
    res.status(201).json({ message: '用户创建成功', user })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// 更新用户
router.put('/:id', authenticate, requirePermission('manage_users'), (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const updateData = { ...req.body }
    
    const user = updateUser(id, updateData)
    
    addLog({
      type: 'user',
      module: '用户管理',
      action: '更新用户',
      target: updateData.username || String(id),
      targetType: '用户',
      details: `更新用户ID: ${id}, 角色: ${updateData.role || ''}`,
      userId: req.user.id,
      username: req.user.nickname || req.user.username
    })
    
    res.json({ message: '用户更新成功', user })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// 删除用户
router.delete('/:id', authenticate, requirePermission('manage_users'), (req, res) => {
  try {
    const id = parseInt(req.params.id)
    deleteUser(id)
    
    addLog({
      type: 'user',
      module: '用户管理',
      action: '删除用户',
      target: String(id),
      targetType: '用户',
      details: `删除用户ID: ${id}`,
      userId: req.user.id,
      username: req.user.nickname || req.user.username
    })
    
    res.json({ message: '用户删除成功' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

export default router
