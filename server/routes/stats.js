import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getAllMarkings } from '../services/markingService.js'
import { getAllUsers } from '../services/userService.js'
import { listFiles } from '../services/ftpService.js'

const router = Router()

router.get('/overview', authenticate, async (req, res) => {
  try {
    const markings = getAllMarkings()
    const allMarkedFiles = Object.entries(markings)
    
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    
    let todayMarkings = 0
    for (const [, data] of allMarkedFiles) {
      if (data.updatedAt && data.updatedAt.slice(0, 10) === todayStr) {
        todayMarkings++
      }
    }
    
    const users = getAllUsers()
    
    let totalImages = 0
    let totalVideos = 0
    let totalFolders = 0
    
    async function countFilesRecursiveOverview(dirPath) {
      try {
        const files = await listFiles(dirPath)
        for (const f of files) {
          if (f.isDirectory) {
            totalFolders++
            if (dirPath === '/' || dirPath.split('/').length < 3) {
              await countFilesRecursiveOverview(f.path)
            }
          } else if (f.type === 'image') {
            totalImages++
          } else if (f.type === 'video') {
            totalVideos++
          }
        }
      } catch (e) {}
    }
    
    await countFilesRecursiveOverview('/')
    
    res.json({
      totalImages,
      totalVideos,
      totalFolders,
      totalMarkings: allMarkedFiles.length,
      todayMarkings,
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length
    })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    res.status(500).json({ message: error.message })
  }
})

// 图表统计数据
router.get('/charts', authenticate, async (req, res) => {
  try {
    const markings = getAllMarkings()
    const allMarkedFiles = Object.entries(markings)
    
    // 1. 标记标签分布（饼图）
    const labelCount = {}
    for (const [, data] of allMarkedFiles) {
      const label = data.label || '未分类'
      labelCount[label] = (labelCount[label] || 0) + 1
    }
    const labelPie = Object.entries(labelCount).map(([name, value]) => ({ name, value }))
    
    // 2. 近7天标记趋势（折线图）
    const trendData = []
    const trendLabels = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const pad = (n) => String(n).padStart(2, '0')
      trendLabels.push(`${d.getMonth() + 1}/${d.getDate()}`)
      let count = 0
      for (const [, data] of allMarkedFiles) {
        if (data.updatedAt && data.updatedAt.slice(0, 10) === dateStr) {
          count++
        }
      }
      trendData.push(count)
    }
    
    // 3. 文件类型分布（饼图）- 递归统计所有子目录
    let imagesCount = 0
    let videosCount = 0
    let foldersCount = 0
    
    async function countFilesRecursive(dirPath) {
      try {
        const files = await listFiles(dirPath)
        for (const f of files) {
          if (f.isDirectory) {
            foldersCount++
            // 递归统计子文件夹（限制深度避免过深）
            if (dirPath === '/' || dirPath.split('/').length < 3) {
              await countFilesRecursive(f.path)
            }
          } else if (f.type === 'image') {
            imagesCount++
          } else if (f.type === 'video') {
            videosCount++
          }
        }
      } catch (e) {
        // 单个目录失败不影响整体统计
      }
    }
    
    await countFilesRecursive('/')
    
    // 4. 标记用户统计（条形图）
    const userMarkCount = {}
    for (const [, data] of allMarkedFiles) {
      const user = data.markedBy || '未知'
      userMarkCount[user] = (userMarkCount[user] || 0) + 1
    }
    const userBar = Object.entries(userMarkCount).map(([name, count]) => ({ name, count }))
    
    res.json({
      labelPie,
      trendLabels,
      trendData,
      typeDistribution: [
        { name: '图片', value: imagesCount },
        { name: '视频', value: videosCount },
        { name: '文件夹', value: foldersCount }
      ],
      userBar
    })
  } catch (error) {
    console.error('获取图表数据失败:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router
