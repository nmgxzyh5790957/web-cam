import { defineStore } from 'pinia'
import api from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    username: (state) => state.user?.nickname || state.user?.username || ''
  },
  
  actions: {
    // 从本地存储初始化
    initFromStorage() {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          this.user = JSON.parse(userStr)
        } catch (e) {
          localStorage.removeItem('user')
        }
      }
    },
    
    // 登录
    async login(username, password) {
      const res = await api.post('/auth/login', { username, password })
      this.token = res.token
      this.user = res.user
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      return res
    },
    
    // 登出
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    
    // 检查权限
    hasPermission(permission) {
      if (!this.user || !this.user.permissions) return false
      return this.user.permissions.includes(permission)
    },
    
    // 获取当前用户信息
    async fetchMe() {
      try {
        const res = await api.get('/auth/me')
        this.user = res.user
        localStorage.setItem('user', JSON.stringify(res.user))
      } catch (error) {
        this.logout()
      }
    }
  }
})
