import axios from 'axios'

// ─── 공통 Axios 인스턴스 ──────────────────────────────────────────────────────

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── 요청 인터셉터: 모든 요청에 accessToken을 자동 주입합니다. ─────────────────

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── 응답 인터셉터: 401 처리 등 전역 에러 핸들링을 위한 자리입니다. ─────────────

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. 로그인 요청(/auth/login)에서 나는 에러는 절대 인터셉터가 건드리지 않음
    if (error.config?.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    // 2. 그 외의 요청에서 401이 났을 때만 처리
    if (error.response?.status === 401) {
      console.warn('인증 만료 또는 권한 없음. 로그아웃 처리합니다.');
      localStorage.removeItem('access_token');
    }

    return Promise.reject(error);
  }
)

export default axiosInstance


