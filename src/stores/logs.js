import { defineStore } from 'pinia'
import api from '../api'
import { useAuthStore } from './auth'

export const useLogStore = defineStore('logs', {
  state: () => ({
    logs: [],
    total: 0,
    loading: false,
    stats: null
  }),

  actions: {
    async fetchLogs(params = {}) {
      this.loading = true
      try {
        const res = await api.get('/logs', { params })
        this.logs = res.items
        this.total = res.total
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchStats() {
      try {
        this.stats = await api.get('/logs/stats')
        return this.stats
      } catch (e) {
        console.error('获取日志统计失败:', e)
      }
    },

    async addLog(logData) {
      const authStore = useAuthStore()
      const payload = {
        type: logData.type || 'operation',
        module: logData.module || '未知',
        action: logData.action || '未知操作',
        target: logData.target || '',
        targetType: logData.targetType || '',
        details: logData.details || ''
      }
      try {
        await api.post('/logs', payload)
      } catch (e) {
        console.warn('记录日志失败:', e)
      }
    },

    async clearLogs() {
      await api.delete('/logs')
      this.logs = []
      this.total = 0
    }
  }
})

export function useLogger() {
  const logStore = useLogStore()

  return {
    logFileOperation: (action, file, details = '') => {
      logStore.addLog({
        type: 'file',
        module: '文件操作',
        action,
        target: file?.name || file?.path || '',
        targetType: file?.type === 'video' ? '视频' : file?.isDirectory ? '文件夹' : '图片',
        details: details || `路径: ${file?.path || ''}`
      })
    },

    logUserOperation: (action, user, details = '') => {
      logStore.addLog({
        type: 'user',
        module: '用户管理',
        action,
        target: user?.username || user?.nickname || '',
        targetType: '用户',
        details
      })
    },

    logMarkingOperation: (action, file, details = '') => {
      logStore.addLog({
        type: 'marking',
        module: '内容标记',
        action,
        target: file?.name || '',
        targetType: file?.type === 'video' ? '视频' : '图片',
        details
      })
    },

    logSystemOperation: (action, details = '') => {
      logStore.addLog({
        type: 'system',
        module: '系统设置',
        action,
        target: '',
        targetType: '',
        details
      })
    }
  }
}
