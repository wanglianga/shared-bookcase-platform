<template>
  <div class="task-board-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>志愿者任务看板</span>
          <div class="filters">
            <el-radio-group v-model="viewMode" @change="loadTasks">
              <el-radio-button label="all">全部任务</el-radio-button>
              <el-radio-button label="my">我的任务</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <el-row :gutter="16">
        <el-col :span="8">
          <div class="task-column">
            <div class="column-header pending">
              <el-icon><Clock /></el-icon>
              <span>待领取</span>
              <el-badge :value="pendingTasks.length" class="badge" />
            </div>
            <div class="task-list">
              <el-card v-for="t in pendingTasks" :key="t.id" class="task-card" shadow="hover">
                <div class="task-type">
                  <el-tag :type="typeTag(t.type)" size="small">{{ typeLabel(t.type) }}</el-tag>
                </div>
                <div class="task-desc">{{ t.description }}</div>
                <div class="task-meta">
                  <span v-if="t.book_title" class="meta-item">📖 {{ t.book_title }}</span>
                  <span v-if="t.bookcase_name" class="meta-item">📍 {{ t.bookcase_name }}</span>
                </div>
                <div class="task-footer">
                  <el-button type="primary" size="small" :loading="claimingId === t.id" @click="handleClaim(t)">领取任务</el-button>
                </div>
              </el-card>
              <el-empty v-if="pendingTasks.length === 0" description="暂无待领取任务" :image-size="80" />
            </div>
          </div>
        </el-col>

        <el-col :span="8">
          <div class="task-column">
            <div class="column-header processing">
              <el-icon><Loading /></el-icon>
              <span>进行中</span>
              <el-badge :value="processingTasks.length" class="badge" />
            </div>
            <div class="task-list">
              <el-card v-for="t in processingTasks" :key="t.id" class="task-card" shadow="hover">
                <div class="task-type">
                  <el-tag :type="typeTag(t.type)" size="small">{{ typeLabel(t.type) }}</el-tag>
                  <el-tag v-if="t.assignee_name" type="info" size="small" effect="plain" style="margin-left: 6px">{{ t.assignee_name }}</el-tag>
                </div>
                <div class="task-desc">{{ t.description }}</div>
                <div class="task-meta">
                  <span v-if="t.book_title" class="meta-item">📖 {{ t.book_title }}</span>
                  <span v-if="t.bookcase_name" class="meta-item">📍 {{ t.bookcase_name }}</span>
                  <span v-if="t.due_date" class="meta-item due">⏰ {{ formatDate(t.due_date) }}</span>
                </div>
                <div class="task-footer">
                  <el-button type="success" size="small" :loading="completingId === t.id" @click="handleCompleteClick(t)">完成任务</el-button>
                </div>
              </el-card>
              <el-empty v-if="processingTasks.length === 0" description="暂无进行中任务" :image-size="80" />
            </div>
          </div>
        </el-col>

        <el-col :span="8">
          <div class="task-column">
            <div class="column-header completed">
              <el-icon><CircleCheck /></el-icon>
              <span>已完成</span>
              <el-badge :value="completedTasks.length" class="badge" />
            </div>
            <div class="task-list">
              <el-card v-for="t in completedTasks" :key="t.id" class="task-card done">
                <div class="task-type">
                  <el-tag :type="typeTag(t.type)" size="small" effect="plain">{{ typeLabel(t.type) }}</el-tag>
                  <el-tag v-if="t.assignee_name" type="success" size="small" effect="plain" style="margin-left: 6px">{{ t.assignee_name }}</el-tag>
                </div>
                <div class="task-desc">{{ t.description }}</div>
                <div class="task-meta">
                  <span v-if="t.book_title" class="meta-item">📖 {{ t.book_title }}</span>
                  <span v-if="t.bookcase_name" class="meta-item">📍 {{ t.bookcase_name }}</span>
                </div>
                <div class="task-footer completed-time">
                  完成于 {{ formatDate(t.created_at) }}
                </div>
              </el-card>
              <el-empty v-if="completedTasks.length === 0" description="暂无已完成任务" :image-size="80" />
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-dialog v-model="reviewDialogVisible" title="图书分级审核" width="620px" :close-on-click-modal="false">
      <el-form :model="reviewForm" label-width="100px">
        <el-form-item label="图书名称">
          <span>{{ currentTask?.book_title }}</span>
        </el-form-item>

        <el-divider content-position="left">评估信息</el-divider>

        <el-form-item label="图书品相" required>
          <el-radio-group v-model="reviewForm.condition">
            <el-radio label="good">完好（9成新以上）</el-radio>
            <el-radio label="fair">一般（有正常使用痕迹）</el-radio>
            <el-radio label="poor">破损（封面/书脊有损伤）</el-radio>
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
            <el-radio-button label="shelf">✅ 上架可借阅</el-radio-button>
            <el-radio-button label="clean">🧹 待清洁后上架</el-radio-button>
            <el-radio-button label="transfer">🏫 转赠学校</el-radio-button>
            <el-radio-button label="reject">❌ 拒收</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="说明" required>
          <div class="decision-hint">
            <el-tag v-if="reviewForm.decision === 'shelf'" type="success" effect="light">品相完好、内容合适，直接进入书柜流通</el-tag>
            <el-tag v-else-if="reviewForm.decision === 'clean'" type="warning" effect="light">图书略有污渍，清洁后可上架，系统将自动生成清洁任务</el-tag>
            <el-tag v-else-if="reviewForm.decision === 'transfer'" type="primary" effect="light">图书适合但社区存量较多，转赠给合作学校，系统将自动生成转赠任务</el-tag>
            <el-tag v-else-if="reviewForm.decision === 'reject'" type="danger" effect="light">图书破损严重/内容不适/严重缺页，拒收并反馈给捐赠居民</el-tag>
          </div>
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

        <el-form-item label="放置书柜" v-if="reviewForm.decision === 'shelf'">
          <el-select v-model="reviewForm.bookcase_id" placeholder="选择书柜（可选）" style="width: 100%" clearable>
            <el-option v-for="bc in bookcases" :key="bc.id" :label="`${bc.name}（${bc.location}，容量 ${bc.current_count || 0}/${bc.capacity}）`" :value="bc.id" />
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

        <el-form-item label="审核备注">
          <el-input v-model="reviewForm.comment" type="textarea" :rows="2" placeholder="可选：填写详细审核意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="completingId === currentTask?.id" @click="submitReview">
          确认审核
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="repairDialogVisible" title="破损维修处理" width="520px" :close-on-click-modal="false">
      <el-form :model="repairForm" label-width="100px">
        <el-form-item label="图书名称">
          <span>{{ currentTask?.book_title }}</span>
        </el-form-item>
        <el-form-item label="处理结果" required>
          <el-radio-group v-model="repairForm.status">
            <el-radio label="completed">✅ 已修复</el-radio>
            <el-radio label="written_off">🗑️ 已注销（无法修复）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="维修费用">
          <el-input-number v-model="repairForm.repair_cost" :min="0" :precision="2" :step="1" /> 元
        </el-form-item>
        <el-form-item label="费用承担">
          <el-radio-group v-model="repairForm.paid_by">
            <el-radio label="resident">借阅居民承担</el-radio>
            <el-radio label="community">社区公共基金</el-radio>
            <el-radio label="volunteer">志愿者捐助</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="repairDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="completingId === currentTask?.id" @click="submitRepair">
          确认处理
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getTasks, getMyTasks, claimTask, completeTask } from '@/api/tasks'
import { getBookcases } from '@/api/bookcases'

const viewMode = ref('all')
const tasks = ref([])
const claimingId = ref(null)
const completingId = ref(null)
const bookcases = ref([])

const reviewDialogVisible = ref(false)
const repairDialogVisible = ref(false)
const currentTask = ref(null)
const reviewForm = ref({ decision: 'shelf', condition: 'good', content_type: '', age_range: '', missing_pages: false, category: '', bookcase_id: null, reject_reason: '', comment: '' })
const repairForm = ref({ status: 'completed', repair_cost: 0, paid_by: 'community' })

const typeLabel = (t) => {
  const map = { review: '图书审核', shelf: '图书上架', inventory: '库存清点', clean: '书柜清洁', repair: '破损维修', transfer_school: '转赠学校' }
  return map[t] || t
}
const typeTag = (t) => {
  const map = { review: 'warning', shelf: 'primary', inventory: 'success', clean: 'info', repair: 'danger', transfer_school: 'primary' }
  return map[t] || 'info'
}
const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''

const pendingTasks = computed(() => tasks.value.filter((t) => t.status === 'pending'))
const processingTasks = computed(() => tasks.value.filter((t) => t.status === 'processing'))
const completedTasks = computed(() => tasks.value.filter((t) => t.status === 'completed'))

const loadTasks = async () => {
  tasks.value = viewMode.value === 'my' ? await getMyTasks() : await getTasks()
}
const loadBookcases = async () => {
  try {
    bookcases.value = await getBookcases()
  } catch (e) {
    bookcases.value = []
  }
}

const handleClaim = async (t) => {
  try {
    claimingId.value = t.id
    await claimTask(t.id)
    ElMessage.success('任务领取成功')
    loadTasks()
  } finally {
    claimingId.value = null
  }
}

const handleCompleteClick = (t) => {
  currentTask.value = t
  if (t.type === 'review') {
    reviewForm.value = { decision: 'shelf', condition: 'good', content_type: '', age_range: '', missing_pages: false, category: '', bookcase_id: null, reject_reason: '', comment: '' }
    reviewDialogVisible.value = true
  } else if (t.type === 'repair') {
    repairForm.value = { status: 'completed', repair_cost: 0, paid_by: 'community' }
    repairDialogVisible.value = true
  } else {
    handleComplete(t, {})
  }
}

const submitReview = async () => {
  if (!reviewForm.value.condition) {
    ElMessage.warning('请选择图书品相')
    return
  }
  if (reviewForm.value.missing_pages === undefined || reviewForm.value.missing_pages === null) {
    ElMessage.warning('请选择是否缺页')
    return
  }
  if (!reviewForm.value.content_type) {
    ElMessage.warning('请选择内容类型')
    return
  }
  if (!reviewForm.value.age_range) {
    ElMessage.warning('请选择适读年龄')
    return
  }
  if (!reviewForm.value.decision) {
    ElMessage.warning('请选择审核决定')
    return
  }
  if (reviewForm.value.decision === 'shelf' && !reviewForm.value.category) {
    ElMessage.warning('决定上架时请选择图书分类')
    return
  }
  if (reviewForm.value.decision === 'reject' && !reviewForm.value.reject_reason) {
    ElMessage.warning('拒收图书必须说明拒收原因')
    return
  }
  await handleComplete(currentTask.value, { ...reviewForm.value })
  reviewDialogVisible.value = false
}

const submitRepair = async () => {
  await handleComplete(currentTask.value, { ...repairForm.value })
  repairDialogVisible.value = false
}

const handleComplete = async (t, data) => {
  try {
    completingId.value = t.id
    const res = await completeTask(t.id, data)
    if (res.decision !== undefined) {
      const decisionMap = {
        shelf: '审核通过，图书已上架为可借阅',
        clean: '审核通过，图书待清洁后上架，已生成清洁任务',
        transfer: '审核通过，图书已转赠学校，已生成转赠任务',
        reject: `审核已拒收：${data.reject_reason || '原因未填写'}`
      }
      ElMessage.success(decisionMap[res.decision] || '审核完成')
    } else {
      ElMessage.success('任务完成')
    }
    loadTasks()
  } finally {
    completingId.value = null
    currentTask.value = null
  }
}

onMounted(() => {
  loadTasks()
  loadBookcases()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.task-column {
  min-height: 600px;
}
.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-weight: 500;
  font-size: 15px;
}
.column-header.pending {
  background: #fdf6ec;
  color: #e6a23c;
}
.column-header.processing {
  background: #ecf5ff;
  color: #409eff;
}
.column-header.completed {
  background: #f0f9eb;
  color: #67c23a;
}
.badge {
  margin-left: auto;
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.task-card {
  transition: all 0.2s;
}
.task-card:hover {
  transform: translateY(-2px);
}
.task-card.done {
  opacity: 0.75;
}
.task-type {
  margin-bottom: 8px;
}
.task-desc {
  font-size: 14px;
  color: #303133;
  margin-bottom: 10px;
  line-height: 1.5;
}
.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.meta-item {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
}
.meta-item.due {
  color: #e6a23c;
  background: #fdf6ec;
}
.task-footer {
  text-align: right;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}
.task-footer.completed-time {
  text-align: left;
  font-size: 12px;
  color: #909399;
  border-top: none;
  padding-top: 0;
}
.decision-hint {
  width: 100%;
}
.decision-hint .el-tag {
  width: 100%;
  line-height: 1.6;
  padding: 6px 12px;
  font-weight: normal;
  border: none;
}
</style>
