<template>
  <div class="book-list-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>图书列表</span>
          <div class="filters">
            <el-input v-model="keyword" placeholder="搜索书名/作者/ISBN" style="width: 240px" clearable @input="loadBooks">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 140px; margin-left: 12px" @change="loadBooks">
              <el-option label="待审核" value="donated" />
              <el-option label="已拒收" value="rejected" />
              <el-option label="待清洁" value="pending_clean" />
              <el-option label="转赠学校" value="transferred_school" />
              <el-option label="可借阅" value="available" />
              <el-option label="借阅中" value="borrowed" />
              <el-option label="破损" value="damaged" />
              <el-option label="维修中" value="repairing" />
              <el-option label="已下架" value="off_shelf" />
            </el-select>
            <el-select v-model="categoryFilter" placeholder="分类" clearable style="width: 140px; margin-left: 12px" @change="loadBooks">
              <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
            </el-select>
          </div>
        </div>
      </template>
      <el-row :gutter="16">
        <el-col v-for="book in books" :key="book.id" :xs="12" :sm="8" :md="6" :lg="4">
          <el-card class="book-card" shadow="hover" @click="showDetail(book)">
            <div class="book-cover">
              <el-icon :size="48" color="#667eea"><Collection /></el-icon>
            </div>
            <div class="book-info">
              <h4 class="book-title">{{ book.title }}</h4>
              <p class="book-author">{{ book.author || '佚名' }}</p>
              <div class="book-meta">
                <el-tag :type="statusType(book.status)" size="small" effect="light">{{ statusLabel(book.status) }}</el-tag>
                <span v-if="book.category" class="category">{{ book.category }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty v-if="books.length === 0" description="暂无图书" style="margin-top: 40px" />
    </el-card>

    <el-dialog v-model="detailVisible" :title="selectedBook?.title" width="640px">
      <div v-if="selectedBook" class="book-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="作者">{{ selectedBook.author || '-' }}</el-descriptions-item>
          <el-descriptions-item label="ISBN">{{ selectedBook.isbn || '-' }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ selectedBook.category || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(selectedBook.status)" size="small">{{ statusLabel(selectedBook.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="捐赠人">{{ selectedBook.donor_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="上架时间">{{ formatDate(selectedBook.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="简介" :span="2">{{ selectedBook.description || '暂无简介' }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="userStore.role === 'resident' && selectedBook.status === 'available'" class="actions">
          <el-button type="primary" :loading="borrowLoading" @click="handleBorrow">借阅此书</el-button>
        </div>

        <div v-if="userStore.role === 'volunteer' && selectedBook.status === 'donated'" class="actions">
          <el-button type="success" @click="openReview('shelf')">✅ 上架</el-button>
          <el-button type="warning" @click="openReview('clean')">🧹 待清洁</el-button>
          <el-button type="primary" @click="openReview('transfer')">🏫 转赠学校</el-button>
          <el-button type="danger" @click="openReview('reject')">❌ 拒收</el-button>
        </div>

        <div v-if="userStore.role === 'volunteer' && (selectedBook.status === 'borrowed' || selectedBook.status === 'damaged')" class="actions">
          <el-button type="warning" @click="openReturnDialog">归还登记</el-button>
        </div>

        <div v-if="activities.length > 0" style="margin-top: 20px">
          <h4>流转记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="a in activities"
              :key="a.id"
              :timestamp="formatDate(a.created_at)"
              :type="timelineType(a.to_status)"
            >
              {{ a.remark }}
              <span v-if="a.operator_name" class="operator">- {{ a.operator_name }}</span>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="reviewVisible" title="图书分级审核" width="560px" :close-on-click-modal="false">
      <el-form :model="reviewForm" label-width="100px">
        <el-divider content-position="left">评估信息</el-divider>
        <el-form-item label="图书品相" required>
          <el-radio-group v-model="reviewForm.condition">
            <el-radio label="good">完好</el-radio>
            <el-radio label="fair">一般</el-radio>
            <el-radio label="poor">破损</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否缺页" required>
          <el-radio-group v-model="reviewForm.missing_pages">
            <el-radio :label="false">完整无缺页</el-radio>
            <el-radio :label="true">存在缺页</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="内容类型" required>
          <el-select v-model="reviewForm.content_type" placeholder="请选择内容类型" style="width: 100%">
            <el-option label="文学小说" value="文学小说" />
            <el-option label="科技科普" value="科技科普" />
            <el-option label="历史传记" value="历史传记" />
            <el-option label="儿童读物" value="儿童读物" />
            <el-option label="社会科学" value="社会科学" />
            <el-option label="艺术设计" value="艺术设计" />
            <el-option label="生活健康" value="生活健康" />
            <el-option label="教辅教材" value="教辅教材" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="适读年龄" required>
          <el-select v-model="reviewForm.age_range" placeholder="请选择适读年龄" style="width: 100%">
            <el-option label="幼儿（0-6岁）" value="幼儿（0-6岁）" />
            <el-option label="儿童（7-12岁）" value="儿童（7-12岁）" />
            <el-option label="青少年（13-18岁）" value="青少年（13-18岁）" />
            <el-option label="成人（18岁以上）" value="成人（18岁以上）" />
            <el-option label="全年龄段" value="全年龄段" />
          </el-select>
        </el-form-item>
        <el-divider content-position="left">审核决定</el-divider>
        <el-form-item label="审核决定" required>
          <el-radio-group v-model="reviewForm.decision">
            <el-radio-button label="shelf">✅ 上架</el-radio-button>
            <el-radio-button label="clean">🧹 待清洁</el-radio-button>
            <el-radio-button label="transfer">🏫 转赠学校</el-radio-button>
            <el-radio-button label="reject">❌ 拒收</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="图书分类" v-if="reviewForm.decision === 'shelf'" required>
          <el-select v-model="reviewForm.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="文学小说" value="文学小说" />
            <el-option label="科技科普" value="科技科普" />
            <el-option label="历史传记" value="历史传记" />
            <el-option label="儿童读物" value="儿童读物" />
            <el-option label="社会科学" value="社会科学" />
            <el-option label="艺术设计" value="艺术设计" />
            <el-option label="生活健康" value="生活健康" />
            <el-option label="教辅教材" value="教辅教材" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="拒收原因" v-if="reviewForm.decision === 'reject'" required>
          <el-select v-model="reviewForm.reject_reason" placeholder="请选择或填写拒收原因" style="width: 100%" allow-create filterable>
            <el-option label="图书严重破损，无法修复" value="图书严重破损，无法修复" />
            <el-option label="严重缺页，影响阅读" value="严重缺页，影响阅读" />
            <el-option label="内容不适宜（非法/违规/低俗）" value="内容不适宜（非法/违规/低俗）" />
            <el-option label="教材/教辅版本过旧，已不适用" value="教材/教辅版本过旧，已不适用" />
            <el-option label="印刷质量差或为盗版" value="印刷质量差或为盗版" />
            <el-option label="其他原因" value="其他原因" />
          </el-select>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input v-model="reviewForm.comment" type="textarea" :rows="2" placeholder="请输入审核意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewLoading" @click="handleReview">提交审核</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="returnVisible" title="归还登记" width="480px">
      <el-form :model="returnForm" label-width="80px">
        <el-form-item label="图书状况">
          <el-radio-group v-model="returnForm.condition">
            <el-radio value="good">完好</el-radio>
            <el-radio value="fair">一般</el-radio>
            <el-radio value="poor">破损</el-radio>
            <el-radio value="missing_pages">缺页</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="归还照片URL">
          <el-input v-model="returnForm.return_photo" placeholder="可选，填写图片URL" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnVisible = false">取消</el-button>
        <el-button type="primary" :loading="returnLoading" @click="handleReturn">确认归还</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getBooks, getBook, borrowBook, reviewBook, returnBook } from '@/api/books'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const books = ref([])
const keyword = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')
const categories = ['文学古典', '外国文学', '当代文学', '现代文学', '儿童文学', '计算机']

const detailVisible = ref(false)
const selectedBook = ref(null)
const activities = ref([])

const borrowLoading = ref(false)

const reviewVisible = ref(false)
const reviewLoading = ref(false)
const reviewForm = reactive({ decision: 'shelf', condition: 'good', content_type: '', age_range: '', missing_pages: false, category: '', reject_reason: '', comment: '' })

const returnVisible = ref(false)
const returnLoading = ref(false)
const returnForm = reactive({ condition: 'good', return_photo: '' })

const statusLabel = (s) => {
  const map = { donated: '待审核', rejected: '已拒收', available: '可借阅', borrowed: '借阅中', damaged: '破损', repairing: '维修中', off_shelf: '已下架', pending_clean: '待清洁', transferred_school: '转赠学校' }
  return map[s] || s
}
const statusType = (s) => {
  const map = { donated: 'warning', rejected: 'danger', available: 'success', borrowed: 'primary', damaged: 'danger', repairing: 'warning', off_shelf: 'info', pending_clean: 'warning', transferred_school: 'primary' }
  return map[s] || 'info'
}
const timelineType = (s) => {
  if (['available', 'returned'].includes(s)) return 'success'
  if (['borrowed'].includes(s)) return 'primary'
  if (['donated'].includes(s)) return 'warning'
  if (['damaged', 'rejected'].includes(s)) return 'danger'
  return ''
}
const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : ''

const loadBooks = async () => {
  const params = {}
  if (keyword.value) params.keyword = keyword.value
  if (statusFilter.value) params.status = statusFilter.value
  if (categoryFilter.value) params.category = categoryFilter.value
  books.value = await getBooks(params)
}

const showDetail = async (book) => {
  selectedBook.value = book
  detailVisible.value = true
  try {
    const detail = await getBook(book.id)
    activities.value = detail.activities || []
  } catch (e) {
    activities.value = []
  }
}

const handleBorrow = async () => {
  try {
    borrowLoading.value = true
    await borrowBook(selectedBook.value.id)
    ElMessage.success('借阅成功')
    detailVisible.value = false
    loadBooks()
  } finally {
    borrowLoading.value = false
  }
}

const openReview = (decision) => {
  reviewForm.decision = decision || 'shelf'
  reviewForm.condition = decision === 'reject' ? 'poor' : 'good'
  reviewForm.content_type = ''
  reviewForm.age_range = ''
  reviewForm.missing_pages = decision === 'reject'
  reviewForm.category = ''
  reviewForm.reject_reason = decision === 'reject' ? '图书不符合上架标准' : ''
  reviewForm.comment = ''
  reviewVisible.value = true
}

const handleReview = async () => {
  if (!reviewForm.condition || !reviewForm.content_type || !reviewForm.age_range || !reviewForm.decision) {
    ElMessage.warning('请完整填写评估信息和审核决定')
    return
  }
  if (reviewForm.decision === 'shelf' && !reviewForm.category) {
    ElMessage.warning('决定上架时请选择图书分类')
    return
  }
  if (reviewForm.decision === 'reject' && !reviewForm.reject_reason) {
    ElMessage.warning('拒收图书必须说明拒收原因')
    return
  }
  try {
    reviewLoading.value = true
    await reviewBook(selectedBook.value.id, { ...reviewForm })
    ElMessage.success('审核提交成功')
    reviewVisible.value = false
    detailVisible.value = false
    loadBooks()
  } finally {
    reviewLoading.value = false
  }
}

const openReturnDialog = () => {
  returnForm.condition = 'good'
  returnForm.return_photo = ''
  returnVisible.value = true
}

const handleReturn = async () => {
  try {
    returnLoading.value = true
    const result = await returnBook(selectedBook.value.id, returnForm)
    let msg = '归还成功'
    if (result.fine > 0) {
      msg += `，产生逾期罚金 ¥${result.fine.toFixed(2)}`
    }
    ElMessage.success(msg)
    returnVisible.value = false
    detailVisible.value = false
    loadBooks()
  } finally {
    returnLoading.value = false
  }
}

onMounted(loadBooks)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filters {
  display: flex;
  align-items: center;
}
.book-card {
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}
.book-card:hover {
  transform: translateY(-4px);
}
.book-cover {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 6px;
  margin-bottom: 12px;
}
.book-info .book-title {
  font-size: 15px;
  margin: 0 0 4px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-info .book-author {
  font-size: 13px;
  color: #909399;
  margin: 0 0 8px;
}
.book-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.book-meta .category {
  font-size: 12px;
  color: #909399;
}
.book-detail .actions {
  margin-top: 16px;
  text-align: right;
}
.operator {
  color: #909399;
  margin-left: 6px;
  font-size: 12px;
}
</style>
