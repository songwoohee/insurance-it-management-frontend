import axiosInstance from './axiosInstance'

// ─── 타입 정의 ─────────────────────────────────────────────────────────────────

export interface ApiLog {
  id: string
  apiConfigId: string
  status: 'SUCCESS' | 'FAIL'
  requestedAt: string
  responseTime?: number
  errorMessage?: string
  [key: string]: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  currentPage: number
  totalPages: number
}

export interface ApiLogSearchParams {
  target_system?: string
  display_status?: string
  login_id?: string
  correlation_id?: string
  page?: number
  limit?: number
}


// ─── API Logs 서비스 ───────────────────────────────────────────────────────────

/**
 * GET /api-logs
 * 검색 조건을 쿼리스트링으로 넘겨 필터링된 로그 목록을 반환합니다.
 */
export async function getApiLogs(params?: ApiLogSearchParams): Promise<PaginatedResponse<ApiLog>> {
  const response = await axiosInstance.get<PaginatedResponse<ApiLog>>('/api-logs', {
    params,
  })
  return response.data
}

/**
 * GET /api-logs/:id
 * 특정 호출 로그 단건을 반환합니다.
 */
export async function getApiLog(id: string): Promise<ApiLog> {
  const response = await axiosInstance.get<ApiLog>(`/api-logs/${id}`)
  return response.data
}
