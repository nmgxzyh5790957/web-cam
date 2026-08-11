<template>
  <div class="settings-page">
    <div class="page-header">
      <h2 class="page-title">系统设置</h2>
    </div>
    
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon><Connection /></el-icon>
          <span>FTP服务器配置</span>
        </div>
      </template>
      
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        style="max-width: 600px"
      >
        <el-form-item label="服务器地址" prop="host">
          <el-input v-model="form.host" placeholder="例如：ftp.example.com 或 IP地址" />
        </el-form-item>
        
        <el-form-item label="端口" prop="port">
          <el-input-number v-model="form.port" :min="1" :max="65535" controls-position="right" />
        </el-form-item>
        
        <el-form-item label="用户名" prop="user">
          <el-input v-model="form.user" placeholder="FTP用户名" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="form.passwordSet ? '已设置，不修改请留空' : '请输入FTP密码'"
          />
        </el-form-item>
        
        <el-form-item label="根目录路径">
          <el-input v-model="form.rootPath" placeholder="FTP根目录路径，如 / 或 /images" />
        </el-form-item>
        
        <el-form-item label="安全连接">
          <el-switch
            v-model="form.secure"
            active-text="启用FTPS"
            inactive-text="普通FTP"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="testConnection" :loading="testing">
            <el-icon><Connection /></el-icon>
            测试连接
          </el-button>
          <el-button type="success" @click="saveConfig" :loading="saving">
            <el-icon><Check /></el-icon>
            保存配置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card shadow="never" class="settings-card" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <el-icon><InfoFilled /></el-icon>
          <span>使用说明</span>
        </div>
      </template>
      
      <el-alert type="info" :closable="false" title="FTP配置说明" show-icon>
        <ul class="help-list">
          <li>请填写正确的FTP服务器地址、端口、用户名和密码</li>
          <li>端口默认为21（FTP）或990（FTPS隐式加密）</li>
          <li>根目录路径用于限定浏览范围，默认为 / 表示FTP根目录</li>
          <li>启用FTPS后，服务器需要支持SSL/TLS加密连接</li>
          <li>配置完成后，请在"图像浏览"页面查看FTP中的图片和视频</li>
        </ul>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, Check, InfoFilled } from '@element-plus/icons-vue'
import api from '../api'

const formRef = ref(null)
const testing = ref(false)
const saving = ref(false)

const form = reactive({
  host: '',
  port: 21,
  user: '',
  password: '',
  passwordSet: false,
  rootPath: '/',
  secure: false
})

const rules = {
  host: [{ required: true, message: '请输入FTP服务器地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  user: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
}

const loadConfig = async () => {
  try {
    const res = await api.get('/config/ftp')
    const config = res.config
    form.host = config.host || ''
    form.port = config.port || 21
    form.user = config.user || ''
    form.password = ''
    form.passwordSet = config.passwordSet || false
    form.rootPath = config.rootPath || '/'
    form.secure = config.secure || false
  } catch (error) {
    // 错误已处理
  }
}

const testConnection = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    testing.value = true
    try {
      const res = await api.post('/config/ftp/test', {
        host: form.host,
        port: form.port,
        user: form.user,
        password: form.password || undefined,
        secure: form.secure
      })
      
      if (res.success) {
        ElMessage.success(res.message)
      } else {
        ElMessage.error(res.message)
      }
    } catch (error) {
      // 错误已处理
    } finally {
      testing.value = false
    }
  })
}

const saveConfig = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    saving.value = true
    try {
      const data = {
        host: form.host,
        port: form.port,
        user: form.user,
        rootPath: form.rootPath,
        secure: form.secure
      }
      
      if (form.password) {
        data.password = form.password
      }
      
      const res = await api.put('/config/ftp', data)
      ElMessage.success('FTP配置保存成功')
      form.passwordSet = res.config.passwordSet
      form.password = ''
    } catch (error) {
      // 错误已处理
    } finally {
      saving.value = false
    }
  })
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.settings-page {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.help-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
  line-height: 1.8;
}

.help-list li {
  margin-bottom: 4px;
}
</style>
