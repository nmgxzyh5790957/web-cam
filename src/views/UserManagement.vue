<template>
  <div class="user-management">
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>
        添加用户
      </el-button>
    </div>
    
    <el-card shadow="never">
      <el-table :data="users" v-loading="loading" style="width: 100%">
        <el-table-column label="用户名" prop="username" width="150" />
        <el-table-column label="昵称" prop="nickname" width="150" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限" min-width="250">
          <template #default="{ row }">
            <el-tag
              v-for="perm in row.permissions"
              :key="perm"
              size="small"
              class="perm-tag"
            >
              {{ getPermissionText(perm) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link @click="openDialog(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              size="small"
              link
              type="danger"
              :disabled="row.username === 'admin'"
              @click="handleDelete(row)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 用户表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingUser ? '编辑用户' : '添加用户'"
      width="550px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="90px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            :disabled="!!editingUser"
          />
        </el-form-item>
        
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="请输入昵称" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="editingUser ? '不修改请留空' : '请输入密码'"
          />
        </el-form-item>
        
        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="form.role" @change="onRoleChange">
            <el-radio value="admin">管理员</el-radio>
            <el-radio value="editor">编辑</el-radio>
            <el-radio value="viewer">访客</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="权限">
          <el-checkbox-group v-model="form.permissions">
            <el-checkbox value="view">浏览文件</el-checkbox>
            <el-checkbox value="delete">删除文件</el-checkbox>
            <el-checkbox value="mark">标记内容</el-checkbox>
            <el-checkbox value="view_logs">操作日志</el-checkbox>
            <el-checkbox value="manage_users">用户管理</el-checkbox>
            <el-checkbox value="manage_config">系统设置</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            active-value="active"
            inactive-value="disabled"
            active-text="正常"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import api from '../api'

const loading = ref(false)
const saving = ref(false)
const users = ref([])
const dialogVisible = ref(false)
const editingUser = ref(null)
const formRef = ref(null)

const form = reactive({
  username: '',
  nickname: '',
  password: '',
  role: 'viewer',
  permissions: ['view'],
  status: 'active'
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度3-20个字符', trigger: 'blur' }
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' }
  ],
  password: [
    {
      validator: (rule, value, callback) => {
        if (!editingUser.value && !value) {
          callback(new Error('请输入密码'))
        } else if (value && value.length < 6) {
          callback(new Error('密码至少6个字符'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const rolePermissions = {
  admin: ['view', 'delete', 'mark', 'view_logs', 'manage_users', 'manage_config'],
  editor: ['view', 'delete', 'mark', 'view_logs'],
  viewer: ['view', 'view_logs']
}

const getRoleText = (role) => {
  return { admin: '管理员', editor: '编辑', viewer: '访客' }[role] || '未知'
}

const getRoleTagType = (role) => {
  return { admin: 'danger', editor: 'warning', viewer: 'info' }[role] || 'info'
}

const getPermissionText = (perm) => {
  return {
    view: '浏览',
    delete: '删除',
    mark: '标记',
    view_logs: '操作日志',
    manage_users: '用户管理',
    manage_config: '系统设置'
  }[perm] || perm
}

const onRoleChange = (role) => {
  form.permissions = [...rolePermissions[role]]
}

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await api.get('/users')
    users.value = res.users || []
  } catch (error) {
    users.value = []
  } finally {
    loading.value = false
  }
}

const openDialog = (user = null) => {
  editingUser.value = user
  if (user) {
    form.username = user.username
    form.nickname = user.nickname
    form.password = ''
    form.role = user.role
    form.permissions = [...user.permissions]
    form.status = user.status
  } else {
    form.username = ''
    form.nickname = ''
    form.password = ''
    form.role = 'viewer'
    form.permissions = ['view']
    form.status = 'active'
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    saving.value = true
    try {
      const data = {
        username: form.username,
        nickname: form.nickname,
        role: form.role,
        permissions: form.permissions,
        status: form.status
      }
      
      if (form.password) {
        data.password = form.password
      }
      
      if (editingUser.value) {
        await api.put(`/users/${editingUser.value.id}`, data)
        ElMessage.success('用户更新成功')
      } else {
        await api.post('/users', data)
        ElMessage.success('用户创建成功')
      }
      
      dialogVisible.value = false
      loadUsers()
    } catch (error) {
      // 错误已处理
    } finally {
      saving.value = false
    }
  })
}

const handleDelete = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.nickname}" (${user.username}) 吗？`,
      '删除确认',
      { type: 'warning' }
    )
    await api.delete(`/users/${user.id}`)
    ElMessage.success('用户删除成功')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      // 错误已处理
    }
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

loadUsers()
</script>

<style scoped>
.user-management {
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

.perm-tag {
  margin: 2px;
  color: #fff;
}
</style>
