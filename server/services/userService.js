import bcrypt from 'bcryptjs'
import { readJSON, writeJSON, USERS_FILE } from './dataService.js'

// 获取所有用户
export function getAllUsers() {
  const users = readJSON(USERS_FILE) || []
  // 不返回密码
  return users.map(({ password, ...user }) => user)
}

// 根据用户名查找用户（含密码）
export function findUserByUsername(username) {
  const users = readJSON(USERS_FILE) || []
  return users.find(u => u.username === username)
}

// 根据ID查找用户
export function findUserById(id) {
  const users = readJSON(USERS_FILE) || []
  return users.find(u => u.id === id)
}

// 验证密码
export function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compareSync(plainPassword, hashedPassword)
}

// 哈希密码
export function hashPassword(password) {
  return bcrypt.hashSync(password, 10)
}

// 创建用户
export function createUser(userData) {
  const users = readJSON(USERS_FILE) || []
  
  // 检查用户名是否已存在
  if (users.find(u => u.username === userData.username)) {
    throw new Error('用户名已存在')
  }
  
  const newUser = {
    id: Date.now(),
    username: userData.username,
    password: hashPassword(userData.password),
    nickname: userData.nickname || userData.username,
    role: userData.role || 'viewer',
    permissions: userData.permissions || getDefaultPermissions(userData.role || 'viewer'),
    status: 'active',
    createdAt: new Date().toISOString()
  }
  
  users.push(newUser)
  writeJSON(USERS_FILE, users)
  
  const { password, ...userWithoutPwd } = newUser
  return userWithoutPwd
}

// 更新用户
export function updateUser(id, updateData) {
  const users = readJSON(USERS_FILE) || []
  const index = users.findIndex(u => u.id === id)
  
  if (index === -1) {
    throw new Error('用户不存在')
  }
  
  // 如果更新用户名，检查是否重复
  if (updateData.username && updateData.username !== users[index].username) {
    if (users.find(u => u.username === updateData.username)) {
      throw new Error('用户名已存在')
    }
  }
  
  const updatedUser = { ...users[index] }
  
  if (updateData.username) updatedUser.username = updateData.username
  if (updateData.nickname) updatedUser.nickname = updateData.nickname
  if (updateData.role) {
    updatedUser.role = updateData.role
    // 如果角色变更，权限也跟着变（除非显式指定权限）
    if (!updateData.permissions) {
      updatedUser.permissions = getDefaultPermissions(updateData.role)
    }
  }
  if (updateData.permissions) updatedUser.permissions = updateData.permissions
  if (updateData.status) updatedUser.status = updateData.status
  if (updateData.password) {
    updatedUser.password = hashPassword(updateData.password)
  }
  
  users[index] = updatedUser
  writeJSON(USERS_FILE, users)
  
  const { password, ...userWithoutPwd } = updatedUser
  return userWithoutPwd
}

// 删除用户
export function deleteUser(id) {
  const users = readJSON(USERS_FILE) || []
  const user = users.find(u => u.id === id)
  
  if (!user) {
    throw new Error('用户不存在')
  }
  
  if (user.username === 'admin') {
    throw new Error('不能删除超级管理员账号')
  }
  
  const filtered = users.filter(u => u.id !== id)
  writeJSON(USERS_FILE, filtered)
  return true
}

// 根据角色获取默认权限
function getDefaultPermissions(role) {
  const permissions = {
    admin: ['view', 'delete', 'mark', 'manage_users', 'manage_config', 'view_logs'],
    editor: ['view', 'delete', 'mark', 'view_logs'],
    viewer: ['view', 'view_logs']
  }
  return permissions[role] || ['view']
}

// 检查用户是否有某权限
export function hasPermission(user, permission) {
  if (!user || !user.permissions) return false
  return user.permissions.includes(permission)
}
