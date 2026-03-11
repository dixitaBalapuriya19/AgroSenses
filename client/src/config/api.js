const LOCAL_API_URL = 'http://localhost:8000/api'
const PRODUCTION_API_URL = 'https://agrosense-backend-otb9.onrender.com/api'

const normalizeApiUrl = (url) => url.replace(/\/+$/, '')

export const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim()

  if (configuredUrl) {
    return normalizeApiUrl(configuredUrl)
  }

  const { hostname, protocol } = window.location

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return LOCAL_API_URL
  }

  if (hostname.includes('ngrok')) {
    return `${protocol}//${hostname}/api`
  }

  return PRODUCTION_API_URL
}

export const API_BASE_URL = getApiBaseUrl()