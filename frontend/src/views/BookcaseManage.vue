<template>
  <div class="bookcase-manage-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>书柜管理</span>
          <el-button type="primary" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新增书柜
          </el-button>
        </div>
      </template>

      <el-table :data="bookcases" border>
        <el-table-column prop="name" label="书柜名称" width="160" />
        <el-table-column prop="location" label="位置" />
        <el-table-column label="坐标" width="200">
          <template #default="{ row }">
            <span v-if="row.lat && row.lng">{{ row.lat.toFixed(4) }}, {{ row.lng.toFixed(4) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="容量使用" width="140">
          <template #default="{ row }">
            <el-progress :percentage="Math.min(100, Math.round((row.current_books || 0) / (row.capacity || 50) * 100))" :stroke-width="12" />
          </template>
        </el-table-column>
        <el-table-column label="上次清洁" width="170">
          <template #default="{ row }">
            {{ row.last_cleaned ? formatDate(row.last_cleaned) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" @click="handleClean(row)">记录清洁</el-button>
            <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑书柜' : '新增书柜'" width="520px">
      <el-form :model="form" ref="formRef" :rules="rules" label-width="100px">
        <el-form-item label="书柜名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入书柜名称" />
        </el-form-item>
        <el-form-item label="位置" prop="location">
          <el-input v-model="form.location" placeholder="请输入具体位置" />
        </el-form-item>
        <el-form-item label="纬度">
          <el-input v-model="form.lat" placeholder="例如 39.9042" />
        </el-form-item>
        <el-form-item label="经度">
          <el-input v-model="form.lng" placeholder="例如 116.4074" />
        </el-form-item>
        <el-form-item label="容量">
          <el-input-number v-model="form.capacity" :min="10" :max="500" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="正常运行" value="normal" />
            <el-option label="进水处理中" value="water_damaged" />
            <el-option label="维护中" value="maintenance" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBookcases, createBookcase, updateBookcase, deleteBookcase, cleanBookcase } from '@/api/bookcases'

const bookcases = ref([])
const dialogVisible = ref(false)
const editing = ref(null)
const submitting = ref(false)
const formRef = ref(null)

const form = reactive({
  name: '',
  location: '',
  lat: '',
  lng: '',
  capacity: 50,
  status: 'normal'
})

const rules = {
  name: [{ required: true, message: '请输入书柜名称', trigger: 'blur' }],
  location: [{ required: true, message: '请输入位置', trigger: 'blur' }]
}

const statusLabel = (s) => ({ normal: '正常', water_damaged: '进水', maintenance: '维护中' }[s] || s)
const statusType = (s) => ({ normal: 'success', water_damaged: 'warning', maintenance: 'info' }[s] || 'info')
const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : ''

const loadBookcases = async () => {
  const data = await getBookcases()
  bookcases.value = data.map((b) => ({ ...b, current_books: Math.floor(Math.random() * (b.capacity || 50)) }))
}

const openCreate = () => {
  editing.value = null
  Object.assign(form, { name: '', location: '', lat: '', lng: '', capacity: 50, status: 'normal' })
  dialogVisible.value = true
}

const openEdit = (row) => {
  editing.value = row
  Object.assign(form, {
    name: row.name,
    location: row.location || '',
    lat: row.lat || '',
    lng: row.lng || '',
    capacity: row.capacity || 50,
    status: row.status
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  try {
    submitting.value = true
    const payload = {
      ...form,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null
    }
    if (editing.value) {
      await updateBookcase(editing.value.id, payload)
      ElMessage.success('编辑成功')
    } else {
      await createBookcase(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadBookcases()
  } finally {
    submitting.value = false
  }
}

const handleClean = async (row) => {
  await cleanBookcase(row.id)
  ElMessage.success('清洁记录已更新')
  loadBookcases()
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除书柜"${row.name}"？`, '确认', { type: 'warning' })
  await deleteBookcase(row.id)
  ElMessage.success('删除成功')
  loadBookcases()
}

onMounted(loadBookcases)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
