import axios from 'axios'
import { authHeaders } from './auth.js'

// Use the environment variable or default to '/api'
const apiUrl = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL: apiUrl })

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function getSummary() {
  const { data } = await api.get('/wallets/summary', { headers: authHeaders() })
  return data
}

export async function getWallets() {
  const { data } = await api.get('/wallets', { headers: authHeaders() })
  return data.wallets
}

export async function getAllStats() {
  const { data } = await api.get('/wallets/stats/all', { headers: authHeaders() })
  return data
}

export async function getWalletStats(walletId) {
  const { data } = await api.get(`/wallets/${walletId}/stats`, { headers: authHeaders() })
  return data
}

export async function getPrices() {
  const { data } = await api.get('/prices', { headers: authHeaders() })
  return data
}

export async function setPrices(payload) {
  const { data } = await api.post('/prices', payload, { headers: authHeaders() })
  return data
}

export async function withdraw(walletId, payload) {
  const { data } = await api.post(`/wallets/${walletId}/withdraw`, payload, { headers: authHeaders() })
  return data
}

export async function createWallet(payload) {
  const { data } = await api.post('/wallets', payload, { headers: authHeaders() })
  return data.wallet
}

export async function createUser(payload) {
  const { data } = await api.post('/entities/users', payload, { headers: authHeaders() })
  return data.user
}

export async function createOperation(payload) {
  const { data } = await api.post('/entities/operations', payload, { headers: authHeaders() })
  return data.operation
}

export async function exportPdf(payload) {
  const res = await api.post('/reports/pdf', payload, { headers: authHeaders(), responseType: 'blob' })
  return res.data
}


