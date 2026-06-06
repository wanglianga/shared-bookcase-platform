import request from './request'

export const login = (username, password) => {
  return request.post('/auth/login', { username, password })
}

export const register = (data) => {
  return request.post('/auth/register', data)
}

export const me = () => {
  return request.get('/auth/me')
}
