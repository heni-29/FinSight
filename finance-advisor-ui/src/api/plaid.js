import client from './client'

export const createLinkToken = () => client.post('/plaid/link-token')

export const exchangeToken = (data) => client.post('/plaid/exchange', data)

export const syncTransactions = () => client.post('/plaid/sync')
