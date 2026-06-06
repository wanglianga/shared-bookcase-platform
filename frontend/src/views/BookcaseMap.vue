<template>
  <div class="map-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>社区书柜地图</span>
          <div class="filters">
            <el-tag type="success" effect="light">正常</el-tag>
            <el-tag type="warning" effect="light">进水</el-tag>
            <el-tag type="info" effect="light">维护中</el-tag>
          </div>
        </div>
      </template>
      <div class="map-container">
        <div ref="mapRef" class="map"></div>
        <div class="legend">
          <div class="legend-item">
            <span class="dot normal"></span> 正常运行
          </div>
          <div class="legend-item">
            <span class="dot water"></span> 进水处理中
          </div>
          <div class="legend-item">
            <span class="dot maintenance"></span> 维护中
          </div>
        </div>
      </div>
      <el-table :data="bookcases" style="margin-top: 20px">
        <el-table-column prop="name" label="书柜名称" width="160" />
        <el-table-column prop="location" label="位置" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="capacity" label="容量" width="80" />
        <el-table-column label="上次清洁" width="180">
          <template #default="{ row }">
            {{ row.last_cleaned ? formatDate(row.last_cleaned) : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as L from 'leaflet'
import { getBookcasesForMap } from '@/api/bookcases'

const mapRef = ref(null)
const bookcases = ref([])
let mapInstance = null

const statusLabel = (s) => {
  const map = { normal: '正常', water_damaged: '进水', maintenance: '维护中' }
  return map[s] || s
}

const statusType = (s) => {
  const map = { normal: 'success', water_damaged: 'warning', maintenance: 'info' }
  return map[s] || 'info'
}

const formatDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleString('zh-CN', { hour12: false })
}

const initMap = () => {
  mapInstance = L.map(mapRef.value).setView([39.9042, 116.4074], 16)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(mapInstance)
}

const loadBookcases = async () => {
  bookcases.value = await getBookcasesForMap()
  bookcases.value.forEach((bc) => {
    if (bc.lat && bc.lng) {
      const color = bc.status === 'normal' ? '#67c23a' : bc.status === 'water_damaged' ? '#e6a23c' : '#909399'
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">📚</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
      L.marker([bc.lat, bc.lng], { icon })
        .addTo(mapInstance)
        .bindPopup(
          `<b>${bc.name}</b><br>位置：${bc.location}<br>状态：${statusLabel(bc.status)}<br>容量：${bc.capacity}本`
        )
    }
  })
}

onMounted(async () => {
  initMap()
  await loadBookcases()
})
</script>

<style scoped>
.map-page :deep(.el-card__body) {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filters .el-tag {
  margin-left: 8px;
}
.map-container {
  position: relative;
}
.map {
  height: 500px;
  width: 100%;
  border-radius: 8px;
  z-index: 0;
}
.legend {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}
.legend-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding: 4px 0;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}
.dot.normal {
  background: #67c23a;
}
.dot.water {
  background: #e6a23c;
}
.dot.maintenance {
  background: #909399;
}
</style>
