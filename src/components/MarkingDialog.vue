<template>
  <el-dialog
    v-model="visible"
    title="内容标记"
    width="500px"
    @close="handleClose"
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="标记标签">
        <el-input
          v-model="form.label"
          placeholder="输入标记标签，如：已审核、待处理"
          clearable
        />
      </el-form-item>
      
      <el-form-item label="标记颜色">
        <div class="color-picker-group">
          <div
            v-for="color in colors"
            :key="color"
            class="color-item"
            :class="{ active: form.color === color }"
            :style="{ backgroundColor: color }"
            @click="form.color = color"
          >
            <el-icon v-if="form.color === color"><Check /></el-icon>
          </div>
        </div>
      </el-form-item>
      
      <el-form-item label="标签">
        <div class="tags-container">
          <el-tag
            v-for="(tag, index) in form.tags"
            :key="index"
            closable
            @close="removeTag(index)"
            class="tag-item"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="tagInputVisible"
            ref="tagInputRef"
            v-model="tagInputValue"
            size="small"
            class="tag-input"
            @keyup.enter="addTag"
            @blur="addTag"
          />
          <el-button
            v-else
            size="small"
            class="tag-add-btn"
            @click="showTagInput"
          >
            + 添加标签
          </el-button>
        </div>
      </el-form-item>
      
      <el-form-item label="备注">
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="3"
          placeholder="添加备注信息..."
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        v-if="hasExistingMarking"
        type="danger"
        @click="handleDelete"
      >
        删除标记
      </el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import api from '../api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  filePath: { type: String, default: '' },
  fileName: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const visible = ref(props.modelValue)
const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref(null)
const hasExistingMarking = ref(false)

const colors = [
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C',
  '#909399', '#9C27B0', '#00BCD4', '#FF9800'
]

const form = reactive({
  label: '',
  color: '#409EFF',
  note: '',
  tags: []
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.filePath) {
    fetchMarking()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const fetchMarking = async () => {
  try {
    const res = await api.get('/files/marking', { params: { path: props.filePath } })
    if (res.marking) {
      form.label = res.marking.label || ''
      form.color = res.marking.color || '#409EFF'
      form.note = res.marking.note || ''
      form.tags = res.marking.tags || []
      hasExistingMarking.value = true
    } else {
      resetForm()
      hasExistingMarking.value = false
    }
  } catch (error) {
    resetForm()
  }
}

const resetForm = () => {
  form.label = ''
  form.color = '#409EFF'
  form.note = ''
  form.tags = []
}

const showTagInput = () => {
  tagInputVisible.value = true
  nextTick(() => {
    tagInputRef.value?.input?.focus()
  })
}

const addTag = () => {
  if (tagInputValue.value.trim()) {
    if (!form.tags.includes(tagInputValue.value.trim())) {
      form.tags.push(tagInputValue.value.trim())
    }
  }
  tagInputVisible.value = false
  tagInputValue.value = ''
}

const removeTag = (index) => {
  form.tags.splice(index, 1)
}

const handleSave = async () => {
  try {
    const res = await api.post('/files/marking', {
      path: props.filePath,
      label: form.label,
      color: form.color,
      note: form.note,
      tags: form.tags
    })
    ElMessage.success('标记保存成功')
    emit('saved', res.marking)
    visible.value = false
  } catch (error) {
    // 错误已处理
  }
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除此文件的标记吗？', '提示', {
      type: 'warning'
    })
    await api.delete('/files/marking', { params: { path: props.filePath } })
    ElMessage.success('标记已删除')
    emit('deleted')
    visible.value = false
  } catch (error) {
    if (error !== 'cancel') {
      // 错误已处理
    }
  }
}

const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
.color-picker-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-item {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.color-item:hover {
  transform: scale(1.1);
}

.color-item.active {
  border-color: #303133;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag-item {
  margin: 0;
}

.tag-input {
  width: 100px;
}

.tag-add-btn {
  border-style: dashed;
}
</style>
