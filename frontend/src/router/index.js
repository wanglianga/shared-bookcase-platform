import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    redirect: '/map'
  },
  {
    path: '/map',
    name: 'BookcaseMap',
    component: () => import('@/views/BookcaseMap.vue'),
    meta: { title: '书柜地图' }
  },
  {
    path: '/books',
    name: 'BookList',
    component: () => import('@/views/BookList.vue'),
    meta: { title: '图书列表' }
  },
  {
    path: '/donate',
    name: 'Donate',
    component: () => import('@/views/Donate.vue'),
    meta: { title: '捐赠图书', roles: ['resident'] }
  },
  {
    path: '/my-borrows',
    name: 'MyBorrows',
    component: () => import('@/views/MyBorrows.vue'),
    meta: { title: '我的借阅', roles: ['resident'] }
  },
  {
    path: '/tasks',
    name: 'TaskBoard',
    component: () => import('@/views/TaskBoard.vue'),
    meta: { title: '任务看板', roles: ['volunteer'] }
  },
  {
    path: '/bookcases',
    name: 'BookcaseManage',
    component: () => import('@/views/BookcaseManage.vue'),
    meta: { title: '书柜管理', roles: ['property'] }
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/Statistics.vue'),
    meta: { title: '数据统计', roles: ['ngo'] }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.public) {
    next()
    return
  }

  if (!userStore.isLoggedIn) {
    next('/login')
    return
  }

  if (to.meta.roles && !to.meta.roles.includes(userStore.role)) {
    next('/map')
    return
  }

  next()
})

export default router
