import { readJSON, writeJSON, MARKINGS_FILE } from './dataService.js'

// 获取所有标记
export function getAllMarkings() {
  return readJSON(MARKINGS_FILE) || {}
}

// 获取指定文件的标记
export function getMarking(filePath) {
  const markings = readJSON(MARKINGS_FILE) || {}
  return markings[filePath] || null
}

// 批量获取文件标记
export function getMarkingsBatch(filePaths) {
  const markings = readJSON(MARKINGS_FILE) || {}
  const result = {}
  for (const p of filePaths) {
    if (markings[p]) {
      result[p] = markings[p]
    }
  }
  return result
}

// 设置/更新文件标记
export function setMarking(filePath, markingData) {
  const markings = readJSON(MARKINGS_FILE) || {}
  
  markings[filePath] = {
    label: markingData.label || '',
    color: markingData.color || '#409EFF',
    note: markingData.note || '',
    tags: markingData.tags || [],
    markedBy: markingData.markedBy || '',
    updatedAt: new Date().toISOString()
  }
  
  writeJSON(MARKINGS_FILE, markings)
  return markings[filePath]
}

// 删除文件标记
export function deleteMarking(filePath) {
  const markings = readJSON(MARKINGS_FILE) || {}
  if (markings[filePath]) {
    delete markings[filePath]
    writeJSON(MARKINGS_FILE, markings)
    return true
  }
  return false
}

// 获取所有标记了的内容
export function getAllMarkedFiles() {
  const markings = readJSON(MARKINGS_FILE) || {}
  return Object.entries(markings).map(([path, data]) => ({
    path,
    ...data
  }))
}
