<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <el-icon :size="48" color="#667eea"><Reading /></el-icon>
        <h1>共享书柜平台</h1>
        <p>连接社区 · 共享知识</p>
      </div>
      <el-form :model="form" ref="formRef" :rules="rules" label-width="80px" @submit.prevent="handleLogin">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="form.role">
            <el-radio value="resident">居民</el-radio>
            <el-radio value="volunteer">志愿者</el-radio>
            <el-radio value="property">物业</el-radio>
            <el-radio value="ngo">公益组织</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-button type="primary" :loading="loading" class="login-btn" @click="handleLogin">登 录</el-button>
      </el-form>
      <div class="demo-accounts">
        <p class="title">测试账号（密码均为 123456）：</p>
        <el-tag size="small" type="success">resident1</el-tag>
        <el-tag size="small" type="warning">volunteer1</el-tag>
        <el-tag size="small" type="primary">property1</el-tag>
        <el-tag size="small" type="danger">ngo1</el-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  role: 'resident'
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  try {
    loading.value = true
    await userStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/map')
  } catch (e) {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.login-header {
  text-align: center;
  margin-bottom: 32px;
}
.login-header h1 {
  margin: 12px 0 6px;
  font-size: 24px;
  color: #333;
}
.login-header p {
  color: #999;
  margin: 0;
  font-size: 14px;
}
.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}
.demo-accounts {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}
.demo-accounts .title {
  font-size: 13px;
  color: #666;
  margin-bottom: 10px;
}
.demo-accounts .el-tag {
  margin-right: 8px;
}
</style>
