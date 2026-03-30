import client from './client'

export const getProfile = () => client.get('/users/profile')
