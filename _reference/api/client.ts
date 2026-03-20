import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-Type': 'admin',
    },
})

// Inject token on every request
apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle 401
apiClient.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().clearAuth()
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    // Create an explicit separate request config since we're using multipart/form-data
    const response = await apiClient.post('/file/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })

    // Backend returns: { data: { file: { url: "..." } } }
    return response.data?.data?.file?.url || response.data?.url || response.data?.data?.url || response.data
}

export default apiClient
