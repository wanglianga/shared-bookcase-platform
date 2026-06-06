import request from './request'

export const getBookcases = (params) => {
  return request.get('/bookcases', { params })
}

export const getBookcasesForMap = (params) => {
  return request.get('/bookcases/map', { params })
}

export const getBookcase = (id) => {
  return request.get(`/bookcases/${id}`)
}

export const createBookcase = (data) => {
  return request.post('/bookcases', data)
}

export const updateBookcase = (id, data) => {
  return request.put(`/bookcases/${id}`, data)
}

export const deleteBookcase = (id) => {
  return request.delete(`/bookcases/${id}`)
}

export const cleanBookcase = (id) => {
  return request.post(`/bookcases/${id}/clean`)
}
