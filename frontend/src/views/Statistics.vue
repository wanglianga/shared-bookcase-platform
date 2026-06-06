<template>
  <div class="statistics-page">
    <el-row :gutter="16">
      <el-col :span="6" v-for="s in stats" :key="s.label">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">{{ s.label }}</div>
              <div class="stat-value" :style="{ color: s.color }">{{ s.value }}</div>
            </div>
            <el-icon :size="36" :color="s.color"><component :is="s.icon" /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="12">
        <el-card>
          <template #header><span>图书分类占比</span></template>
          <div ref="categoryChartRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>书柜状态分布</span></template>
          <div ref="bookcaseChartRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="12">
        <el-card>
          <template #header><span>月度活动趋势</span></template>
          <div ref="monthlyChartRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>图书借阅排行榜 TOP 10</span></template>
          <el-table :data="topBooks" size="small">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="title" label="书名" />
            <el-table-column prop="author" label="作者" width="120" />
            <el-table-column label="借阅次数" width="100">
              <template #default="{ row }">
                <el-tag type="primary" size="small">{{ row.borrow_count }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="12">
        <el-card>
          <template #header><span>捐赠来源（按角色）</span></template>
          <el-table :data="donationByRole" size="small">
            <el-table-column label="角色" width="120">
              <template #default="{ row }">
                <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="捐赠数量" prop="count" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>志愿者活跃度排行</span></template>
          <el-table :data="volunteerStats" size="small">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="name" label="志愿者" />
            <el-table-column label="审核" prop="review_count" width="70" />
            <el-table-column label="上架" prop="shelf_count" width="70" />
            <el-table-column label="清洁" prop="clean_count" width="70" />
            <el-table-column label="维修" prop="repair_count" width="70" />
            <el-table-column label="总计" width="80">
              <template #default="{ row }">
                <el-tag type="warning" size="small">{{ row.total_tasks }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getOverview, getBookCirculation, getDonationSources, getActivityEffect, getBookcaseStatus } from '@/api/statistics'

const overview = ref({})
const categoryStats = ref([])
const bookcaseStatuses = ref([])
const monthlyData = ref([])
const topBooks = ref([])
const donationByRole = ref([])
const volunteerStats = ref([])

const categoryChartRef = ref(null)
const bookcaseChartRef = ref(null)
const monthlyChartRef = ref(null)
let categoryChart = null
let bookcaseChart = null
let monthlyChart = null

const stats = computed(() => [
  { label: '图书总数', value: overview.value.totalBooks || 0, color: '#667eea', icon: 'Collection' },
  { label: '可借阅', value: overview.value.availableBooks || 0, color: '#67c23a', icon: 'CircleCheck' },
  { label: '借阅中', value: overview.value.borrowedBooks || 0, color: '#409eff', icon: 'Reading' },
  { label: '注册用户', value: overview.value.totalUsers || 0, color: '#e6a23c', icon: 'User' },
  { label: '累计捐赠', value: overview.value.totalDonations || 0, color: '#f56c6c', icon: 'Present' },
  { label: '累计借阅', value: overview.value.totalBorrows || 0, color: '#909399', icon: 'Tickets' },
  { label: '书柜数量', value: overview.value.totalBookcases || 0, color: '#764ba2', icon: 'OfficeBuilding' },
  { label: '待处理任务', value: overview.value.pendingTasks || 0, color: '#f56c6c', icon: 'Warning' }
])

const roleLabel = (r) => ({ resident: '居民', volunteer: '志愿者', property: '物业', ngo: '公益组织' }[r] || r)
const roleTagType = (r) => ({ resident: 'success', volunteer: 'warning', property: 'primary', ngo: 'danger' }[r] || 'info')

const loadData = async () => {
  const [ov, circ, don, act, bc] = await Promise.all([
    getOverview(),
    getBookCirculation(),
    getDonationSources(),
    getActivityEffect(),
    getBookcaseStatus()
  ])
  overview.value = ov
  categoryStats.value = circ.categoryStats || []
  topBooks.value = (circ.topBooks || []).slice(0, 10)
  donationByRole.value = don.byRole || []
  monthlyData.value = (act.monthlyData || []).reverse()
  volunteerStats.value = act.volunteerStats || []
  bookcaseStatuses.value = bc.statuses || []
  await nextTick()
  renderCharts()
}

const renderCharts = () => {
  if (categoryChartRef.value) {
    categoryChart = echarts.init(categoryChartRef.value)
    categoryChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: categoryStats.value.map((c) => ({ name: c.category, value: c.count }))
      }]
    })
  }

  if (bookcaseChartRef.value) {
    bookcaseChart = echarts.init(bookcaseChartRef.value)
    const labelMap = { normal: '正常', water_damaged: '进水', maintenance: '维护中' }
    const colorMap = { normal: '#67c23a', water_damaged: '#e6a23c', maintenance: '#909399' }
    bookcaseChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: bookcaseStatuses.value.map((s) => labelMap[s.status] || s.status) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar',
        barWidth: '50%',
        data: bookcaseStatuses.value.map((s) => ({
          value: s.count,
          itemStyle: { color: colorMap[s.status] || '#667eea', borderRadius: [4, 4, 0, 0] }
        }))
      }]
    })
  }

  if (monthlyChartRef.value) {
    monthlyChart = echarts.init(monthlyChartRef.value)
    monthlyChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['捐赠', '审核通过', '借阅', '归还'] },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', boundaryGap: false, data: monthlyData.value.map((m) => m.month) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        { name: '捐赠', type: 'line', smooth: true, data: monthlyData.value.map((m) => m.donations || 0), itemStyle: { color: '#f56c6c' }, areaStyle: { opacity: 0.2 } },
        { name: '审核通过', type: 'line', smooth: true, data: monthlyData.value.map((m) => m.approved || 0), itemStyle: { color: '#67c23a' }, areaStyle: { opacity: 0.2 } },
        { name: '借阅', type: 'line', smooth: true, data: monthlyData.value.map((m) => m.borrows || 0), itemStyle: { color: '#409eff' }, areaStyle: { opacity: 0.2 } },
        { name: '归还', type: 'line', smooth: true, data: monthlyData.value.map((m) => m.returns || 0), itemStyle: { color: '#909399' }, areaStyle: { opacity: 0.2 } }
      ]
    })
  }
}

onMounted(loadData)
</script>

<style scoped>
.stat-card {
  border-left: 4px solid #667eea;
}
.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 28px;
  font-weight: bold;
}
.chart {
  height: 300px;
  width: 100%;
}
</style>
