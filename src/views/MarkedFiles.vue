<template>
  <div class="marked-files-page">
    <div class="page-header">
      <h2 class="page-title">标记内容</h2>
      <el-button @click="loadMarkings" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>
    
    <el-card shadow="never">
      <div v-loading="loading">
        <el-empty v-if="!loading && markings.length === 0" description="暂无标记内容" />
        
        <div v-else class="marking-list">
          <div
            v-for="item in markings"
            :key="item.path"
            class="marking-item"
          >
            <div class="marking-preview">
              <img
                v-if="getType(item.path) === 'image' || getType(item.path) === 'video'"
                :src="getThumbnailUrl(item.path)"
                :alt="getFileName(item.path)"
                loading="lazy"
                @error="handleImageError"
              />
              <div v-else class="video-placeholder">
                <el-icon><VideoPlay /></el-icon>
              </div>
              <div v-if="getType(item.path) === 'video'" class="video-overlay-small">
                <el-icon><VideoPlay /></el-icon>
              </div>
            </div>
            
            <div class="marking-detail">
              <div class="marking-header">
                <span class="marking-name">{{ getFileName(item.path) }}</span>
                <el-tag
                  v-if="item.label"
                  :color="item.color"
                  effect="dark"
                  size="small"
                >
                  {{ item.label }}
                </el-tag>
              </div>
              
              <div class="marking-path">{{ item.path }}</div>
              
              <div v-if="item.tags && item.tags.length > 0" class="marking-tags">
                <el-tag
                  v-for="tag in item.tags"
                  :key="tag"
                  size="small"
                  type="info"
                >
                  {{ tag }}
                </el-tag>
              </div>
              
              <div v-if="item.note" class="marking-note">
                <el-icon><Document /></el-icon>
                {{ item.note }}
              </div>
              
              <div class="marking-time">
                <span v-if="item.markedBy" class="marking-user">
                  <el-icon><User /></el-icon>
                  {{ item.markedBy }}
                </span>
                <span class="marking-date">更新时间：{{ formatDate(item.updatedAt) }}</span>
              </div>
            </div>
            
            <div class="marking-actions">
              <el-button size="small" @click="previewFile(item)">
                <el-icon><View /></el-icon>
                预览
              </el-button>
              <el-button v-if="canMark" size="small" @click="editMarking(item)">
                <el-icon><Edit /></el-icon>
                编辑标记
              </el-button>
              <el-button v-if="canMark" size="small" type="danger" @click="removeMarking(item)">
                <el-icon><Delete /></el-icon>
                移除标记
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
    
    <MarkingDialog
      v-model="markingVisible"
      :file-path="markingFilePath"
      :file-name="markingFileName"
      @saved="onMarkingSaved"
      @deleted="onMarkingDeleted"
    />
    
    <!-- 预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewFileName"
      width="80%"
      top="5vh"
      destroy-on-close
    >
      <div v-if="previewItem" class="preview-wrapper">
        <div v-loading="previewLoading" element-loading-text="加载中..." class="preview-main">
          <img
            v-if="getType(previewItem.path) === 'image'"
            :src="getStreamUrl(previewItem.path)"
            :alt="previewFileName"
            class="preview-image"
            @load="previewLoading = false"
            @error="previewLoading = false"
          />
          <video
            v-else
            :src="getStreamUrl(previewItem.path)"
            controls
            autoplay
            class="preview-video"
            @loadeddata="previewLoading = false"
            @error="previewLoading = false"
          />
        </div>
        <div class="preview-info">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="文件名">{{ previewFileName }}</el-descriptions-item>
            <el-descriptions-item label="路径">{{ previewItem.path }}</el-descriptions-item>
            <el-descriptions-item v-if="previewItem.label" label="标记标签">
              <el-tag :color="previewItem.color" effect="dark">{{ previewItem.label }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="previewItem.markedBy" label="标记用户">
              {{ previewItem.markedBy }}
            </el-descriptions-item>
            <el-descriptions-item v-if="previewItem.updatedAt" label="更新时间">
              {{ formatDate(previewItem.updatedAt) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="previewItem.note" label="备注" :span="2">
              {{ previewItem.note }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh, View, Edit, Delete, Document, VideoPlay, User
} from '@element-plus/icons-vue'
import api from '../api'
import { useAuthStore } from '../stores/auth'
import MarkingDialog from '../components/MarkingDialog.vue'

const authStore = useAuthStore()

const loading = ref(false)
const markings = ref([])
const markingVisible = ref(false)
const markingFilePath = ref('')
const markingFileName = ref('')

const canMark = authStore.hasPermission('mark')

// 预览相关
const previewVisible = ref(false)
const previewItem = ref(null)
const previewFileName = ref('')
const previewLoading = ref(false)

const previewFile = (item) => {
  previewItem.value = item
  previewFileName.value = getFileName(item.path)
  previewLoading.value = true
  previewVisible.value = true
}

const loadMarkings = async () => {
  loading.value = true
  try {
    const res = await api.get('/files/markings')
    markings.value = res.markings || []
  } catch (error) {
    markings.value = []
  } finally {
    loading.value = false
  }
}

const getType = (filePath) => {
  const ext = filePath.split('.').pop().toLowerCase()
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico']
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v']
  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  return 'other'
}

const getFileName = (filePath) => {
  return filePath.split('/').pop()
}

const getStreamUrl = (filePath) => {
  const token = localStorage.getItem('token') || ''
  return `/api/files/stream?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`
}

const getThumbnailUrl = (filePath) => {
  const token = localStorage.getItem('token') || ''
  return `/api/files/thumbnail?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`
}

const handleImageError = (e) => {
  const img = e.target
  if (!img) return
  // 从img的src中提取path参数
  if (img.dataset.fallback === 'true') {
    img.style.display = 'none'
    const parent = img.parentElement
    if (parent) {
      const placeholder = document.createElement('div')
      placeholder.className = 'image-error-placeholder'
      placeholder.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;color:#909399;font-size:12px;'
      placeholder.innerHTML = '<span style="font-size:28px">🖼️</span><span>加载失败</span>'
      parent.appendChild(placeholder)
    }
    return
  }
  // 从缩略图URL中提取path参数，构造原图URL
  try {
    const url = new URL(img.src, window.location.origin)
    const filePath = url.searchParams.get('path') || ''
    const token = localStorage.getItem('token') || ''
    img.dataset.fallback = 'true'
    img.src = `/api/files/stream?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`
  } catch {
    img.style.display = 'none'
  }
}

const editMarking = (item) => {
  markingFilePath.value = item.path
  markingFileName.value = getFileName(item.path)
  markingVisible.value = true
}

const removeMarking = async (item) => {
  try {
    await ElMessageBox.confirm(
      `确定要移除 "${getFileName(item.path)}" 的标记吗？`,
      '移除标记',
      { type: 'warning' }
    )
    await api.delete('/files/marking', { params: { path: item.path } })
    ElMessage.success('标记已移除')
    loadMarkings()
  } catch (error) {
    if (error !== 'cancel') {
      // 错误已处理
    }
  }
}

const onMarkingSaved = () => {
  loadMarkings()
}

const onMarkingDeleted = () => {
  loadMarkings()
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadMarkings()
})
</script>

<style scoped>
.marked-files-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.marking-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.marking-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  transition: box-shadow 0.2s;
}

.marking-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.marking-preview {
  width: 120px;
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  background: #f5f7fa;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.marking-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  font-size: 40px;
  color: #909399;
}

.video-overlay-small {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
}

.marking-detail {
  flex: 1;
  min-width: 0;
}

.marking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.marking-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.marking-path {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  word-break: break-all;
}

.marking-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.marking-note {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 13px;
  color: #606266;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.marking-time {
  font-size: 12px;
  color: #c0c4cc;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.marking-user {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #07C160;
  font-weight: 500;
}

.marking-date {
  color: #c0c4cc;
}

.marking-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

/* 预览对话框 */
.preview-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-main {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  max-height: 60vh;
}

.preview-image {
  max-width: 100%;
  max-height: 55vh;
  object-fit: contain;
  border-radius: 4px;
}

.preview-video {
  max-width: 100%;
  max-height: 55vh;
  border-radius: 4px;
}

.preview-info {
  width: 100%;
}
</style>
