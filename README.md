# 社区共享书柜平台

连接社区、共享知识的共享书柜管理平台。支持居民、志愿者、物业和公益组织四类角色协同工作，实现图书从捐赠、审核、上架、借阅、归还到破损处理的完整闭环。

## 原始需求

> 搭建一个给社区志愿者、物业、居民和公益组织使用的共享书柜平台，Vue3 页面呈现书柜地图、图书状态和志愿者任务，Express 服务保存捐赠、上架、借阅、维修和赔付记录。居民提交捐赠图书、预约借阅和归还照片；志愿者审核图书品相、分类上架、清点库存和处理破损；物业维护书柜位置、开柜权限、监控记录和清洁安排；公益组织查看捐赠来源、流转次数和活动效果。系统要把图书捐赠、审核、上架、借阅、归还、破损处理和下架回收连成闭环。重复捐赠、书页缺损、逾期未还、书柜进水要有不同处理结果。

## 技术栈

- **前端**：Vue 3 + Vite + Vue Router + Pinia + Element Plus + Leaflet（地图）+ ECharts（图表）
- **后端**：Node.js + Express + better-sqlite3 + JWT + bcryptjs
- **数据库**：SQLite（单文件数据库）
- **部署**：Docker + docker-compose

## 目录结构

```
wmy-24/
├── backend/                 # Express 后端服务
│   ├── routes/             # API 路由
│   │   ├── auth.js         # 认证相关接口
│   │   ├── books.js        # 图书管理接口
│   │   ├── bookcases.js    # 书柜管理接口
│   │   ├── tasks.js        # 任务管理接口
│   │   └── statistics.js   # 统计分析接口
│   ├── app.js              # 服务入口
│   ├── db.js               # 数据库初始化
│   ├── seed.js             # 种子数据脚本
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/               # Vue3 前端
│   ├── src/
│   │   ├── api/            # API 请求封装
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── router/         # Vue Router 路由配置
│   │   ├── views/          # 页面组件
│   │   ├── App.vue
│   │   └── main.js
│   ├── nginx.conf          # Nginx 配置（生产）
│   ├── Dockerfile
│   └── .dockerignore
├── docker-compose.yml      # 根目录 compose 编排
├── Dockerfile              # 根目录默认构建入口（后端）
├── .dockerignore
├── .done                   # 任务过程记录
└── README.md
```

## 功能模块

### 居民（resident）
- 提交图书捐赠申请
- 搜索和借阅图书
- 查看我的借阅记录
- 归还图书并上传照片
- 查看书柜地图和图书状态

### 志愿者（volunteer）
- 审核居民捐赠的图书（品相检查）
- 处理归还登记（检查破损情况）
- 任务看板：审核、上架、库存清点、书柜清洁、破损维修等
- 跟踪图书状态流转

### 物业（property）
- 维护书柜信息（位置、坐标、容量）
- 标记书柜进水/维护状态
- 记录书柜清洁时间
- 管理书柜增删改查

### 公益组织（ngo）
- 查看平台总览数据（图书、用户、借阅、捐赠统计）
- 分析图书分类占比和借阅排行
- 查看捐赠来源分布
- 查看志愿者活跃度排行
- 查看月度活动趋势

### 特殊场景处理
- **重复捐赠**：通过 ISBN 或书名可追溯，志愿者审核时可标记
- **书页缺损**：审核或归还时品相标记为 `missing_pages`，自动生成维修任务
- **逾期未还**：系统自动计算逾期罚金（每天 0.5 元），归还时一并结算
- **书柜进水**：书柜状态标记为 `water_damaged`，自动生成维修处理任务

## 启动方式

### 前置要求

- Node.js >= 16
- npm 或 pnpm
- Docker & Docker Compose（推荐一键启动）

---

### 方式一：Docker 一键启动（推荐）

#### 1. 构建并启动所有服务

```bash
docker compose up --build
```

后台运行：

```bash
docker compose up --build -d
```

#### 2. 初始化种子数据（首次启动后执行）

```bash
docker exec -it shared-bookcase-backend node seed.js
```

#### 3. 访问地址

- 前端页面：http://localhost:5173
- 后端 API：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

#### 4. 停止服务

```bash
docker compose down
```

如需清除数据卷：

```bash
docker compose down -v
```

---

### 方式二：本地开发启动

#### 1. 安装后端依赖并启动

```bash
cd backend
npm install
node seed.js   # 首次启动请执行种子数据初始化
npm start
```

后端服务将运行在 http://localhost:3000

#### 2. 安装前端依赖并启动

```bash
cd frontend
npm install
npm run dev
```

前端开发服务将运行在 http://localhost:5173

#### 3. 访问地址

- 前端：http://localhost:5173
- 后端 API：http://localhost:3000/api

---

## 测试账号

种子数据初始化后可使用以下账号登录（密码均为 `123456`）：

| 用户名 | 角色 | 说明 |
| --- | --- | --- |
| resident1 | 居民 | 张居民 |
| resident2 | 居民 | 李阿姨 |
| volunteer1 | 志愿者 | 王志愿 |
| volunteer2 | 志愿者 | 赵义工 |
| property1 | 物业 | 孙物业 |
| ngo1 | 公益组织 | 公益组织管理员 |

---

## API 接口概览

| 模块 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| 认证 | POST | `/api/auth/register` | 用户注册 |
| 认证 | POST | `/api/auth/login` | 用户登录 |
| 认证 | GET | `/api/auth/me` | 获取当前用户信息 |
| 图书 | GET | `/api/books` | 图书列表（支持筛选） |
| 图书 | GET | `/api/books/:id` | 图书详情（含借阅/流转记录） |
| 图书 | POST | `/api/books` | 提交图书捐赠 |
| 图书 | POST | `/api/books/:id/review` | 志愿者审核图书 |
| 图书 | POST | `/api/books/:id/borrow` | 借阅图书 |
| 图书 | POST | `/api/books/:id/return` | 归还图书 |
| 书柜 | GET | `/api/bookcases` | 书柜列表 |
| 书柜 | GET | `/api/bookcases/map` | 书柜地图数据 |
| 书柜 | POST | `/api/bookcases` | 新增书柜（物业） |
| 书柜 | POST | `/api/bookcases/:id/clean` | 记录书柜清洁 |
| 任务 | GET | `/api/tasks` | 全部任务列表 |
| 任务 | GET | `/api/tasks/my` | 我的任务 |
| 任务 | POST | `/api/tasks/:id/claim` | 领取任务 |
| 任务 | POST | `/api/tasks/:id/complete` | 完成任务 |
| 统计 | GET | `/api/statistics/overview` | 数据总览 |
| 统计 | GET | `/api/statistics/donation-sources` | 捐赠来源 |
| 统计 | GET | `/api/statistics/book-circulation` | 图书流转排行 |
| 统计 | GET | `/api/statistics/activity-effect` | 活动效果 |
| 统计 | GET | `/api/statistics/bookcase-status` | 书柜状态 |

---

## 图书状态流转

```
捐赠 (donated)
    │
    ▼
  审核 ──approved──► 可借阅 (available) ◄───┐
    │                                         │
    └──rejected──► 已拒绝 (rejected)         │
                                              │
                                              ▼
                                        借阅 (borrowed)
                                              │
                  ┌───────────────完好────────┤
                  │                           │
                  ▼                           ▼
            可借阅 (available)           破损 (damaged)
                                              │
                                              ▼
                                        维修中 (repairing)
                                              │
                                              ▼
                                        已下架 (off_shelf)
```

## 注意事项

- 首次启动请务必执行 `node seed.js` 初始化数据库和测试账号
- SQLite 数据库文件位于 `backend/database.db`，Docker 部署时通过 volume 持久化
- 逾期罚金按每天 0.5 元计算，归还时自动结算
- 书柜进水会自动生成维修任务，需要志愿者处理
