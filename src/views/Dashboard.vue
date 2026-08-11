<template>
  <div class="dashboard">
    <div class="page-header">
      <div class="page-title-wrapper">
        <h2 class="page-title">首页概览</h2>
        <span class="page-subtitle">系统运行数据统计与关键指标汇总</span>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="stats-grid">
      <div class="stat-card stat-images" @click="goToGallery">
        <div class="stat-icon">
          <el-icon :size="28"><Picture /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ data.totalImages }}</div>
          <div class="stat-label">图片总数</div>
        </div>
      </div>

      <div class="stat-card stat-videos" @click="goToGallery">
        <div class="stat-icon">
          <el-icon :size="28"><VideoPlay /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ data.totalVideos }}</div>
          <div class="stat-label">视频总数</div>
        </div>
      </div>

      <div class="stat-card stat-folders" @click="goToGallery">
        <div class="stat-icon">
          <el-icon :size="28"><FolderOpened /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ data.totalFolders }}</div>
          <div class="stat-label">文件夹总数</div>
        </div>
      </div>

      <div class="stat-card stat-markings" @click="goToMarked">
        <div class="stat-icon">
          <el-icon :size="28"><CollectionTag /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ data.totalMarkings }}</div>
          <div class="stat-label">历史标记总数</div>
        </div>
      </div>

      <div class="stat-card stat-today" @click="goToMarked">
        <div class="stat-icon">
          <el-icon :size="28"><Clock /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ data.todayMarkings }}</div>
          <div class="stat-label">当日标记总数</div>
        </div>
      </div>

      <div class="stat-card stat-users" @click="goToUsers">
        <div class="stat-icon">
          <el-icon :size="28"><User /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ data.totalUsers }}</div>
          <div class="stat-label">用户总数</div>
        </div>
      </div>
    </div>

    <!-- 图表统计区域 -->
    <div class="charts-section">
      <h3 class="section-title">数据图表分析</h3>
      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">近7天标记趋势</span>
          </div>
          <div ref="trendChartRef" class="chart-container"></div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">标记标签分布</span>
          </div>
          <div ref="labelPieRef" class="chart-container"></div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">文件类型分布</span>
          </div>
          <div ref="typePieRef" class="chart-container"></div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">用户标记统计</span>
          </div>
          <div ref="userBarRef" class="chart-container"></div>
        </div>
      </div>
    </div>

    <div class="dashboard-footer">
      <span>统计数据实时更新 · 当前时间：{{ currentTime }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  Picture, VideoPlay, FolderOpened, CollectionTag, Clock, User, Refresh
} from '@element-plus/icons-vue'
import api from '../api'

const router = useRouter()
const loading = ref(false)

const data = reactive({
  totalImages: 0,
  totalVideos: 0,
  totalFolders: 0,
  totalMarkings: 0,
  todayMarkings: 0,
  totalUsers: 0,
  activeUsers: 0
})

const currentTime = ref('')
let timer = null

// 图表引用
const trendChartRef = ref(null)
const labelPieRef = ref(null)
const typePieRef = ref(null)
const userBarRef = ref(null)

let trendChart = null
let labelPieChart = null
let typePieChart = null
let userBarChart = null

function updateTime() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  currentTime.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

async function loadData() {
  loading.value = true
  try {
    const res = await api.get('/stats/overview')
    Object.assign(data, res)
    await loadCharts()
  } catch (error) {
    // 错误已由拦截器处理
  } finally {
    loading.value = false
  }
}

async function loadCharts() {
  try {
    const res = await api.get('/stats/charts')
    await nextTick()
    initCharts(res)
  } catch (error) {
    // 错误已由拦截器处理
  }
}

function initCharts(chartData) {
  // 1. 近7天标记趋势（折线图）
  if (trendChartRef.value) {
    if (trendChart) trendChart.dispose()
    trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '8%', right: '5%', bottom: '10%', top: '15%' },
      xAxis: {
        type: 'category',
        data: chartData.trendLabels,
        axisLine: { lineStyle: { color: '#D9D9D9' } },
        axisLabel: { color: '#8C8C8C' }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { lineStyle: { color: '#D9D9D9' } },
        axisLabel: { color: '#8C8C8C' },
        splitLine: { lineStyle: { color: '#F0F0F0' } }
      },
      series: [{
        name: '标记数量',
        type: 'line',
        smooth: true,
        data: chartData.trendData,
        itemStyle: { color: '#07C160' },
        lineStyle: { width: 3, color: '#07C160' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(7, 193, 96, 0.3)' },
            { offset: 1, color: 'rgba(7, 193, 96, 0.05)' }
          ])
        }
      }]
    })
  }

  // 2. 标记标签分布（饼图）
  if (labelPieRef.value) {
    if (labelPieChart) labelPieChart.dispose()
    labelPieChart = echarts.init(labelPieRef.value)
    labelPieChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        bottom: '2%',
        left: 'center',
        textStyle: { color: '#8C8C8C', fontSize: 12 }
      },
      series: [{
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        data: chartData.labelPie.length ? chartData.labelPie : [{ name: '暂无数据', value: 1 }],
        color: ['#07C160', '#1890FF', '#FA8C16', '#722ED1', '#EB2F96', '#13C2C2', '#FAAD14']
      }]
    })
  }

  // 3. 文件类型分布（饼图）
  if (typePieRef.value) {
    if (typePieChart) typePieChart.dispose()
    typePieChart = echarts.init(typePieRef.value)
    typePieChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        bottom: '2%',
        left: 'center',
        textStyle: { color: '#8C8C8C', fontSize: 12 }
      },
      series: [{
        type: 'pie',
        radius: '60%',
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        data: chartData.typeDistribution,
        color: ['#07C160', '#FA8C16', '#1890FF']
      }]
    })
  }

  // 4. 用户标记统计（条形图）
  if (userBarRef.value) {
    if (userBarChart) userBarChart.dispose()
    userBarChart = echarts.init(userBarRef.value)
    const userNames = chartData.userBar.map(u => u.name)
    const userValues = chartData.userBar.map(u => u.count)
    userBarChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '15%', right: '5%', bottom: '10%', top: '15%' },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { lineStyle: { color: '#D9D9D9' } },
        axisLabel: { color: '#8C8C8C' },
        splitLine: { lineStyle: { color: '#F0F0F0' } }
      },
      yAxis: {
        type: 'category',
        data: userNames.length ? userNames : ['暂无数据'],
        axisLine: { lineStyle: { color: '#D9D9D9' } },
        axisLabel: { color: '#8C8C8C' }
      },
      series: [{
        type: 'bar',
        data: userValues.length ? userValues : [0],
        barWidth: '50%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#07C160' },
            { offset: 1, color: '#059748' }
          ]),
          borderRadius: [0, 6, 6, 0]
        }
      }]
    })
  }
}

function handleResize() {
  trendChart?.resize()
  labelPieChart?.resize()
  typePieChart?.resize()
  userBarChart?.resize()
}

function goToGallery() {
  router.push('/gallery')
}

function goToMarked() {
  router.push('/marked')
}

function goToUsers() {
  router.push('/users')
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  labelPieChart?.dispose()
  typePieChart?.dispose()
  userBarChart?.dispose()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: #8C8C8C;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  min-height: 300px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #f0f0f0;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.stat-images .stat-icon {
  background: linear-gradient(135deg, #07C160 0%, #059748 100%);
}

.stat-videos .stat-icon {
  background: linear-gradient(135deg, #FA8C16 0%, #D46B08 100%);
}

.stat-folders .stat-icon {
  background: linear-gradient(135deg, #1890FF 0%, #096DD9 100%);
}

.stat-markings .stat-icon {
  background: linear-gradient(135deg, #722ED1 0%, #531DAB 100%);
}

.stat-today .stat-icon {
  background: linear-gradient(135deg, #EB2F96 0%, #C41D7F 100%);
}

.stat-users .stat-icon {
  background: linear-gradient(135deg, #13C2C2 0%, #08979C 100%);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #8C8C8C;
}

.dashboard-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: #5A5A5A;
  font-weight: 500;
}

/* 图表区域 */
.charts-section {
  margin-top: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 16px 4px;
  padding-left: 10px;
  border-left: 4px solid #07C160;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #f0f0f0;
  transition: box-shadow 0.3s ease;
}

.chart-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.chart-container {
  width: 100%;
  height: 280px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .charts-grid {
    grid-template-columns: 1fr;
  }
  .chart-container {
    height: 240px;
  }
}
</style>
