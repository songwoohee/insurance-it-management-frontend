import { useState } from 'react'
import {
  Box,
  Button,
  Center,
  Divider,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core'
import { IconLock, IconShieldCheck, IconUser } from '@tabler/icons-react'
import axios from 'axios'
import { login } from '../api/auth'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface LoginPageProps {
  /** 로그인 성공 시 부모(App)에서 인증 상태를 갱신하기 위한 콜백 */
  onLoginSuccess: () => void
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────────

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ── 폼 제출 핸들러 ────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!loginId.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 모두 입력해 주세요.')
      return
    }

    setLoading(true)

    try {
      // POST /auth/login 호출 — auth.ts 서비스 함수 사용
      const result = await login(loginId, password)
      const token = result.access_token;

      // 서버에서 받은 accessToken을 localStorage에 저장
      localStorage.setItem('access_token', token)

      // 부모 컴포넌트(App)에 로그인 성공을 알려 메인 레이아웃으로 전환
      onLoginSuccess()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const serverMessage = err.response?.data?.message
        if (err.response?.status === 401) {
          setError('아이디 또는 비밀번호가 올바르지 않습니다.')
        } else if (serverMessage) {
          setError(serverMessage)
        } else {
          setError(`서버 연결에 실패했습니다. (${err.message})`)
        }
      } else {
        setError('알 수 없는 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── 렌더링 ────────────────────────────────────────────────────────────────

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eef8 50%, #dde6f5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 배경 장식 원 */}
      <Box
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-120px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(67, 97, 238, 0.06)',
          pointerEvents: 'none',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: '-80px',
          left: '-80px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(67, 97, 238, 0.04)',
          pointerEvents: 'none',
        }}
      />

      {/* 로그인 카드 */}
      <Paper
        shadow="xl"
        radius="xl"
        p={0}
        style={{
          width: '100%',
          maxWidth: 420,
          margin: '0 16px',
          background: '#ffffff',
          border: '1px solid rgba(67, 97, 238, 0.12)',
          overflow: 'hidden',
        }}
      >
        {/* 카드 상단 블루 배너 */}
        <Box
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 60%, #4361ee 100%)',
            padding: '32px 40px 28px',
            textAlign: 'center',
          }}
        >
          <Center mb="sm">
            <ThemeIcon
              size={56}
              radius="xl"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <IconShieldCheck size={28} color="white" />
            </ThemeIcon>
          </Center>

          <Text
            size="xl"
            fw={700}
            c="white"
            style={{ letterSpacing: '-0.3px' }}
          >
            Finance IT Admin
          </Text>
          <Text
            size="xs"
            style={{ color: 'rgba(255,255,255,0.65)', marginTop: 4 }}
          >
            보험사 금융 IT 인터페이스 통합 관리 시스템
          </Text>
        </Box>

        {/* 폼 영역 */}
        <Box px={40} py={36}>
          <Text size="sm" fw={600} c="gray.7" mb="lg">
            관리자 로그인
          </Text>

          <form onSubmit={handleSubmit} noValidate>
            <Stack gap="md">
              {/* 아이디 */}
              <TextInput
                id="login-user-id"
                label="아이디"
                placeholder="admin"
                value={loginId}
                onChange={(e) => setLoginId(e.currentTarget.value)}
                leftSection={<IconUser size={16} />}
                size="md"
                radius="md"
                autoComplete="username"
                disabled={loading}
                styles={{
                  label: { fontWeight: 500, fontSize: '0.8rem', color: '#475569' },
                }}
              />

              {/* 비밀번호 */}
              <PasswordInput
                id="login-password"
                label="비밀번호"
                placeholder="1234"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                leftSection={<IconLock size={16} />}
                size="md"
                radius="md"
                autoComplete="current-password"
                disabled={loading}
                styles={{
                  label: { fontWeight: 500, fontSize: '0.8rem', color: '#475569' },
                }}
              />

              {/* 에러 메시지 */}
              {error && (
                <Text
                  size="xs"
                  c="red.6"
                  style={{
                    background: '#fff5f5',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  {error}
                </Text>
              )}

              {/* 로그인 버튼 */}
              <Button
                id="login-submit-btn"
                type="submit"
                fullWidth
                size="md"
                radius="md"
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 100%)',
                  marginTop: 4,
                  fontWeight: 600,
                  letterSpacing: '0.3px',
                  transition: 'opacity 0.2s',
                }}
              >
                로그인
              </Button>
            </Stack>
          </form>

          {/* 테스트 계정 안내 */}
          <Divider my="lg" color="gray.2" />
          <Box
            style={{
              background: '#f8faff',
              border: '1px solid #e0e7ff',
              borderRadius: 8,
              padding: '10px 16px',
              textAlign: 'center',
            }}
          >
            <Text size="xs" c="indigo.4" fw={500}>
              테스트 계정: admin / 1234
            </Text>
          </Box>
        </Box>
      </Paper>

      {/* 하단 카피라이트 */}
      <Text
        size="xs"
        c="gray.5"
        style={{ position: 'absolute', bottom: 24, textAlign: 'center' }}
      >
        © 2026 Finance IT Admin. All rights reserved.
      </Text>
    </Box>
  )
}
