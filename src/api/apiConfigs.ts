import axiosInstance from './axiosInstance'

// ─── 타입 정의 ─────────────────────────────────────────────────────────────────

export interface ApiConfig {
  id: string
  name: string
  target_system: string
  protocol: string
  url: string
  method: string
  action_type?: 'UPLOAD' | 'LIST' | 'DOWNLOAD'
  description?: string
  endpoint?: string        // 레거시 호환
  status?: 'SUCCESS' | 'FAIL'
  [key: string]: unknown
}

export interface ApiConfigFormData {
  name: string
  target_system: string
  protocol: string
  url: string
  method: string
  description: string
}

export interface RunInterfaceResponse {
  message?: string
  [key: string]: unknown
}

export interface RetryLogResponse {
  message?: string
  [key: string]: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  currentPage: number
  totalPages: number
}

// ─── API Configs 서비스 ────────────────────────────────────────────────────────

/**
 * GET /api-configs
 * 등록된 인터페이스 목록 전체를 반환합니다.
 */
export async function getApiConfigs(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<ApiConfig>> {
  const response = await axiosInstance.get<PaginatedResponse<ApiConfig>>('/api-configs', { params })
  return response.data
}

/**
 * GET /api-configs/:id
 * 특정 인터페이스 설정 단건을 반환합니다.
 */
export async function getApiConfig(id: string): Promise<ApiConfig> {
  const response = await axiosInstance.get<ApiConfig>(`/api-configs/${id}`)
  return response.data
}

/**
 * POST /api-configs
 * 새 인터페이스 설정을 생성합니다.
 */
export async function createApiConfig(
  data: ApiConfigFormData,
): Promise<ApiConfig> {
  const response = await axiosInstance.post<ApiConfig>('/api-configs', data)
  return response.data
}

/**
 * PATCH /api-configs/:id
 * 기존 인터페이스 설정을 부분 수정합니다.
 */
export async function updateApiConfig(
  id: string,
  data: Partial<ApiConfigFormData>,
): Promise<ApiConfig> {
  const response = await axiosInstance.patch<ApiConfig>(`/api-configs/${id}`, data)
  return response.data
}

/**
 * DELETE /api-configs/:id
 * 인터페이스 설정을 삭제합니다.
 */
export async function deleteApiConfig(id: string): Promise<void> {
  await axiosInstance.delete(`/api-configs/${id}`)
}

/**
 * POST /api-configs/:id/request
 * 인터페이스를 즉시 실행(호출)합니다.
 */
export async function runInterface(id: string): Promise<RunInterfaceResponse> {
  const response = await axiosInstance.post<RunInterfaceResponse>(
    `/api-configs/${id}/request`,
  )
  return response.data
}

/**
 * POST /api-configs/logs/:logId/retry
 * 실패한 호출 로그를 재시도합니다.
 */
export async function retryLog(logId: string): Promise<RetryLogResponse> {
  const response = await axiosInstance.post<RetryLogResponse>(
    `/api-configs/logs/${logId}/retry`,
  )
  return response.data
}
