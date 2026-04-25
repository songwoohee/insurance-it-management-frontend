import { useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import {
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconApi,
  IconChevronRight,
  IconFileAnalytics,
  IconLayoutDashboard,
  IconLogout,
  IconShieldCheck,
} from '@tabler/icons-react'

import LoginPage from './pages/LoginPage'
import InterfaceTable from './components/InterfaceTable'
import ApiLogsPage from './pages/ApiLogsPage'
import DashboardPage from './pages/DashboardPage'

// ─── 타입 및 상수 ─────────────────────────────────────────────────────────────

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: '대시보드',
    icon: <IconLayoutDashboard size={18} />,
  },
  {
    path: '/interface',
    label: '인터페이스 관리',
    icon: <IconApi size={18} />,
    badge: 'LIVE',
  },
  {
    path: '/logs',
    label: '호출 로그',
    icon: <IconFileAnalytics size={18} />,
  },
]

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [opened, { toggle }] = useDisclosure()

  // 토큰 존재 여부 확인 (새로고침 시 즉시 판별)
  const isAuthenticated = Boolean(localStorage.getItem('access_token'))

  // 1. 로그인 상태인데 /login에 있거나, 로그인이 안 됐는데 보호된 경로에 있는 경우 처리
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true })
    } else if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/')) {
      navigate('/interface', { replace: true })
    }
  }, [isAuthenticated, location.pathname, navigate])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/login', { replace: true })
  }

  // 로그인 페이지는 AppShell 없이 독립적으로 렌더링
  if (location.pathname === '/login') {
    return <LoginPage onLoginSuccess={() => navigate('/dashboard', { replace: true })} />
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      {/* ── 헤더 ── */}
      <AppShell.Header
        style={{
          background: 'linear-gradient(135deg, #1a1d2e 0%, #12141f 100%)',
          borderBottom: '1px solid rgba(99, 107, 183, 0.2)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <ThemeIcon
              size="lg"
              radius="md"
              variant="gradient"
              gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
            >
              <IconShieldCheck size={20} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={700} c="indigo.2" style={{ letterSpacing: '0.5px' }}>
                InsureConnect
              </Text>
              <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
                금융 IT 인터페이스 관리
              </Text>
            </Box>
          </Group>

          <Group gap="sm">
            <Badge variant="dot" color="teal" size="sm">시스템 정상</Badge>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconLogout size={14} />}
              onClick={handleLogout}
            >
              로그아웃
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      {/* ── 사이드바 ── */}
      <AppShell.Navbar
        p="sm"
        style={{
          background: 'linear-gradient(180deg, #13151f 0%, #0f1117 100%)',
          borderRight: '1px solid rgba(99, 107, 183, 0.15)',
        }}
      >
        <Stack gap={4}>
          <Text size="xs" fw={600} c="dimmed" px="sm" pt="xs" pb={4} style={{ letterSpacing: '1px' }}>
            MENU
          </Text>
          <Divider opacity={0.1} mb={4} />

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={
                <ThemeIcon
                  size="sm"
                  radius="sm"
                  variant={location.pathname === item.path ? 'gradient' : 'subtle'}
                  gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
                >
                  {item.icon}
                </ThemeIcon>
              }
              rightSection={item.badge && <Badge size="xs" color="indigo" variant="light">{item.badge}</Badge>}
              active={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              style={{
                borderRadius: 8,
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      {/* ── 메인 콘텐츠 (라우팅 결과물) ── */}
      <AppShell.Main>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/interface" element={<InterfaceTable />} />
          <Route path="/logs" element={<ApiLogsPage />} />
          <Route path="/" element={<Navigate to="/interface" replace />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}
