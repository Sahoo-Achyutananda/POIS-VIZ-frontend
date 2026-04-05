import axios from 'axios'

const api = axios.create({
  // Configure VITE_API_BASE_URL in .env for deployment.
  // Local default points to FastAPI running on port 8000.
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 15000,
})

export default api
