import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页概览', icon: 'DataAnalysis', permission: 'view' }
      },
      {
        path: 'gallery',
        name: 'Gallery',
        component: () => import('../views/Gallery.vue'),
        meta: { title: '图像浏览', icon: 'Picture', permission: 'view' }
      },
      {
        path: 'marked',
        name: 'MarkedFiles',
        component: () => import('../views/MarkedFiles.vue'),
        meta: { title: '标记内容', icon: 'CollectionTag', permission: 'view' }
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: () => import('../views/UserManagement.vue'),
        meta: { title: '用户管理', icon: 'User', permission: 'manage_users' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue'),
        meta: { title: '系统设置', icon: 'Setting', permission: 'manage_config' }
      },
      {
        path: 'logs',
        name: 'OperationLogs',
        component: () => import('../views/OperationLogs.vue'),
        meta: { title: '操作日志', icon: 'Document', permission: 'view_logs' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.meta.public) {
    // 已登录用户访问登录页则跳转首页
    if (to.name === 'Login' && token) {
      next('/')
    } else {
      next()
    }
    return
  }
  
  // 需要认证的页面
  if (!token) {
    next('/login')
    return
  }
  
  // 权限检查
  const authStore = useAuthStore()
  if (!authStore.user) {
    authStore.initFromStorage()
  }
  
  if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
    next('/dashboard')
    return
  }
  
  next()
})

export default router
