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
                  <el-button type="success" size="small" :loading="completingId === t.id" @click="handleComplete(t)">完成任务</el-button>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getTasks, getMyTasks, claimTask, completeTask } from '@/api/tasks'

const viewMode = ref('all')
const tasks = ref([])
const claimingId = ref(null)
const completingId = ref(null)

const typeLabel = (t) => {
  const map = { review: '图书审核', shelf: '图书上架', inventory: '库存清点', clean: '书柜清洁', repair: '破损维修' }
  return map[t] || t
}
const typeTag = (t) => {
  const map = { review: 'warning', shelf: 'primary', inventory: 'success', clean: 'info', repair: 'danger' }
  return map[t] || 'info'
}
const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''

const pendingTasks = computed(() => tasks.value.filter((t) => t.status === 'pending'))
const processingTasks = computed(() => tasks.value.filter((t) => t.status === 'processing'))
const completedTasks = computed(() => tasks.value.filter((t) => t.status === 'completed'))

const loadTasks = async () => {
  tasks.value = viewMode.value === 'my' ? await getMyTasks() : await getTasks()
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

const handleComplete = async (t) => {
  try {
    completingId.value = t.id
    await completeTask(t.id)
    ElMessage.success('任务完成')
    loadTasks()
  } finally {
    completingId.value = null
  }
}

onMounted(loadTasks)
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
</style>
