import axios from 'axios'

const PROD_FALLBACK_API_BASE_URL = 'https://pois-viz-backend.onrender.com'
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const baseURL = configuredBaseUrl || (import.meta.env.DEV ? 'http://localhost:8000' : PROD_FALLBACK_API_BASE_URL)

const api = axios.create({
  // Production falls back to the hosted Render backend when env config is missing.
  baseURL,
  timeout: 15000,
})

export default api
