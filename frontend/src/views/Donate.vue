<template>
  <div class="donate-page">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>捐赠新图书</span>
          </template>
          <el-form :model="form" ref="formRef" :rules="rules" label-width="100px">
            <el-form-item label="书名" prop="title">
              <el-input v-model="form.title" placeholder="请输入书名" />
            </el-form-item>
            <el-form-item label="作者" prop="author">
              <el-input v-model="form.author" placeholder="请输入作者" />
            </el-form-item>
            <el-form-item label="ISBN">
              <el-input v-model="form.isbn" placeholder="请输入ISBN（可选）" />
            </el-form-item>
            <el-form-item label="分类">
              <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
                <el-option label="文学古典" value="文学古典" />
                <el-option label="外国文学" value="外国文学" />
                <el-option label="当代文学" value="当代文学" />
                <el-option label="现代文学" value="现代文学" />
                <el-option label="儿童文学" value="儿童文学" />
                <el-option label="计算机" value="计算机" />
                <el-option label="历史" value="历史" />
                <el-option label="哲学" value="哲学" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
            <el-form-item label="简介">
              <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入图书简介（可选）" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="handleSubmit">提交捐赠</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>我的捐赠记录</span>
          </template>
          <el-table :data="myDonations">
            <el-table-column prop="title" label="书名" />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column label="审核状态" width="120">
              <template #default="{ row }">
                <el-tag :type="reviewStatusType(row.status)" size="small">{{ reviewLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="捐赠时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="myDonations.length === 0" description="暂无捐赠记录" style="margin-top: 20px" />
        </el-card>

        <el-card style="margin-top: 20px">
          <template #header>
            <span>捐赠须知</span>
          </template>
          <el-steps direction="vertical" :active="5" finish-status="success">
            <el-step title="提交捐赠" description="填写图书基本信息，提交捐赠申请" />
            <el-step title="志愿者审核" description="志愿者对图书品相进行审核，缺页或严重破损的图书将被拒绝" />
            <el-step title="分类上架" description="审核通过后，志愿者将图书分类上架到书柜" />
            <el-step title="图书流通" description="图书进入借阅状态，供社区居民共享阅读" />
            <el-step title="破损处理" description="归还时如发现破损，将进入维修流程或安排赔付" />
          </el-steps>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { createBook, getBooks } from '@/api/books'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const formRef = ref(null)
const submitting = ref(false)
const myDonations = ref([])

const form = reactive({
  title: '',
  author: '',
  isbn: '',
  category: '',
  description: ''
})

const rules = {
  title: [{ required: true, message: '请输入书名', trigger: 'blur' }]
}

const reviewStatusType = (s) => {
  const map = { donated: 'warning', rejected: 'danger', available: 'success', borrowed: 'primary', damaged: 'danger' }
  return map[s] || 'info'
}
const reviewLabel = (s) => {
  const map = { donated: '待审核', rejected: '已拒绝', available: '已上架', borrowed: '借阅中', damaged: '破损' }
  return map[s] || s
}
const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : ''

const loadMyDonations = async () => {
  const all = await getBooks()
  myDonations.value = all.filter((b) => b.donor_id === userStore.userId)
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  try {
    submitting.value = true
    await createBook(form)
    ElMessage.success('捐赠提交成功，等待志愿者审核')
    resetForm()
    loadMyDonations()
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  form.title = ''
  form.author = ''
  form.isbn = ''
  form.category = ''
  form.description = ''
  formRef.value?.resetFields()
}

onMounted(loadMyDonations)
</script>
