<template>
  <div class="gallery-page">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <!-- 返回主目录按钮 -->
        <el-button
          size="small"
          @click="goHome"
          :disabled="currentPath === '/'"
          style="margin-right: 12px"
        >
          <el-icon><HomeFilled /></el-icon>
          返回主目录
        </el-button>
        
        <!-- 面包屑导航 -->
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>
            <el-link @click="navigateTo('/')">根目录</el-link>
          </el-breadcrumb-item>
          <el-breadcrumb-item v-for="(crumb, index) in breadcrumbs" :key="index">
            <el-link @click="navigateTo(crumb.path)">{{ crumb.name }}</el-link>
          </el-breadcrumb-item>
        </el-breadcrumb>

        <!-- 文件统计 -->
        <span v-if="fileStats.total > 0 || fileStats.folders > 0" class="file-stats">
          <el-tag size="small" type="info" effect="plain">文件夹 {{ fileStats.folders }}</el-tag>
          <el-tag v-if="fileStats.images > 0" size="small" type="success" effect="plain">图片 {{ fileStats.images }}</el-tag>
          <el-tag v-if="fileStats.videos > 0" size="small" type="warning" effect="plain">视频 {{ fileStats.videos }}</el-tag>
        </span>
      </div>
      
      <div class="toolbar-right">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="grid">
            <el-icon><Grid /></el-icon>
          </el-radio-button>
          <el-radio-button value="list">
            <el-icon><List /></el-icon>
          </el-radio-button>
        </el-radio-group>
        
        <el-select v-model="filterType" placeholder="筛选类型" size="small" clearable style="width: 120px">
          <el-option label="全部" value="" />
          <el-option label="图片" value="image" />
          <el-option label="视频" value="video" />
        </el-select>
        
        <el-select v-model="sortBy" placeholder="排序方式" size="small" style="width: 130px">
          <el-option label="名称" value="name" />
          <el-option label="修改时间" value="date" />
          <el-option label="大小" value="size" />
        </el-select>
        
        <el-tooltip :content="sortOrder === 'asc' ? '升序（点击切换）' : '降序（点击切换）'" placement="top">
          <el-button
            size="small"
            circle
            @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
          >
            <el-icon :size="16" :style="{ transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }">
              <Sort />
            </el-icon>
          </el-button>
        </el-tooltip>
        
        <el-input
          v-model="searchText"
          placeholder="搜索文件夹"
          size="small"
          clearable
          style="width: 180px"
          :prefix-icon="Search"
        />
        
        <el-button size="small" @click="loadFiles" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        
        <el-button
          v-if="selectedFiles.length > 0 && canDelete"
          type="danger"
          size="small"
          @click="batchDelete"
        >
          <el-icon><Delete /></el-icon>
          批量删除({{ selectedFiles.length }})
        </el-button>
      </div>
    </div>
    
    <!-- 文件列表 -->
    <div v-loading="loading" class="file-container">
      <el-alert v-if="!loading && loadError" :title="loadError" type="error" show-icon :closable="false" style="margin-bottom: 16px;" />
      <el-empty v-else-if="!loading && filteredFiles.length === 0" description="暂无图片或视频文件" />
      
      <!-- 网格视图 -->
      <div v-else-if="!loadError && viewMode === 'grid'" class="file-grid">
        <!-- 文件夹 -->
        <div
          v-for="folder in folders"
          :key="folder.path"
          class="file-card folder-card"
          :class="{ navigating: folderNavigating === folder.path }"
          @click="navigateTo(folder.path)"
        >
          <div class="folder-preview">
            <el-icon v-if="folderNavigating !== folder.path" class="folder-icon-main"><Folder /></el-icon>
            <el-icon v-else class="folder-loading"><Loading /></el-icon>
            <div v-if="folderNavigating === folder.path" class="folder-loading-text">加载中...</div>
          </div>
          <div class="file-info">
            <span class="file-name" :title="folder.name">{{ folder.name }}</span>
            <span v-if="getCreateDate(folder.name) || folder.modifiedDate" class="file-date">{{ getCreateDate(folder.name) || formatDate(folder.modifiedDate) }}</span>
          </div>
        </div>
        
        <!-- 文件 -->
        <div
          v-for="file in fileItems"
          :key="file.path"
          class="file-card"
          :class="{ selected: selectedFiles.includes(file.path) }"
          :data-video="file.type === 'video'"
          :data-path="file.path"
          @click="handleFileClick(file, $event)"
        >
          <div class="file-preview">
            <!-- 图片 -->
            <div v-if="file.type === 'image'" class="image-wrapper">
              <!-- 骨架屏占位 -->
              <div class="skeleton-placeholder" :class="{ hidden: getImageLoadedState(file.path) }">
                <div class="skeleton-content">
                  <el-icon :size="36"><Picture /></el-icon>
                </div>
              </div>
              <img
                :src="getThumbnailUrl(file.path)"
                :alt="file.name"
                loading="lazy"
                :class="{ loaded: getImageLoadedState(file.path) }"
                @load="onImageLoaded(file.path)"
                @error="handleImageError($event, file)"
              />
            </div>
            <!-- 视频 -->
            <div v-else-if="file.type === 'video'" class="image-wrapper">
              <div class="skeleton-placeholder" :class="{ hidden: getImageLoadedState(file.path) }">
                <div class="skeleton-content">
                  <el-icon :size="36"><VideoPlay /></el-icon>
                </div>
              </div>
              <img
                v-if="videoThumbnails.get(file.path)"
                :src="videoThumbnails.get(file.path)"
                :alt="file.name"
                :class="{ loaded: getImageLoadedState(file.path) }"
                @load="onImageLoaded(file.path)"
                @error="onImageLoaded(file.path)"
              />
              <div class="video-overlay">
                <el-icon><VideoPlay /></el-icon>
              </div>
            </div>
            
            <!-- 类型标签（带图标） -->
            <div class="type-badge" :class="file.type">
              <el-icon v-if="file.type === 'image'" :size="14"><Picture /></el-icon>
              <el-icon v-else :size="14"><VideoPlay /></el-icon>
              <span class="type-label">{{ file.type === 'image' ? '图片' : '视频' }}</span>
            </div>
            
            <!-- 内容标记 -->
            <div
              v-if="file.marking && file.marking.label"
              class="marking-badge"
              :style="{ backgroundColor: file.marking.color }"
            >
              {{ file.marking.label }}
            </div>
            
            <!-- 选中标记 -->
            <div v-if="selectedFiles.includes(file.path)" class="select-badge">
              <el-icon><Check /></el-icon>
            </div>
            
            <!-- 日期角标 -->
            <div v-if="getCreateDate(file.name)" class="date-badge">
              {{ getCreateDate(file.name) }}
            </div>
          </div>
          
          <div class="file-info">
            <span class="file-name" :title="file.name">{{ file.name }}</span>
            <span class="file-meta">
              <span class="file-size">{{ formatSize(file.size) }}</span>
            </span>
          </div>
          
          <!-- 操作按钮 -->
          <div class="file-actions" @click.stop>
            <el-tooltip content="查看" placement="top">
              <el-button circle size="small" @click="previewFile(file)">
                <el-icon><View /></el-icon>
              </el-button>
            </el-tooltip>
            
            <el-tooltip v-if="canMark" content="标记" placement="top">
              <el-button circle size="small" @click="markFile(file)">
                <el-icon><CollectionTag /></el-icon>
              </el-button>
            </el-tooltip>
            
            <el-tooltip v-if="canDelete" content="删除" placement="top">
              <el-button circle size="small" type="danger" @click="deleteFile(file)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>
      
      <!-- 列表视图 -->
      <el-table
        v-else-if="!loadError"
        :data="filteredFiles"
        @row-dblclick="handleRowDblClick"
        @selection-change="handleSelectionChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="名称" min-width="200" sortable :sort-orders="['asc', 'desc']">
          <template #default="{ row }">
            <div class="list-name">
              <el-icon v-if="row.isDirectory" class="folder-icon"><Folder /></el-icon>
              <el-icon v-else-if="row.type === 'image'"><Picture /></el-icon>
              <el-icon v-else><VideoPlay /></el-icon>
              <span>{{ row.name }}</span>
              <el-tag
                v-if="row.marking && row.marking.label"
                :color="row.marking.color"
                size="small"
                effect="dark"
                class="marking-tag"
              >
                {{ row.marking.label }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            {{ row.isDirectory ? '文件夹' : (row.type === 'image' ? '图片' : '视频') }}
          </template>
        </el-table-column>
        <el-table-column label="大小" width="100" sortable :sort-orders="['asc', 'desc']">
          <template #default="{ row }">
            {{ row.isDirectory ? '-' : formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="创建日期" width="180" sortable :sort-orders="['asc', 'desc']">
          <template #default="{ row }">
            {{ getCreateDate(row.name) || row.modifiedDate || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.isDirectory" size="small" link @click="previewFile(row)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button v-if="!row.isDirectory && canMark" size="small" link @click="markFile(row)">
              <el-icon><CollectionTag /></el-icon>
              标记
            </el-button>
            <el-button
              v-if="canDelete"
              size="small"
              link
              type="danger"
              @click="deleteFile(row)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div v-if="!loadError && totalFiles > pageSize" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="totalFiles"
          :page-sizes="[60, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </div>
    
    <!-- 预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewFile_data?.name || '预览'"
      width="90%"
      top="2vh"
      class="preview-dialog"
      @close="onPreviewClose"
      destroy-on-close
    >
      <div v-if="previewFile_data" class="preview-wrapper">
        <!-- 主预览区 -->
        <div v-loading="previewLoading" element-loading-text="加载中..." class="preview-main">
          <!-- 图片预览 -->
          <div
            v-if="previewFile_data.type === 'image'"
            class="preview-image-container"
            @wheel.prevent="handleImageZoom"
          >
            <img
              :src="getStreamUrl(previewFile_data.path)"
              :alt="previewFile_data.name"
              class="preview-image"
              :style="imageTransform"
              @load="previewLoading = false"
              @error="previewLoading = false"
              @mousedown="startDrag"
              @mousemove="onDrag"
              @mouseup="endDrag"
              @mouseleave="endDrag"
              draggable="false"
            />
          </div>
          
          <!-- 视频预览 -->
          <div v-else-if="previewFile_data.type === 'video'" class="preview-video-container">
            <video
              :src="getStreamUrl(previewFile_data.path)"
              controls
              autoplay
              class="preview-video"
              @loadeddata="previewLoading = false"
              @error="previewLoading = false"
            />
          </div>
          
          <!-- 导航按钮 -->
          <div
            v-if="previewFile_data.type === 'image' && currentFileIndex > 0"
            class="nav-btn nav-prev"
            @click="navigatePreview(-1)"
          >
            <el-icon :size="32"><ArrowLeft /></el-icon>
          </div>
          <div
            v-if="previewFile_data.type === 'image' && currentFileIndex < fileItems.length - 1"
            class="nav-btn nav-next"
            @click="navigatePreview(1)"
          >
            <el-icon :size="32"><ArrowRight /></el-icon>
          </div>
        </div>
        
        <!-- 工具栏 -->
        <div class="preview-toolbar">
          <div class="toolbar-left">
            <el-button-group v-if="previewFile_data.type === 'image'">
              <el-button :icon="ZoomOut" circle @click="zoomImage(-0.2)" :disabled="imageScale <= 0.2" />
              <span class="zoom-label">{{ Math.round(imageScale * 100) }}%</span>
              <el-button :icon="ZoomIn" circle @click="zoomImage(0.2)" :disabled="imageScale >= 5" />
              <el-button :icon="RefreshRight" circle @click="resetImageTransform" title="重置" />
              <el-button :icon="ArrowLeft" circle @click="rotateImage(-90)" title="左转" />
              <el-button :icon="ArrowRight" circle @click="rotateImage(90)" title="右转" />
            </el-button-group>
          </div>
          
          <div class="toolbar-center">
            <span v-if="previewFile_data.type === 'image'" class="page-indicator">
              {{ currentFileIndex + 1 }} / {{ fileItems.length }}
            </span>
          </div>
          
          <div class="toolbar-right">
            <el-button @click="downloadFile(previewFile_data)">
              <el-icon><Download /></el-icon>
              下载
            </el-button>
            <el-button v-if="canMark" @click="markFile(previewFile_data); previewVisible = false">
              <el-icon><CollectionTag /></el-icon>
              标记内容
            </el-button>
            <el-button
              v-if="canDelete"
              type="danger"
              @click="deleteFile(previewFile_data)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
        
        <!-- 信息面板 -->
        <div class="preview-info">
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="文件名">{{ previewFile_data.name }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ previewFile_data.type === 'image' ? '图片' : '视频' }}</el-descriptions-item>
            <el-descriptions-item label="大小">{{ formatSize(previewFile_data.size) }}</el-descriptions-item>
            <el-descriptions-item label="创建日期">{{ getCreateDate(previewFile_data.name) || formatDate(previewFile_data.modifiedDate) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="路径" :span="2">{{ previewFile_data.path }}</el-descriptions-item>
            <el-descriptions-item v-if="previewFile_data.marking" label="标记标签" :span="3">
              <el-tag :color="previewFile_data.marking.color" effect="dark">
                {{ previewFile_data.marking.label || '无标签' }}
              </el-tag>
              <span v-if="previewFile_data.marking?.note" class="marking-note">{{ previewFile_data.marking.note }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
    
    <!-- 标记对话框 -->
    <MarkingDialog
      v-model="markingVisible"
      :file-path="markingFilePath"
      :file-name="markingFileName"
      @saved="onMarkingSaved"
      @deleted="onMarkingDeleted"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Refresh, Delete, Grid, List, Folder, View,
  CollectionTag, Check, Picture, VideoPlay,
  ArrowLeft, ArrowRight, ZoomIn, ZoomOut, RefreshRight, Download, Sort, Loading, HomeFilled
} from '@element-plus/icons-vue'
import api from '../api'
import { useAuthStore } from '../stores/auth'
import MarkingDialog from '../components/MarkingDialog.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const loadError = ref(null)
const files = ref([])
const currentPath = ref('/')
const viewMode = ref('grid')
const filterType = ref('')
const searchText = ref('')
const sortBy = ref('name')
const sortOrder = ref('desc')
const selectedFiles = ref([])
const tableSelection = ref([])
// 图片加载状态跟踪
const imageLoadedMap = ref(new Map())
// 视频缩略图缓存（前端canvas生成）
const videoThumbnails = ref(new Map())
// 正在生成缩略图的视频路径集合（防止重复生成）
const generatingThumbs = ref(new Set())
// 文件夹导航加载状态
const folderNavigating = ref(null)

// 预览相关
const previewVisible = ref(false)
const previewFile_data = ref(null)
const previewLoading = ref(false)

// 图片变换状态
const imageScale = ref(1)
const imageRotation = ref(0)
const imageOffsetX = ref(0)
const imageOffsetY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

const imageTransform = computed(() => {
  return {
    transform: `translate(${imageOffsetX.value}px, ${imageOffsetY.value}px) scale(${imageScale.value}) rotate(${imageRotation.value}deg)`,
    transition: isDragging.value ? 'none' : 'transform 0.2s ease'
  }
})

const currentFileIndex = computed(() => {
  if (!previewFile_data.value) return -1
  return allFileItems.value.findIndex(f => f.path === previewFile_data.value.path)
})

// 标记相关
const markingVisible = ref(false)
const markingFilePath = ref('')
const markingFileName = ref('')

// 权限
const canDelete = computed(() => authStore.hasPermission('delete'))
const canMark = computed(() => authStore.hasPermission('mark'))

// 面包屑
const breadcrumbs = computed(() => {
  if (currentPath.value === '/' || !currentPath.value) return []
  const parts = currentPath.value.split('/').filter(Boolean)
  const crumbs = []
  let path = ''
  for (const part of parts) {
    path += '/' + part
    crumbs.push({ name: part, path })
  }
  return crumbs
})

// 文件夹列表（排序后，支持搜索过滤）
const folders = computed(() => {
  let result = files.value.filter(f => f.isDirectory)
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    result = result.filter(f => f.name.toLowerCase().includes(q))
  }
  return sortFiles(result)
})

// 全部文件列表（排序+过滤后，分页前）
const allFileItems = computed(() => {
  let result = files.value.filter(f => !f.isDirectory)
  result = sortFiles(result)
  if (filterType.value) {
    result = result.filter(f => f.type === filterType.value)
  }
  return result
})

// 分页
const currentPage = ref(1)
const pageSize = ref(60)

// 文件统计
const fileStats = computed(() => {
  const all = files.value.filter(f => !f.isDirectory)
  const images = all.filter(f => f.type === 'image').length
  const videos = all.filter(f => f.type === 'video').length
  const folders = files.value.filter(f => f.isDirectory).length
  return { total: all.length, images, videos, folders }
})

// 当前页文件列表
const fileItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return allFileItems.value.slice(start, start + pageSize.value)
})

// 总页数
const totalFiles = computed(() => allFileItems.value.length)

// 通用排序函数
const sortFiles = (list) => {
  if (!list || list.length === 0) return list
  
  const sorted = [...list]
  const order = sortOrder.value === 'asc' ? 1 : -1
  
  sorted.sort((a, b) => {
    // 文件夹始终在前
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1
    }
    
    let cmp = 0
    switch (sortBy.value) {
      case 'date':
        const dateA = new Date(a.modifiedDate || 0).getTime()
        const dateB = new Date(b.modifiedDate || 0).getTime()
        cmp = dateA - dateB
        break
      case 'size':
        const sizeA = a.size || 0
        const sizeB = b.size || 0
        cmp = sizeA - sizeB
        break
      case 'name':
      default:
        cmp = a.name.localeCompare(b.name, 'zh-CN')
        break
    }
    
    return cmp * order
  })
  
  return sorted
}

// 过滤后的文件（列表视图用，包含文件夹+全部文件）
const filteredFiles = computed(() => {
  let result = [...folders.value, ...allFileItems.value]
  return result
})

// 生成视频缩略图（使用浏览器video+canvas，仅限可视区域）
const generateVideoThumbnail = (file) => {
  const filePath = file.path
  if (videoThumbnails.value.get(filePath) || generatingThumbs.value.has(filePath)) return
  generatingThumbs.value.add(filePath)

  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.muted = true
  video.preload = 'metadata'
  video.src = getStreamUrl(filePath)

  // 超时自动清理（防止挂起）
  const timeout = setTimeout(() => {
    cleanup()
  }, 15000)

  const cleanup = () => {
    clearTimeout(timeout)
    video.removeAttribute('src')
    video.load()
    generatingThumbs.value.delete(filePath)
  }

  video.addEventListener('loadeddata', () => {
    const seekTime = Math.min(1, video.duration * 0.1 || 0)
    video.currentTime = isNaN(seekTime) ? 0 : seekTime
  })

  video.addEventListener('seeked', () => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const scale = Math.min(200 / video.videoWidth, 200 / video.videoHeight, 1)
      canvas.width = video.videoWidth * scale
      canvas.height = video.videoHeight * scale
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      videoThumbnails.value.set(filePath, dataUrl)
    } catch (e) {
      console.warn('视频缩略图生成失败:', filePath, e)
    }
    cleanup()
  })

  video.addEventListener('error', () => {
    cleanup()
  })
}

// 滚动时为可见视频生成缩略图
let scrollThumbTimer = null
const onScrollGenerateThumbs = () => {
  if (scrollThumbTimer) clearTimeout(scrollThumbTimer)
  scrollThumbTimer = setTimeout(() => {
    const videoCards = document.querySelectorAll('.file-card[data-video="true"]')
    const winH = window.innerHeight
    let count = 0
    videoCards.forEach(el => {
      if (count >= 5) return
      const rect = el.getBoundingClientRect()
      // 在可视区域+200px预加载范围内
      if (rect.top < winH + 200 && rect.bottom > -200) {
        const path = el.dataset.path
        if (path && !videoThumbnails.value.get(path) && !generatingThumbs.value.has(path)) {
          const file = allFileItems.value.find(f => f.path === path)
          if (file) {
            generateVideoThumbnail(file)
            count++
          }
        }
      }
    })
  }, 200)
}
const getImageLoadedState = (filePath) => {
  return imageLoadedMap.value.get(filePath) === true
}
// 标记图片已加载
const onImageLoaded = (filePath) => {
  imageLoadedMap.value.set(filePath, true)
}
// 加载文件列表
const loadFiles = async () => {
  loading.value = true
  loadError.value = null
  // 清理图片加载状态
  imageLoadedMap.value.clear()
  try {
    const res = await api.get('/files/list', { params: { path: currentPath.value } })
    files.value = res.files || []
    // 重置分页
    currentPage.value = 1
    // 清空视频缩略图缓存
    videoThumbnails.value.clear()
    generatingThumbs.value.clear()
    // 首次生成可视区域视频缩略图
    nextTick(() => onScrollGenerateThumbs())
  } catch (error) {
    files.value = []
    const msg = error?.response?.data?.message || error.message || '加载失败'
    loadError.value = msg
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

// 导航到目录
const navigateTo = (path) => {
  folderNavigating.value = path || '/'
  currentPath.value = path || '/'
  selectedFiles.value = []
  // 更新URL
  router.push({ path: '/gallery', query: path && path !== '/' ? { path } : {} })
  loadFiles().finally(() => {
    folderNavigating.value = null
  })
}

// 返回主目录
const goHome = () => {
  if (currentPath.value === '/') return
  searchText.value = ''
  filterType.value = ''
  navigateTo('/')
}

// 获取文件流URL
const getStreamUrl = (filePath) => {
  const token = localStorage.getItem('token') || ''
  return `/api/files/stream?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`
}

// 获取缩略图URL（用于网格视图快速加载）
const getThumbnailUrl = (filePath) => {
  const token = localStorage.getItem('token') || ''
  return `/api/files/thumbnail?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`
}

// 文件点击
const handleFileClick = (file, event) => {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl/Cmd + 点击：多选
    if (selectedFiles.value.includes(file.path)) {
      selectedFiles.value = selectedFiles.value.filter(p => p !== file.path)
    } else {
      selectedFiles.value.push(file.path)
    }
  } else {
    // 单击预览
    previewFile(file)
  }
}

// 列表行双击
const handleRowDblClick = (row) => {
  if (row.isDirectory) {
    navigateTo(row.path)
  } else {
    previewFile(row)
  }
}

// 列表选择变化
const handleSelectionChange = (selection) => {
  tableSelection.value = selection
  selectedFiles.value = selection.map(f => f.path)
}

// 预览文件
const previewFile = (file) => {
  previewFile_data.value = file
  previewLoading.value = true
  resetImageTransform()
  previewVisible.value = true
}

// 预览关闭时重置状态
const onPreviewClose = () => {
  previewFile_data.value = null
  resetImageTransform()
}

// 重置图片变换
const resetImageTransform = () => {
  imageScale.value = 1
  imageRotation.value = 0
  imageOffsetX.value = 0
  imageOffsetY.value = 0
}

// 缩放图片
const zoomImage = (delta) => {
  const newScale = Math.max(0.2, Math.min(5, imageScale.value + delta))
  imageScale.value = newScale
}

// 旋转图片
const rotateImage = (delta) => {
  imageRotation.value = (imageRotation.value + delta) % 360
}

// 鼠标滚轮缩放
const handleImageZoom = (e) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  zoomImage(delta)
}

// 拖拽开始
const startDrag = (e) => {
  isDragging.value = true
  dragStartX.value = e.clientX - imageOffsetX.value
  dragStartY.value = e.clientY - imageOffsetY.value
}

// 拖拽中
const onDrag = (e) => {
  if (!isDragging.value) return
  imageOffsetX.value = e.clientX - dragStartX.value
  imageOffsetY.value = e.clientY - dragStartY.value
}

// 拖拽结束
const endDrag = () => {
  isDragging.value = false
}

// 导航预览（上一张/下一张）
const navigatePreview = (direction) => {
  if (currentFileIndex.value < 0) return
  const newIndex = currentFileIndex.value + direction
  if (newIndex < 0 || newIndex >= allFileItems.value.length) return
  previewFile_data.value = allFileItems.value[newIndex]
  previewLoading.value = true
  resetImageTransform()
}

// 下载文件
const downloadFile = async (file) => {
  try {
    const token = localStorage.getItem('token') || ''
    const url = `/api/files/stream?path=${encodeURIComponent(file.path)}&token=${encodeURIComponent(token)}`
    
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('开始下载')
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

// 键盘事件处理
const handleKeydown = (e) => {
  if (!previewVisible.value) return
  
  if (e.key === 'Escape') {
    previewVisible.value = false
  } else if (e.key === 'ArrowLeft') {
    navigatePreview(-1)
  } else if (e.key === 'ArrowRight') {
    navigatePreview(1)
  } else if (e.key === '+' || e.key === '=') {
    zoomImage(0.2)
  } else if (e.key === '-' || e.key === '_') {
    zoomImage(-0.2)
  } else if (e.key === '0') {
    resetImageTransform()
  }
}

// 翻页时清理缩略图缓存并滚动到顶部
watch(currentPage, () => {
  videoThumbnails.value.clear()
  generatingThumbs.value.clear()
  imageLoadedMap.value.clear()
  nextTick(() => {
    document.querySelector('.file-container')?.scrollIntoView({ behavior: 'smooth' })
    onScrollGenerateThumbs()
  })
})

// 排序/筛选变化时重置到第一页
watch([sortBy, sortOrder, filterType, searchText], () => {
  currentPage.value = 1
})

// 监听预览文件变化，重置图片状态
watch(previewFile_data, () => {
  resetImageTransform()
})

// 标记文件
const markFile = (file) => {
  markingFilePath.value = file.path
  markingFileName.value = file.name
  markingVisible.value = true
}

// 标记保存回调
const onMarkingSaved = (marking) => {
  const file = files.value.find(f => f.path === markingFilePath.value)
  if (file) {
    file.marking = marking
  }
}

// 标记删除回调
const onMarkingDeleted = () => {
  const file = files.value.find(f => f.path === markingFilePath.value)
  if (file) {
    file.marking = null
  }
}

// 删除文件
const deleteFile = async (file) => {
  if (!file) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除文件 "${file.name}" 吗？此操作不可恢复！`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
    )
    
    // 如果在预览模式下，先判断是否需要导航
    const wasPreviewing = previewVisible.value
    const deletedFileIndex = currentFileIndex.value
    const remainingFiles = allFileItems.value.filter(f => f.path !== file.path)
    const hasNextFile = deletedFileIndex < remainingFiles.length
    
    await api.delete('/files/file', { params: { path: file.path } })
    ElMessage.success('删除成功')
    
    if (wasPreviewing && previewFile_data.value?.path === file.path) {
      // 导航到下一个文件或关闭预览
      if (hasNextFile && remainingFiles.length > 0) {
        // 删除后如果还有后面的文件，保持当前索引位置
        previewFile_data.value = remainingFiles[Math.min(deletedFileIndex, remainingFiles.length - 1)]
        resetImageTransform()
      } else {
        // 没有更多文件了，关闭预览
        previewVisible.value = false
      }
    }
    
    loadFiles()
  } catch (error) {
    if (error !== 'cancel') {
      const msg = error?.response?.data?.message || '删除失败'
      ElMessage.error(msg)
    }
  }
}

// 批量删除
const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedFiles.value.length} 个文件吗？此操作不可恢复！`,
      '批量删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
    )
    
    const res = await api.post('/files/batch-delete', { paths: selectedFiles.value })
    const successCount = res.results.filter(r => r.success).length
    const failCount = res.results.filter(r => !r.success).length
    
    if (failCount > 0) {
      const failedFiles = res.results.filter(r => !r.success).map(r => r.path).join(', ')
      ElMessage.warning(`删除完成：成功 ${successCount} 个，失败 ${failCount} 个`)
    } else {
      ElMessage.success(`批量删除成功：共删除 ${successCount} 个文件`)
    }
    
    selectedFiles.value = []
    tableSelection.value = []
    loadFiles()
  } catch (error) {
    if (error !== 'cancel') {
      const msg = error?.response?.data?.message || '批量删除失败'
      ElMessage.error(msg)
    }
  }
}

// 图片加载失败：先尝试回退原图，再失败才显示占位符
const handleImageError = (e, file) => {
  const img = e.target
  if (!img) return
  // 检查是否已尝试过回退（通过data属性标记）
  if (img.dataset.fallback === 'true') {
    // 原图也失败了，显示错误占位符
    img.style.display = 'none'
    const parent = img.parentElement
    if (parent && !parent.querySelector('.image-error-placeholder')) {
      const placeholder = document.createElement('div')
      placeholder.className = 'image-error-placeholder'
      placeholder.innerHTML = '<el-icon style="font-size:28px"><Picture /></el-icon><span>加载失败</span>'
      parent.appendChild(placeholder)
    }
    return
  }
  // 标记已尝试回退，并切换到原图URL
  img.dataset.fallback = 'true'
  img.src = getStreamUrl(file.path)
}

// 视频加载完成
const onVideoLoaded = (e) => {
  // 可以在这里做缩略图处理
}

// 格式化文件大小
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i]
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const getCreateDate = (fileName) => {
  if (!fileName) return ''
  // 截取文件名前15位，格式: 20260627_135438 → 2026-06-27 13:54:38
  const match = fileName.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`
  }
  return ''
}

onMounted(() => {
  const pathParam = route.query.path
  if (pathParam && typeof pathParam === 'string') {
    currentPath.value = pathParam
  }
  loadFiles()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('scroll', onScrollGenerateThumbs, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('scroll', onScrollGenerateThumbs, true)
  if (scrollThumbTimer) clearTimeout(scrollThumbTimer)
})
</script>

<style scoped>
.gallery-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 16px 0;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.file-container {
  flex: 1;
  overflow-y: auto;
}

.file-stats {
  display: flex;
  gap: 6px;
  margin-left: 12px;
  flex-shrink: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

/* 网格视图 */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding-bottom: 20px;
}

.file-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
  border: 2px solid transparent;
}

.file-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.file-card.selected {
  border-color: #07C160;
}

.file-preview {
  position: relative;
  width: 100%;
  height: 150px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 图片包裹容器 */
.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 骨架屏占位 */
.skeleton-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, #f0f2f5 25%, #e6e9ef 50%, #f0f2f5 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.4s ease-in-out infinite;
  z-index: 1;
  color: #c0c4cc;
  transition: opacity 0.3s;
}

.skeleton-placeholder.hidden {
  opacity: 0;
  pointer-events: none;
}

.skeleton-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 图片加载完成动画 */
.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
  position: relative;
  z-index: 2;
}

.file-preview img.loaded {
  opacity: 1;
}

.file-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.folder-preview {
  position: relative;
  width: 100%;
  height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: #059748;
  background: linear-gradient(135deg, #f0fbf4 0%, #e6f7ec 100%);
  gap: 8px;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
  transition: all 0.2s;
}

.folder-preview .el-icon {
  font-size: 52px;
}

.folder-icon-main {
  transition: transform 0.2s;
}

.folder-loading {
  font-size: 44px;
  animation: loading-spin 1s linear infinite;
  color: #07C160;
}

@keyframes loading-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.folder-loading-text {
  font-size: 12px;
  color: #07C160;
  font-weight: 500;
  margin-top: 2px;
}

/* 文件夹卡片按下时效果 */
.folder-card:active .folder-preview {
  transform: scale(0.97);
  background: linear-gradient(135deg, #e6f7ec 0%, #d6f1e0 100%);
}

.folder-card.navigating {
  cursor: progress;
  pointer-events: none;
  border-color: #07C160;
}

.folder-label {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.folder-card .file-name {
  text-align: center;
  color: #303133;
  font-weight: 600;
}

.video-preview {
  position: relative;
  width: 100%;
  height: 100%;
}

.video-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 40px;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.type-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  line-height: 1;
  white-space: nowrap;
}

.type-badge .type-label {
  line-height: 1;
}

.type-badge.image {
  background: rgba(7, 193, 96, 0.85);
}

.type-badge.video {
  background: rgba(255, 149, 0, 0.85);
}

.marking-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #fff;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #07C160;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.date-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  white-space: nowrap;
}

.file-info {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fff;
  border-top: 1px solid #EDEDED;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.folder-card .file-name {
  color: #303133;
  font-weight: 600;
}

.file-size {
  font-size: 11px;
  color: #909399;
}

.file-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.file-date {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
}

.file-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  padding: 6px;
  display: flex;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-card:hover .file-actions {
  opacity: 1;
}

/* 列表视图 */
.list-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

.folder-icon {
  color: #059748;
}

.marking-tag {
  color: #fff;
  border: none;
}

/* 预览对话框 */
.preview-dialog :deep(.el-dialog__body) {
  padding: 12px 16px;
}

.preview-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-main {
  position: relative;
  background: #1a1a1a;
  border-radius: 8px;
  min-height: 50vh;
  max-height: 65vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
  overflow: hidden;
}

.preview-image-container:active {
  cursor: grabbing;
}

.preview-image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  transform-origin: center center;
  will-change: transform;
  user-select: none;
  -webkit-user-drag: none;
}

.preview-video-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-video {
  max-width: 100%;
  max-height: 60vh;
  border-radius: 4px;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
  backdrop-filter: blur(4px);
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.nav-prev {
  left: 16px;
}

.nav-next {
  right: 16px;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  flex-wrap: wrap;
  gap: 10px;
}

.preview-toolbar .toolbar-left,
.preview-toolbar .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-toolbar .toolbar-center {
  flex: 1;
  text-align: center;
}

.zoom-label {
  min-width: 50px;
  text-align: center;
  font-size: 12px;
  color: #606266;
}

.page-indicator {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.marking-note {
  margin-left: 10px;
  font-size: 13px;
  color: #606266;
}

.preview-info {
  width: 100%;
}

.preview-info :deep(.el-descriptions__label) {
  width: 80px;
  font-weight: 500;
}

.image-error-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #909399;
  background: #f5f7fa;
}
</style>
