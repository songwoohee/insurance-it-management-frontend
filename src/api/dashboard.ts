import axiosInstance from './axiosInstance'

// ─── 타입 정의 ─────────────────────────────────────────────────────────────────

/** GET /dashboard/stats — 오늘 / 전체 집계 */
export interface StatsPeriod {
  totalCount: number
  successCount: number
  failCount: number
  successRate: number
  averageResponseTime: number
}

export interface DashboardStats {
  today: StatsPeriod
  total: StatsPeriod
}

/** GET /dashboard/status — 기관별 실시간 상태 */
export interface SystemStatus {
  configId: string
  targetSystem: string
  interfaceName: string
  /** SUCCESS | FAIL | UNKNOWN */
  status: 'SUCCESS' | 'FAIL' | 'UNKNOWN'
  /** 최근 응답 시간 (ms) */
  lastExecutionTime: number
  /** 마지막 호출 일시 (ISO 8601) */
  lastRequestedAt: string
}

/** GET /dashboard/chart/24h  |  GET /dashboard/chart/today */
export interface ChartDataPoint {
  /** X축 레이블: "HH:mm" */
  time: string
  total: number
  success: number
  fail: number
}

/** GET /dashboard/recent-failures — 최근 실패 로그 정보 */
export interface RecentFailure {
  id: string
  interfaceName: string
  targetSystem: string
  status: string
  message: string        // 에러 원인 (error_msg)
  requestedAt: string    // ISO Date
  responseTime: number   // 실행 시간 (ms)
}

// ─── API 함수 ──────────────────────────────────────────────────────────────────

/** GET /dashboard/stats */
export async function getStats(): Promise<DashboardStats> {
  const response = await axiosInstance.get<DashboardStats>('/dashboard/stats')
  return response.data
}

/** GET /dashboard/status */
export async function getSystemStatus(): Promise<SystemStatus[]> {
  const response = await axiosInstance.get<SystemStatus[]>('/dashboard/status')
  return response.data
}

/** GET /dashboard/chart/24h */
export async function getRollingChart(): Promise<ChartDataPoint[]> {
  const response = await axiosInstance.get<ChartDataPoint[]>('/dashboard/chart/24h')
  return response.data
}

/** GET /dashboard/chart/today */
export async function getTodayChart(): Promise<ChartDataPoint[]> {
  const response = await axiosInstance.get<ChartDataPoint[]>('/dashboard/chart/today')
  return response.data
}

/** GET /dashboard/recent-failures */
export async function getRecentFailures(): Promise<RecentFailure[]> {
  const response = await axiosInstance.get<RecentFailure[]>('/dashboard/recent-failures')
  return response.data
}
