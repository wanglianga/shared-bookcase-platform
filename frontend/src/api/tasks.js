import request from './request'

export const getTasks = (params) => {
  return request.get('/tasks', { params })
}

export const getMyTasks = (params) => {
  return request.get('/tasks/my', { params })
}

export const getTask = (id) => {
  return request.get(`/tasks/${id}`)
}

export const createTask = (data) => {
  return request.post('/tasks', data)
}

export const updateTask = (id, data) => {
  return request.put(`/tasks/${id}`, data)
}

export const claimTask = (id) => {
  return request.post(`/tasks/${id}/claim`)
}

export const completeTask = (id, data) => {
  return request.post(`/tasks/${id}/complete`, data || {})
}

export const deleteTask = (id) => {
  return request.delete(`/tasks/${id}`)
}
