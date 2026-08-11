<template>
  <el-container class="main-layout">
    <!-- 顶部标题栏 -->
    <header class="top-header">
      <div class="top-header-inner">
        <div class="top-header-left">
          <div class="brand-logo">
            <svg viewBox="0 0 48 48" class="logo-svg">
              <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm0 36c-8.82 0-16-7.18-16-16S15.18 8 24 8s16 7.18 16 16-7.18 16-16 16z" fill="currentColor"/>
              <path d="M24 12c-6.63 0-12 5.37-12 12s5.37 12 12 12 12-5.37 12-12-5.37-12-12-12zm0 22c-5.51 0-10-4.49-10-10s4.49-10 10-10 10 4.49 10 10-4.49 10-10 10z" fill="currentColor"/>
              <circle cx="24" cy="24" r="5" fill="currentColor"/>
            </svg>
          </div>
          <h1 class="top-header-title">兴野智汇远程图像采集管理平台</h1>
        </div>
        <div class="top-header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" class="user-avatar">
                {{ authStore.username.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="user-name">{{ authStore.username }}</span>
              <el-tag size="small" class="role-tag">
                {{ roleText }}
              </el-tag>
              <el-icon class="arrow-icon"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <!-- 主体区域 -->
    <el-container class="body-container">
      <!-- 侧边栏 -->
      <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :collapse-transition="false"
          router
          class="sidebar-menu"
          background-color="#FFFFFF"
          text-color="#5A5A5A"
          active-text-color="#07C160"
        >
          <el-menu-item
            v-for="item in menuItems"
            :key="item.path"
            :index="item.path"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
              <Fold v-if="!isCollapse" />
              <Expand v-else />
            </el-icon>
            <span class="breadcrumb-sep">/</span>
            <span class="current-page">{{ currentTitle }}</span>
          </div>
        </div>

        <!-- 主内容区 -->
        <el-main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isCollapse = ref(false)

const allMenuItems = [
  { path: '/dashboard', title: '首页概览', icon: 'DataAnalysis', permission: 'view' },
  { path: '/gallery', title: '图像浏览', icon: 'Picture', permission: 'view' },
  { path: '/marked', title: '标记内容', icon: 'CollectionTag', permission: 'view' },
  { path: '/logs', title: '操作日志', icon: 'Document', permission: 'view_logs' },
  { path: '/users', title: '用户管理', icon: 'User', permission: 'manage_users' },
  { path: '/settings', title: '系统设置', icon: 'Setting', permission: 'manage_config' }
]

const menuItems = computed(() => {
  return allMenuItems.filter(item => authStore.hasPermission(item.permission))
})

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta.title || '图像浏览')

const roleText = computed(() => {
  const roles = { admin: '管理员', editor: '编辑', viewer: '访客' }
  return roles[authStore.user?.role] || '用户'
})

const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      authStore.logout()
      ElMessage.success('已退出登录')
      router.push('/login')
    }).catch(() => {})
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
  flex-direction: column;
}

/* 顶部标题栏 */
.top-header {
  height: 60px;
  background: linear-gradient(135deg, #059748 0%, #047A3B 100%);
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(5, 151, 72, 0.2);
  position: relative;
  z-index: 100;
}

.top-header-inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.top-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.top-header-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
  margin: 0;
}

.top-header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 20px;
  transition: background-color 0.2s;
  color: #fff;
}

.user-info:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.user-avatar {
  background-color: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-weight: 600;
  border: 2px solid rgba(255, 255, 255, 0.4);
}

.user-name {
  font-size: 14px;
  font-weight: 500;
}

.role-tag {
  background: rgba(255, 255, 255, 0.25);
  border: none;
  color: #fff;
}

.role-tag :deep(.el-tag__content) {
  color: #fff;
}

.arrow-icon {
  font-size: 12px;
  opacity: 0.8;
}

/* 主体容器 */
.body-container {
  flex: 1;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  background-color: #FFFFFF;
  border-right: 1px solid #EDEDED;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebar-menu {
  border-right: none;
  height: 100%;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 200px;
}

.sidebar-menu .el-menu-item {
  height: 48px;
  line-height: 48px;
  border-bottom: none;
  transition: all 0.2s;
}

.sidebar-menu .el-menu-item:hover {
  background-color: #F7F7F7;
  color: #07C160;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #F0FBF4;
  color: #07C160;
  border-right: 3px solid #07C160;
}

.sidebar-menu .el-menu-item .el-icon {
  font-size: 18px;
}

/* 工具栏 */
.toolbar {
  height: 48px;
  background-color: #FFFFFF;
  border-bottom: 1px solid #EDEDED;
  display: flex;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-btn {
  font-size: 18px;
  cursor: pointer;
  color: #5A5A5A;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background-color: #F7F7F7;
  color: #07C160;
}

.breadcrumb-sep {
  color: #C0C0C0;
  font-size: 14px;
}

.current-page {
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
}

/* 主内容区 */
.main-content {
  background-color: #EDEDED;
  padding: 16px;
  overflow-y: auto;
}

/* 路由切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
