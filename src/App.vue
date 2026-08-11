<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  authStore.initFromStorage()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  color: #1A1A1A;
  font-size: 14px;
}

/* WeChat-style scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #C0C0C0;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #A0A0A0;
}

/* Element Plus WeChat style overrides */
.el-button--primary {
  background-color: #07C160;
  border-color: #07C160;
}

.el-button--primary:hover {
  background-color: #06AD56;
  border-color: #06AD56;
}

.el-button--primary:active {
  background-color: #059748;
  border-color: #059748;
}

.el-button--primary.is-plain {
  background-color: #F0FBF4;
  border-color: #07C160;
  color: #07C160;
}

.el-button--primary.is-plain:hover {
  background-color: #07C160;
  color: #fff;
}

.el-tag--primary {
  background-color: #07C160;
  border-color: #07C160;
}

.el-radio__input.is-checked .el-radio__inner {
  background-color: #07C160;
  border-color: #07C160;
}

.el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: #07C160;
  border-color: #07C160;
}

.el-checkbox__input.is-indeterminate .el-checkbox__inner {
  background-color: #07C160;
  border-color: #07C160;
}

.el-input__wrapper.is-focus {
  box-shadow: 0 0 0 1px #07C160 inset;
}

.el-card {
  border: none;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.el-dialog {
  border-radius: 12px;
}

.el-dialog__header {
  border-bottom: 1px solid #EDEDED;
  padding: 16px 20px;
}

.el-dialog__body {
  padding: 20px;
}

.el-table th.el-table__cell {
  background-color: #F7F7F7;
  color: #5A5A5A;
  font-weight: 600;
}

.el-menu-item.is-active {
  color: #07C160 !important;
}
</style>
