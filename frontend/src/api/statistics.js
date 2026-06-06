import request from './request'

export const getOverview = () => {
  return request.get('/statistics/overview')
}

export const getDonationSources = () => {
  return request.get('/statistics/donation-sources')
}

export const getBookCirculation = () => {
  return request.get('/statistics/book-circulation')
}

export const getActivityEffect = () => {
  return request.get('/statistics/activity-effect')
}

export const getBookcaseStatus = () => {
  return request.get('/statistics/bookcase-status')
}
