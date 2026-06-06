import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, me as apiMe } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const role = computed(() => userInfo.value?.role || '')
  const username = computed(() => userInfo.value?.name || userInfo.value?.username || '')
  const userId = computed(() => userInfo.value?.id || null)

  const roleLabel = computed(() => {
    const map = {
      resident: '居民',
      volunteer: '志愿者',
      property: '物业',
      ngo: '公益组织'
    }
    return map[role.value] || role.value
  })

  const setToken = (t) => {
    token.value = t
    localStorage.setItem('token', t)
  }

  const setUserInfo = (u) => {
    userInfo.value = u
    localStorage.setItem('userInfo', JSON.stringify(u))
  }

  const login = async (username, password) => {
    const res = await apiLogin(username, password)
    setToken(res.token)
    setUserInfo(res.user)
    return res
  }

  const fetchMe = async () => {
    try {
      const user = await apiMe()
      setUserInfo(user)
      return user
    } catch (e) {
      logout()
      throw e
    }
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    role,
    username,
    userId,
    roleLabel,
    login,
    fetchMe,
    logout,
    setToken,
    setUserInfo
  }
})
