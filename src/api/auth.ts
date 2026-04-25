import axiosInstance from './axiosInstance'

// ─── 타입 정의 ─────────────────────────────────────────────────────────────────

export interface LoginRequest {
  loginId: string
  password: string
}

export interface LoginResponse {
  access_token: string
  /** 서버 구현에 따라 refreshToken이 포함될 수 있습니다. */
  refreshToken?: string
  /** 사용자 정보가 함께 반환되는 경우 확장합니다. */
  [key: string]: any;
}

// ─── Auth 서비스 ───────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 *
 * 로그인을 시도하고 서버로부터 토큰을 반환받습니다.
 * 토큰 저장(localStorage)은 호출하는 쪽(LoginPage)에서 처리합니다.
 */
export async function login(
  loginId: string,
  password: string,
): Promise<LoginResponse> {
  const response = await axiosInstance.post<LoginResponse>('/auth/login', {
    loginId,
    password,
  } satisfies LoginRequest)

  return response.data
}
