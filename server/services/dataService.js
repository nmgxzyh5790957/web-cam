import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据存储目录
const DATA_DIR = path.join(__dirname, '..', 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const MARKINGS_FILE = path.join(DATA_DIR, 'markings.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const CACHE_DIR = path.join(DATA_DIR, 'cache')

// 确保数据目录存在
export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
  
  // 初始化配置文件
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig = {
      ftp: {
        host: '',
        port: 21,
        user: '',
        password: '',
        secure: false,
        rootPath: '/'
      }
    }
    writeJSON(CONFIG_FILE, defaultConfig)
  }
  
  // 初始化用户文件（默认管理员账号）
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = [
      {
        id: 1,
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),
        nickname: '系统管理员',
        role: 'admin',
        permissions: ['view', 'delete', 'mark', 'view_logs', 'manage_users', 'manage_config'],
        createdAt: new Date().toISOString(),
        status: 'active'
      }
    ]
    writeJSON(USERS_FILE, defaultUsers)
  }
  
  // 初始化标记文件
  if (!fs.existsSync(MARKINGS_FILE)) {
    writeJSON(MARKINGS_FILE, {})
  }
}

// 读取 JSON 文件
export function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`读取文件失败 ${filePath}:`, error)
    return null
  }
}

// 写入 JSON 文件
export function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error(`写入文件失败 ${filePath}:`, error)
    return false
  }
}

export {
  DATA_DIR,
  USERS_FILE,
  MARKINGS_FILE,
  CONFIG_FILE,
  CACHE_DIR
}
