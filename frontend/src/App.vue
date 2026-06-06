<template>
  <el-container v-if="userStore.isLoggedIn" class="app-container">
    <el-header class="app-header">
      <div class="logo">
        <el-icon :size="28"><Reading /></el-icon>
        <span class="title">图书共享平台</span>
      </div>
      <el-menu
        mode="horizontal"
        :default-active="activeMenu"
        router
        class="app-menu"
        background-color="transparent"
        text-color="#fff"
        active-text-color="#ffd04b"
      >
        <el-menu-item index="/map">
          <el-icon><Location /></el-icon>
          <span>书柜地图</span>
        </el-menu-item>
        <el-menu-item index="/books">
          <el-icon><Collection /></el-icon>
          <span>图书列表</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.role === 'resident'" index="/donate">
          <el-icon><Present /></el-icon>
          <span>捐赠图书</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.role === 'resident'" index="/my-borrows">
          <el-icon><Tickets /></el-icon>
          <span>我的借阅</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.role === 'volunteer'" index="/tasks">
          <el-icon><List /></el-icon>
          <span>任务看板</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.role === 'property'" index="/bookcases">
          <el-icon><OfficeBuilding /></el-icon>
          <span>书柜管理</span>
        </el-menu-item>
        <el-menu-item v-if="userStore.role === 'ngo'" index="/statistics">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据统计</span>
        </el-menu-item>
      </el-menu>
      <div class="user-info">
        <el-tag :type="roleTagType" size="small">{{ userStore.roleLabel }}</el-tag>
        <span class="username">{{ userStore.username }}</span>
        <el-button type="danger" size="small" plain @click="handleLogout">退出</el-button>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
  <router-view v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)

const roleTagType = computed(() => {
  const map = {
    resident: 'success',
    volunteer: 'warning',
    property: 'primary',
    ngo: 'danger'
  }
  return map[userStore.role] || 'info'
})

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}

.app-container {
  height: 100%;
}

.app-header {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0 20px;
  color: #fff;
  height: 60px;
}

.logo {
  display: flex;
  align-items: center;
  margin-right: 40px;
}

.title {
  font-size: 20px;
  font-weight: bold;
  margin-left: 10px;
}

.app-menu {
  flex: 1;
  border-bottom: none;
  background: transparent !important;
}

.app-menu .el-menu-item {
  border-bottom: none !important;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  color: #fff;
}

.app-main {
  background: #f5f7fa;
  padding: 20px;
}
</style>
