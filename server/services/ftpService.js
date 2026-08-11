import * as ftp from 'basic-ftp'
import path from 'path'
import os from 'os'
import { readJSON, writeJSON, CONFIG_FILE, CACHE_DIR } from './dataService.js'
import fs from 'fs'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'

// 设置ffmpeg路径（Windows环境）
ffmpeg.setFfmpegPath('c:/Users/Administrator/AppData/Local/Programs/Trae CN/resources/app/bin/ffmpeg.exe')

// ========== FTP 连接池 ==========
const POOL_SIZE = 5
const pool = []
const waitQueue = []

// ========== 缩略图下载队列（限制并发） ==========
const MAX_CONCURRENT_THUMBS = 2
let activeThumbs = 0
const thumbQueue = []

function processThumbQueue() {
  while (activeThumbs < MAX_CONCURRENT_THUMBS && thumbQueue.length > 0) {
    const task = thumbQueue.shift()
    activeThumbs++
    task.fn()
      .then(result => task.resolve(result))
      .catch(err => task.reject(err))
      .finally(() => {
        activeThumbs--
        processThumbQueue()
      })
  }
}

function queueThumbnail(fn) {
  return new Promise((resolve, reject) => {
    thumbQueue.push({ fn, resolve, reject })
    processThumbQueue()
  })
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 获取FTP配置
export function getFtpConfig() {
  return readJSON(CONFIG_FILE) || { ftp: {} }
}

// 更新FTP配置
export function updateFtpConfig(config) {
  const current = readJSON(CONFIG_FILE) || { ftp: {} }
  current.ftp = { ...current.ftp, ...config }
  writeJSON(CONFIG_FILE, current)
  // 配置变更后重置连接池
  resetPool()
  return current.ftp
}

// 创建单个FTP连接
async function createConnection() {
  const config = getFtpConfig()
  if (!config.ftp.host) {
    throw new Error('FTP服务器未配置，请先在系统设置中配置FTP连接信息')
  }

  const client = new ftp.Client()
  client.ftp.verbose = false
  client.ftp.timeout = 10000

  await client.access({
    host: config.ftp.host,
    port: config.ftp.port || 21,
    user: config.ftp.user || 'anonymous',
    password: config.ftp.password || '',
    secure: config.ftp.secure || false
  })

  return client
}

// 从连接池获取连接
async function acquire() {
  // 查找空闲连接
  for (const conn of pool) {
    if (!conn.busy) {
      conn.busy = true
      return conn
    }
  }

  // 池未满，创建新连接
  if (pool.length < POOL_SIZE) {
    const client = await createConnection()
    const conn = { client, busy: true }
    pool.push(conn)
    return conn
  }

  // 池已满，等待空闲连接
  return new Promise((resolve, reject) => {
    waitQueue.push({ resolve, reject })
    // 超时处理
    setTimeout(() => {
      const idx = waitQueue.findIndex(w => w.resolve === resolve)
      if (idx >= 0) {
        waitQueue.splice(idx, 1)
        reject(new Error('获取FTP连接超时'))
      }
    }, 15000)
  })
}

// 销毁失效连接并创建新连接
async function recreateConnection(conn) {
  try { conn.client.close() } catch {}
  const idx = pool.indexOf(conn)
  if (idx >= 0) pool.splice(idx, 1)
  const client = await createConnection()
  const newConn = { client, busy: true }
  pool.push(newConn)
  return newConn
}

// 释放连接回池
function release(conn) {
  conn.busy = false
  // 检查等待队列
  if (waitQueue.length > 0) {
    const waiter = waitQueue.shift()
    conn.busy = true
    waiter.resolve(conn)
  }
}

// 重置连接池（配置变更时调用）
function resetPool() {
  for (const conn of pool) {
    try { conn.client.close() } catch {}
  }
  pool.length = 0
  // 清空目录缓存
  dirCache.clear()
}

// ========== 目录列表缓存 ==========
const dirCache = new Map()
const DIR_CACHE_TTL = 30000 // 30秒缓存

// 测试FTP连接
export async function testFtpConnection(config) {
  const client = new ftp.Client()
  client.ftp.verbose = false
  client.ftp.timeout = 10000
  try {
    await client.access({
      host: config.host,
      port: config.port || 21,
      user: config.user || 'anonymous',
      password: config.password || '',
      secure: config.secure || false
    })
    return { success: true, message: 'FTP连接成功' }
  } catch (error) {
    return { success: false, message: `连接失败: ${error.message}` }
  } finally {
    client.close()
  }
}

// 列出目录文件（带缓存，带重试）
export async function listFiles(remotePath = '/') {
  // 检查缓存
  const cacheKey = remotePath
  const cached = dirCache.get(cacheKey)
  if (cached && Date.now() - cached.time < DIR_CACHE_TTL) {
    return cached.data
  }

  let conn = await acquire()
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const config = getFtpConfig()
      const basePath = config.ftp.rootPath || '/'
      const targetPath = path.posix.join(basePath, remotePath).replace(/\\/g, '/')

      const list = await conn.client.list(targetPath)

      const directories = []
      const files = []

      for (const item of list) {
        const fileInfo = {
          name: item.name,
          path: path.posix.join(remotePath, item.name).replace(/\\/g, '/'),
          size: item.size,
          modifiedDate: item.modifiedTime,
          isDirectory: item.isDirectory,
          type: item.isFile ? getFileType(item.name) : 'directory',
          rawType: item.rawModifiedTime
        }

        if (item.isDirectory) {
          directories.push(fileInfo)
        } else if (item.isFile) {
          if (fileInfo.type === 'image' || fileInfo.type === 'video') {
            files.push(fileInfo)
          }
        }
      }

      const result = [...directories, ...files]
      // 写入缓存
      dirCache.set(cacheKey, { data: result, time: Date.now() })
      release(conn)
      return result
    } catch (error) {
      if (attempt < 2 && (error.message.includes('ECONNRESET') || error.message.includes('closed') || error.message.includes('timeout'))) {
        // 连接失效，等待后重试
        await delay(1000 * (attempt + 1))
        conn = await recreateConnection(conn)
        continue
      }
      release(conn)
      throw error
    }
  }
}

// 判断文件类型
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase()
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico']
  const videoExts = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v']

  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  return 'other'
}

// 生成缓存文件名
function getCacheName(remotePath) {
  return Buffer.from(remotePath).toString('base64').replace(/[/+=]/g, '_') + path.extname(remotePath)
}

// 生成缩略图缓存文件名
function getThumbCacheName(remotePath) {
  return Buffer.from(remotePath).toString('base64').replace(/[/+=]/g, '_') + '_thumb.webp'
}

// 下载文件到缓存（带重试）
export async function downloadToCache(remotePath) {
  const cacheName = getCacheName(remotePath)
  const cachePath = path.join(CACHE_DIR, cacheName)

  // 缓存有效期1小时
  if (fs.existsSync(cachePath)) {
    const stat = fs.statSync(cachePath)
    const age = Date.now() - stat.mtimeMs
    if (age < 3600000) {
      return cachePath
    }
  }

  let conn = await acquire()
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const config = getFtpConfig()
      const basePath = config.ftp.rootPath || '/'
      const fullPath = path.posix.join(basePath, remotePath).replace(/\\/g, '/')

      await conn.client.downloadTo(cachePath, fullPath)
      release(conn)
      return cachePath
    } catch (error) {
      if (attempt < 2 && (error.message.includes('ECONNRESET') || error.message.includes('closed') || error.message.includes('timeout'))) {
        await delay(1000 * (attempt + 1))
        conn = await recreateConnection(conn)
        continue
      }
      release(conn)
      throw error
    }
  }
}

// 下载并生成缩略图（用于网格视图快速加载，带并发控制）
export async function downloadThumbnail(remotePath) {
  const thumbCacheName = getThumbCacheName(remotePath)
  const thumbCachePath = path.join(CACHE_DIR, thumbCacheName)

  // 缩略图缓存有效期24小时，命中缓存直接返回
  if (fs.existsSync(thumbCachePath)) {
    const stat = fs.statSync(thumbCachePath)
    const age = Date.now() - stat.mtimeMs
    if (age < 86400000) {
      return thumbCachePath
    }
  }

  // 通过队列限制并发
  return queueThumbnail(async () => {
    // 再次检查缓存（可能在排队期间已被其他请求生成）
    if (fs.existsSync(thumbCachePath)) {
      return thumbCachePath
    }

    // 先获取原文件缓存
    const fullCachePath = await downloadToCache(remotePath)
    const fileType = getFileType(remotePath)

    if (fileType === 'video') {
      // 视频文件：使用ffmpeg提取首帧
      await generateVideoThumbnail(fullCachePath, thumbCachePath)
    } else {
      // 图片文件：使用sharp生成缩略图
      await sharp(fullCachePath)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(thumbCachePath)
    }

    return thumbCachePath
  })
}

// 使用ffmpeg生成视频缩略图
function generateVideoThumbnail(videoPath, outputPath) {
  const tempDir = os.tmpdir()
  const tempJpgPath = path.join(tempDir, `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`)

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seek(0)
      .frames(1)
      .videoFilter('scale=300:300')
      .format('image2')
      .outputOptions('-vframes', '1')
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine)
      })
      .on('end', () => {
        if (fs.existsSync(tempJpgPath)) {
          sharp(tempJpgPath)
            .webp({ quality: 80 })
            .toFile(outputPath)
            .then(() => {
              try { fs.unlinkSync(tempJpgPath) } catch {}
              resolve(outputPath)
            })
            .catch(err => {
              try { fs.unlinkSync(tempJpgPath) } catch {}
              reject(err)
            })
        } else {
          reject(new Error('FFmpeg截图未生成JPG文件'))
        }
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message)
        if (fs.existsSync(tempJpgPath)) {
          try { fs.unlinkSync(tempJpgPath) } catch {}
        }
        reject(err)
      })
      .save(tempJpgPath)
  })
}

// 删除FTP文件（带重试）
export async function deleteFile(remotePath) {
  let conn = await acquire()
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const config = getFtpConfig()
      const basePath = config.ftp.rootPath || '/'
      const fullPath = path.posix.join(basePath, remotePath).replace(/\\/g, '/')

      await conn.client.remove(fullPath)
      release(conn)

      // 删除缓存文件
      const cacheName = getCacheName(remotePath)
      const cachePath = path.join(CACHE_DIR, cacheName)
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath)
      }
      const thumbCacheName = getThumbCacheName(remotePath)
      const thumbCachePath = path.join(CACHE_DIR, thumbCacheName)
      if (fs.existsSync(thumbCachePath)) {
        fs.unlinkSync(thumbCachePath)
      }

      // 清除目录缓存
      const parentDir = path.posix.dirname(remotePath)
      dirCache.delete(parentDir)

      return true
    } catch (error) {
      if (attempt < 2 && (error.message.includes('ECONNRESET') || error.message.includes('closed') || error.message.includes('timeout'))) {
        await delay(1000 * (attempt + 1))
        conn = await recreateConnection(conn)
        continue
      }
      release(conn)
      throw error
    }
  }
}

// 删除FTP目录（递归，带重试）
export async function deleteDirectory(remotePath) {
  let conn = await acquire()
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const config = getFtpConfig()
      const basePath = config.ftp.rootPath || '/'
      const fullPath = path.posix.join(basePath, remotePath).replace(/\\/g, '/')

      await conn.client.removeDir(fullPath)
      release(conn)

      // 清除目录缓存
      dirCache.delete(remotePath)
      const parentDir = path.posix.dirname(remotePath)
      dirCache.delete(parentDir)

      return true
    } catch (error) {
      if (attempt < 2 && (error.message.includes('ECONNRESET') || error.message.includes('closed') || error.message.includes('timeout'))) {
        await delay(1000 * (attempt + 1))
        conn = await recreateConnection(conn)
        continue
      }
      release(conn)
      throw error
    }
  }
}
