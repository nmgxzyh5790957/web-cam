<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo-wrapper">
          <svg viewBox="0 0 48 48" class="login-logo">
            <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm0 36c-8.82 0-16-7.18-16-16S15.18 8 24 8s16 7.18 16 16-7.18 16-16 16z" fill="currentColor"/>
            <path d="M24 12c-6.63 0-12 5.37-12 12s5.37 12 12 12 12-5.37 12-12-5.37-12-12-12zm0 22c-5.51 0-10-4.49-10-10s4.49-10 10-10 10 4.49 10 10-4.49 10-10 10z" fill="currentColor"/>
            <circle cx="24" cy="24" r="5" fill="currentColor"/>
          </svg>
        </div>
        <h1 class="login-title">兴野智汇远程图像采集管理平台</h1>
        <p class="login-subtitle">图片 · 视频内容管理系统</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        @submit.prevent="handleLogin"
        class="login-form"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="login-button"
          :loading="loading"
          @click="handleLogin"
        >
          登 录
        </el-button>
      </el-form>

      <div class="login-tips">
        <el-alert
          title="默认管理员账号: admin / admin123"
          type="info"
          :closable="false"
          show-icon
        />
      </div>
    </div>

    <div class="login-footer">
      <p>内蒙古兴野智汇数字科技有限责任公司  版权所有</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await authStore.login(loginForm.username, loginForm.password)
      ElMessage.success('登录成功')
      router.push('/')
    } catch (error) {
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #EDEDED;
  padding: 20px;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-logo-wrapper {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #07C160 0%, #06AD56 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 8px 20px rgba(7, 193, 96, 0.25);
}

.login-logo {
  width: 44px;
  height: 44px;
  color: #fff;
}

.login-title {
  font-size: 22px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #8A8A8A;
}

.login-form {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  font-size: 16px;
  letter-spacing: 8px;
  height: 48px;
  border-radius: 8px;
  background: linear-gradient(135deg, #07C160 0%, #06AD56 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(7, 193, 96, 0.3);
}

.login-button:hover {
  background: linear-gradient(135deg, #06AD56 0%, #059748 100%);
}

.login-tips {
  margin-top: 20px;
}

.login-footer {
  margin-top: 32px;
  color: #8A8A8A;
  font-size: 13px;
  text-align: center;
}

.login-footer p {
  margin: 0;
}
</style>
