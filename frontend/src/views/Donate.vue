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
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="showDetail(row)">查看详情</el-button>
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
            <el-step title="志愿者审核" description="志愿者将根据图书品相、内容类型、适读年龄和是否缺页综合评估" />
            <el-step title="分级处理" description="审核结果分为：上架可借阅、待清洁后上架、转赠学校、拒收四种" />
            <el-step title="结果反馈" description="您可在捐赠记录中查看审核结果，拒收图书将说明具体原因" />
            <el-step title="图书流通" description="审核通过的图书将进入借阅流通，供社区居民共享阅读" />
          </el-steps>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="detailVisible" title="捐赠详情" width="560px">
      <div v-if="selectedDonation">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="书名">{{ selectedDonation.title }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ selectedDonation.author || '-' }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ selectedDonation.category || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="reviewStatusType(selectedDonation.status)" size="small">{{ reviewLabel(selectedDonation.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="捐赠时间" :span="2">{{ formatDate(selectedDonation.created_at) }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedDonation.donation && selectedDonation.donation.review_status !== 'pending'" style="margin-top: 20px">
          <h4 style="margin: 0 0 12px">审核信息</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="审核决定">
              <el-tag :type="decisionType(selectedDonation.donation.review_decision)" size="small">{{ decisionLabel(selectedDonation.donation.review_decision) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="图书品相">{{ conditionLabel(selectedDonation.donation.condition) }}</el-descriptions-item>
            <el-descriptions-item label="是否缺页">{{ selectedDonation.donation.missing_pages ? '是' : '否' }}</el-descriptions-item>
            <el-descriptions-item label="内容类型">{{ selectedDonation.donation.content_type || '-' }}</el-descriptions-item>
            <el-descriptions-item label="适读年龄">{{ selectedDonation.donation.age_range || '-' }}</el-descriptions-item>
            <el-descriptions-item label="审核备注">{{ selectedDonation.donation.review_comment || '-' }}</el-descriptions-item>
          </el-descriptions>

          <el-alert
            v-if="selectedDonation.donation.review_decision === 'reject'"
            :title="`拒收原因：${selectedDonation.donation.reject_reason || '未填写'}`"
            type="error"
            show-icon
            :closable="false"
            style="margin-top: 16px"
          />
          <el-alert
            v-else-if="selectedDonation.donation.review_decision === 'clean'"
            title="图书清洁后将上架，请耐心等待"
            type="warning"
            show-icon
            :closable="false"
            style="margin-top: 16px"
          />
          <el-alert
            v-else-if="selectedDonation.donation.review_decision === 'transfer'"
            title="图书将转赠合作学校，感谢您的爱心"
            type="info"
            show-icon
            :closable="false"
            style="margin-top: 16px"
          />
          <el-alert
            v-else-if="selectedDonation.donation.review_decision === 'shelf'"
            title="图书已上架，欢迎借阅和推广"
            type="success"
            show-icon
            :closable="false"
            style="margin-top: 16px"
          />
        </div>

        <div v-else style="margin-top: 20px">
          <el-alert title="志愿者正在审核中，请耐心等待" type="info" show-icon :closable="false" />
        </div>
      </div>
    </el-dialog>
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
const detailVisible = ref(false)
const selectedDonation = ref(null)

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
  const map = { donated: 'warning', rejected: 'danger', available: 'success', borrowed: 'primary', damaged: 'danger', pending_clean: 'warning', transferred_school: 'primary' }
  return map[s] || 'info'
}
const reviewLabel = (s) => {
  const map = { donated: '待审核', rejected: '已拒收', available: '已上架', borrowed: '借阅中', damaged: '破损', pending_clean: '待清洁', transferred_school: '转赠学校' }
  return map[s] || s
}
const decisionType = (d) => {
  const map = { shelf: 'success', clean: 'warning', transfer: 'primary', reject: 'danger' }
  return map[d] || 'info'
}
const decisionLabel = (d) => {
  const map = { shelf: '上架可借阅', clean: '待清洁后上架', transfer: '转赠学校', reject: '拒收' }
  return map[d] || d
}
const conditionLabel = (c) => {
  const map = { good: '完好', fair: '一般', poor: '破损', missing_pages: '缺页' }
  return map[c] || c || '-'
}
const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : ''

const loadMyDonations = async () => {
  const all = await getBooks()
  myDonations.value = all.filter((b) => b.donor_id === userStore.userId)
}

const showDetail = (row) => {
  selectedDonation.value = row
  detailVisible.value = true
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
