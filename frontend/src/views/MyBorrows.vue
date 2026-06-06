<template>
  <div class="my-borrows-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>我的借阅</span>
          <div class="tabs">
            <el-radio-group v-model="tab" @change="loadBorrows">
              <el-radio-button label="active">借阅中</el-radio-button>
              <el-radio-button label="history">历史记录</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <el-table v-if="tab === 'active'" :data="activeBorrows">
        <el-table-column label="书名">
          <template #default="{ row }">
            <span class="book-title">{{ row.book_title || '图书 #' + row.book_id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="借阅时间" width="180">
          <template #default="{ row }">{{ formatDate(row.borrow_date) }}</template>
        </el-table-column>
        <el-table-column label="应还日期" width="180">
          <template #default="{ row }">
            <span :class="{ overdue: isOverdue(row) }">{{ formatDate(row.due_date) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="isOverdue(row) ? 'danger' : 'primary'" size="small">
              {{ isOverdue(row) ? '已逾期' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预计罚金" width="100">
          <template #default="{ row }">
            <span v-if="isOverdue(row)" class="fine">¥{{ calcFine(row).toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button type="warning" size="small" @click="openReturn(row)">归还登记</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-table v-else :data="historyBorrows">
        <el-table-column label="书名">
          <template #default="{ row }">
            <span class="book-title">{{ row.book_title || '图书 #' + row.book_id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="借阅时间" width="180">
          <template #default="{ row }">{{ formatDate(row.borrow_date) }}</template>
        </el-table-column>
        <el-table-column label="归还时间" width="180">
          <template #default="{ row }">{{ formatDate(row.return_date) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'overdue' ? 'warning' : 'success'" size="small">
              {{ row.status === 'overdue' ? '逾期归还' : '按期归还' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="罚金" width="100">
          <template #default="{ row }">
            <span v-if="row.overdue_fine > 0" class="fine">¥{{ row.overdue_fine.toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="(tab === 'active' ? activeBorrows : historyBorrows).length === 0" description="暂无记录" style="margin-top: 40px" />
    </el-card>

    <el-dialog v-model="returnVisible" title="归还登记" width="480px">
      <el-form :model="returnForm" label-width="100px">
        <el-form-item label="图书状况">
          <el-radio-group v-model="returnForm.condition">
            <el-radio value="good">完好</el-radio>
            <el-radio value="fair">一般</el-radio>
            <el-radio value="poor">破损</el-radio>
            <el-radio value="missing_pages">缺页</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="归还照片">
          <el-input v-model="returnForm.return_photo" placeholder="请输入照片URL（可选）" />
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
import { getBook, returnBook, getBooks } from '@/api/books'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const tab = ref('active')
const activeBorrows = ref([])
const historyBorrows = ref([])

const returnVisible = ref(false)
const returnLoading = ref(false)
const currentBookId = ref(null)
const returnForm = reactive({ condition: 'good', return_photo: '' })

const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : ''
const isOverdue = (row) => new Date() > new Date(row.due_date) && !row.return_date
const calcFine = (row) => {
  if (!isOverdue(row)) return 0
  const days = Math.ceil((new Date() - new Date(row.due_date)) / (24 * 60 * 60 * 1000))
  return days * 0.5
}

const loadBorrows = async () => {
  const books = await getBooks()
  const active = []
  const history = []
  for (const book of books) {
    try {
      const detail = await getBook(book.id)
      const myBorrows = (detail.borrows || []).filter((b) => b.user_id === userStore.userId)
      for (const br of myBorrows) {
        const record = { ...br, book_title: book.title }
        if (br.status === 'active' || br.status === 'overdue') {
          if (!br.return_date) active.push(record)
          else history.push(record)
        } else {
          history.push(record)
        }
      }
    } catch (e) {}
  }
  activeBorrows.value = active
  historyBorrows.value = history
}

const openReturn = (row) => {
  currentBookId.value = row.book_id
  returnForm.condition = 'good'
  returnForm.return_photo = ''
  returnVisible.value = true
}

const handleReturn = async () => {
  try {
    returnLoading.value = true
    const result = await returnBook(currentBookId.value, returnForm)
    let msg = '归还成功'
    if (result.fine > 0) msg += `，产生逾期罚金 ¥${result.fine.toFixed(2)}`
    ElMessage.success(msg)
    returnVisible.value = false
    loadBorrows()
  } finally {
    returnLoading.value = false
  }
}

onMounted(loadBorrows)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.book-title {
  font-weight: 500;
  color: #303133;
}
.overdue {
  color: #f56c6c;
  font-weight: 500;
}
.fine {
  color: #e6a23c;
  font-weight: 500;
}
</style>
