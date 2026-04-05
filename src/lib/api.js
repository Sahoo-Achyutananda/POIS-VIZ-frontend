import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const baseURL = configuredBaseUrl || (import.meta.env.DEV ? 'http://localhost:8000' : '')

const api = axios.create({
  // Use a configured backend URL when provided; otherwise keep production calls same-origin.
  baseURL,
  timeout: 15000,
})

export default api
