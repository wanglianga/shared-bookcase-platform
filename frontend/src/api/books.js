import request from './request'

export const getBooks = (params) => {
  return request.get('/books', { params })
}

export const getBook = (id) => {
  return request.get(`/books/${id}`)
}

export const createBook = (data) => {
  return request.post('/books', data)
}

export const updateBook = (id, data) => {
  return request.put(`/books/${id}`, data)
}

export const deleteBook = (id) => {
  return request.delete(`/books/${id}`)
}

export const reviewBook = (id, data) => {
  return request.post(`/books/${id}/review`, data)
}

export const borrowBook = (id, data) => {
  return request.post(`/books/${id}/borrow`, data || {})
}

export const returnBook = (id, data) => {
  return request.post(`/books/${id}/return`, data || {})
}

export const getBookHistory = (id) => {
  return request.get(`/books/${id}/history`)
}
