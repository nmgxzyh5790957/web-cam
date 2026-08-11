<template>
  <div class="operation-logs">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-title-wrapper">
        <h2 class="page-title">操作日志</h2>
        <span class="page-subtitle">记录系统所有操作行为，支持追溯和审计</span>
      </div>
      <div class="header-actions">
        <el-button
          v-if="authStore.hasPermission('manage_config')"
          type="danger"
          plain
          @click="handleClear"
        >
          <el-icon><Delete /></el-icon>
          清空日志
        </el-button>
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div v-if="stats" class="stats-cards">
      <div class="stat-card stat-total">
        <div class="stat-icon">
          <el-icon :size="24"><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总日志数</div>
        </div>
      </div>
      <div class="stat-card stat-today">
        <div class="stat-icon">
          <el-icon :size="24"><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.todayCount }}</div>
          <div class="stat-label">今日操作</div>
        </div>
      </div>
      <div class="stat-card stat-file">
        <div class="stat-icon">
          <el-icon :size="24"><FolderOpened /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.typeCounts['file'] || 0 }}</div>
          <div class="stat-label">文件操作</div>
        </div>
      </div>
      <div class="stat-card stat-user">
        <div class="stat-icon">
          <el-icon :size="24"><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.typeCounts['user'] || 0 }}</div>
          <div class="stat-label">用户操作</div>
        </div>
      </div>
      <div class="stat-card stat-marking">
        <div class="stat-icon">
          <el-icon :size="24"><CollectionTag /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.typeCounts['marking'] || 0 }}</div>
          <div class="stat-label">标记操作</div>
        </div>
      </div>
      <div class="stat-card stat-system">
        <div class="stat-icon">
          <el-icon :size="24"><Setting /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.typeCounts['system'] || 0 }}</div>
          <div class="stat-label">系统操作</div>
        </div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="filters" @submit.prevent>
        <el-form-item label="操作类型">
          <el-select v-model="filters.type" placeholder="全部" clearable style="width: 140px">
            <el-option label="文件操作" value="file" />
            <el-option label="用户操作" value="user" />
            <el-option label="标记操作" value="marking" />
            <el-option label="系统操作" value="system" />
          </el-select>
        </el-form-item>
        <el-form-item label="功能模块">
          <el-select v-model="filters.module" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="m in moduleOptions"
              :key="m"
              :label="m"
              :value="m"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="filters.username" placeholder="搜索操作人" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.search" placeholder="搜索目标/详情" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item class="filter-actions">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 日志表格 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="logs" v-loading="loading" style="width: 100%" stripe highlight-current-row>
        <el-table-column label="时间" width="170" sortable="desc">
          <template #default="{ row }">
            <span class="time-text">{{ formatTimestamp(row.timestamp) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="120">
          <template #default="{ row }">
            <span class="operator-text">{{ row.username || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small" round>
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="功能模块" width="120">
          <template #default="{ row }">
            <el-tag type="info" size="small" effect="plain" round>
              {{ row.module }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作行为" width="140">
          <template #default="{ row }">
            <span class="action-text">{{ row.action }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作目标" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.target || '-' }}</span>
            <el-tag v-if="row.targetType" size="small" effect="plain" style="margin-left: 6px">
              {{ row.targetType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="详情" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.details || '-' }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <span class="pagination-info">共 {{ total }} 条记录</span>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="total"
          :page-sizes="[20, 50, 100, 200]"
          layout="sizes, prev, pager, next, jumper"
          background
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Delete, Refresh, Search, Document, Clock, FolderOpened, User, CollectionTag, Setting
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { useLogStore } from '../stores/logs'

const authStore = useAuthStore()
const logStore = useLogStore()

const loading = ref(false)
const logs = ref([])
const total = ref(0)
const stats = ref(null)

const filters = reactive({
  type: '',
  module: '',
  username: '',
  search: '',
  dateRange: null
})

const pagination = reactive({
  page: 1,
  pageSize: 50
})

const moduleOptions = computed(() => {
  if (!stats.value?.moduleCounts) return []
  return Object.keys(stats.value.moduleCounts)
})

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filters.type) params.type = filters.type
    if (filters.module) params.module = filters.module
    if (filters.username) params.username = filters.username
    if (filters.search) params.search = filters.search
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }

    const res = await logStore.fetchLogs(params)
    logs.value = res.items
    total.value = res.total
  } catch (e) {
    ElMessage.error('加载日志失败')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    stats.value = await logStore.fetchStats()
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  filters.type = ''
  filters.module = ''
  filters.username = ''
  filters.search = ''
  filters.dateRange = null
  pagination.page = 1
  loadData()
}

const handleClear = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有操作日志吗？此操作不可恢复。',
      '警告',
      { type: 'warning' }
    )
    await logStore.clearLogs()
    ElMessage.success('日志已清空')
    loadData()
    loadStats()
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
    }
  }
}

const getTypeTagType = (type) => {
  const map = { file: 'success', user: '', marking: 'warning', system: 'info' }
  return map[type] || ''
}

const getTypeText = (type) => {
  const map = { file: '文件操作', user: '用户操作', marking: '标记操作', system: '系统操作' }
  return map[type] || type || '未知'
}

const formatTimestamp = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(() => {
  loadData()
  loadStats()
})
</script>

<style scoped>
.operation-logs {
  padding: 0;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
}

.page-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
  line-height: 1.3;
}

.page-subtitle {
  font-size: 13px;
  color: #999;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 18px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 10px 0 0 10px;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-total::before { background: linear-gradient(180deg, #07C160 0%, #059748 100%); }
.stat-today::before { background: linear-gradient(180deg, #409EFF 0%, #337ECC 100%); }
.stat-file::before { background: linear-gradient(180deg, #07C160 0%, #059748 100%); }
.stat-user::before { background: linear-gradient(180deg, #E6A23C 0%, #CF8B25 100%); }
.stat-marking::before { background: linear-gradient(180deg, #F56C6C 0%, #D94A4A 100%); }
.stat-system::before { background: linear-gradient(180deg, #909399 0%, #73767A 100%); }

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-total .stat-icon { background: #E8FBF1; color: #07C160; }
.stat-today .stat-icon { background: #ECF5FF; color: #409EFF; }
.stat-file .stat-icon { background: #E8FBF1; color: #07C160; }
.stat-user .stat-icon { background: #FDF6EC; color: #E6A23C; }
.stat-marking .stat-icon { background: #FEF0F0; color: #F56C6C; }
.stat-system .stat-icon { background: #F4F4F5; color: #909399; }

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 3px;
  white-space: nowrap;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 16px;
  border-radius: 10px;
}

.filter-card :deep(.el-card__body) {
  padding: 18px 20px;
}

.filter-card :deep(.el-form-item) {
  margin-bottom: 10px;
  margin-right: 14px;
}

.filter-card :deep(.el-form-item__label) {
  font-size: 13px;
  color: #666;
  padding-right: 8px;
}

.filter-actions {
  margin-left: auto;
}

/* 表格卡片 */
.table-card {
  border-radius: 10px;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

/* 表格样式 */
:deep(.el-table) {
  --el-table-border-color: #F0F0F0;
  --el-table-header-bg-color: #F7FAF8;
}

:deep(.el-table th) {
  background-color: #F7FAF8 !important;
  color: #5A5A5A;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 2px solid #07C160;
}

:deep(.el-table td) {
  font-size: 13px;
  color: #333;
}

:deep(.el-table .el-table__row:hover > td) {
  background-color: #F7FBF8 !important;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #FAFAFA;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped:hover td) {
  background-color: #F7FBF8 !important;
}

.time-text {
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: #555;
}

.operator-text {
  color: #1A1A1A;
  font-weight: 500;
}

.action-text {
  font-weight: 500;
  color: #1A1A1A;
}

/* 分页 */
.pagination-wrapper {
  margin-top: 0;
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #F0F0F0;
}

.pagination-info {
  font-size: 13px;
  color: #999;
}

/* 响应式 */
@media (max-width: 1400px) {
  .stats-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
