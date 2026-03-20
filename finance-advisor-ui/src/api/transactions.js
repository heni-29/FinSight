import client from './client'

export const getTransactions = (params) =>
  client.get('/transactions', { params })

export const getSummary = (params) =>
  client.get('/transactions/summary', { params })

export const createTransaction = (data) =>
  client.post('/transactions', data)

export const deleteTransaction = (id) =>
  client.delete(`/transactions/${id}`)

export const getCategories = () =>
  client.get('/transactions/categories')
