import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Box,
  Button,
  Grid,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Skeleton,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core'
import { AreaChart } from '@mantine/charts'
import '@mantine/charts/styles.css'
import {
  IconActivity,
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconMinus,
  IconRefresh,
  IconShieldCheck,
  IconTargetArrow,
  IconTimeline,
  IconX,
} from '@tabler/icons-react'
import {
  type ChartDataPoint,
  type DashboardStats,
  type SystemStatus,
  type RecentFailure,
  getRollingChart,
  getStats,
  getSystemStatus,
  getTodayChart,
  getRecentFailures,
} from '../api/dashboard'

// ─── 유틸리티 ──────────────────────────────────────────────────────────────────

/** 시간 포맷 (HH:mm:ss) */
function formatFullTime(iso: string): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return '-'
  }
}

/** 기관 상태 판별: FAIL→error, 1500ms 이상→warn, 그 외→ok */
type HealthLevel = 'ok' | 'warn' | 'error' | 'unknown'

function getHealth(s: SystemStatus): HealthLevel {
  if (s.status === 'FAIL') return 'error'
  if (s.status === 'UNKNOWN') return 'unknown'
  if (s.lastExecutionTime >= 1500) return 'warn'
  return 'ok'
}

const HEALTH = {
  ok: { color: '#22c55e', label: '정상', icon: <IconCheck size={11} /> },
  warn: { color: '#eab308', label: '지연', icon: <IconClock size={11} /> },
  error: { color: '#ef4444', label: '에러', icon: <IconX size={11} /> },
  unknown: { color: '#6b7280', label: '미확인', icon: <IconMinus size={11} /> },
} as const

function ms(n: number | undefined): string {
  if (n == null) return '-'
  return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`
}

function pct(n: number | undefined): string {
  return n == null ? '-' : `${n}%`
}

function formatNum(n: number | undefined): string {
  return n == null ? '-' : n.toLocaleString('ko-KR')
}

function relativeTime(iso: string): string {
  if (!iso) return '-'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  return `${Math.floor(diff / 3600)}시간 전`
}

// ─── 컴포넌트: 상단 통계 카드 ─────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value: string
  sub?: string
  accent: string
  icon: React.ReactNode
  loading: boolean
}

function StatTile({ label, value, sub, accent, icon, loading }: StatTileProps) {
  return (
    <Paper
      p="lg"
      radius="md"
      style={{
        background: 'rgba(10, 12, 22, 0.95)',
        border: `1px solid ${accent}33`,
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
      }}
    >
      {/* 좌측 색상 바 */}
      <Box
        style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 3,
          background: accent,
        }}
      />

      <Group justify="space-between" mb={8}>
        <Text size="xs" c="dimmed" fw={500} style={{ letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          {label}
        </Text>
        <ThemeIcon size={28} radius="sm" style={{ background: `${accent}22`, color: accent }}>
          {icon}
        </ThemeIcon>
      </Group>

      {loading ? (
        <>
          <Skeleton h={32} w={100} mb={6} />
          <Skeleton h={14} w={70} />
        </>
      ) : (
        <>
          <Text size="xl" fw={800} lh={1.1} style={{ color: accent, fontFamily: 'monospace' }}>
            {value}
          </Text>
          {sub && <Text size="xs" c="dimmed" mt={4}>{sub}</Text>}
        </>
      )}
    </Paper>
  )
}

// ─── 컴포넌트: 차트 ────────────────────────────────────────────────────────────

function DashChart({ data, loading }: { data: ChartDataPoint[]; loading: boolean }) {
  if (loading) return <Skeleton h={240} radius="md" />

  if (data.length === 0) {
    return (
      <Box h={240} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text c="dimmed" size="sm">데이터가 없습니다.</Text>
      </Box>
    )
  }

  return (
    <AreaChart
      h={240}
      data={data}
      dataKey="time"
      series={[
        { name: 'total', label: '전체', color: 'blue.5' },
        { name: 'success', label: '성공', color: 'teal.5' },
        { name: 'fail', label: '실패', color: 'red.5' },
      ]}
      curveType="monotone"
      withLegend
      withDots={false}
      fillOpacity={0.15}
      strokeWidth={2}
      gridAxis="xy"
      tickLine="x"
      styles={{
        root: { background: 'transparent' },
      }}
    />
  )
}

// ─── 컴포넌트: 슬림 기관 리스트 행 ───────────────────────────────────────────

function SystemRow({ s, onClick }: { s: SystemStatus; onClick: () => void }) {
  const h = getHealth(s)
  const cfg = HEALTH[h]

  return (
    <Box
      px="md"
      py={10}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      onClick={onClick}
    >
      {/* 상태 도트 */}
      <Box
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${cfg.color}`,
        }}
      />

      {/* 기관명 + 인터페이스명 */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={600} c="gray.2" truncate>
          {s.targetSystem}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {s.interfaceName}
        </Text>
      </Box>

      {/* 응답 시간 */}
      <Text
        size="xs"
        fw={600}
        style={{
          fontFamily: 'monospace',
          color: s.lastExecutionTime >= 1500 ? '#eab308' : '#94a3b8',
          flexShrink: 0,
        }}
      >
        {ms(s.lastExecutionTime)}
      </Text>

      {/* 상태 배지 */}
      <Badge
        size="xs"
        style={{ background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}55`, flexShrink: 0 }}
      >
        {cfg.label}
      </Badge>
    </Box>
  )
}

// ─── 컴포넌트: 이슈 타임라인 행 ──────────────────────────────────────────────

function IssueRow({ s }: { s: RecentFailure }) {
  return (
    <Group
      px="md"
      py={12}
      gap="md"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <ThemeIcon size={32} radius="xl" style={{ background: '#ef444422', color: '#ef4444', flexShrink: 0 }}>
        <IconAlertTriangle size={18} />
      </ThemeIcon>

      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group gap={8} mb={2}>
          <Text size="sm" fw={700} c="red.4">{s.targetSystem}</Text>
          <Badge size="xs" color="red" variant="filled">FAIL</Badge>
          <Text size="xs" c="dimmed" truncate>{s.interfaceName}</Text>
        </Group>

        {/* 에러 메시지 (error_msg) 노출 */}
        <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: '90%' }}>
          {s.message || '상세 에러 메시지 없음'}
        </Text>
      </Box>

      <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
        <Text size="xs" fw={600} c="gray.3" style={{ fontFamily: 'monospace' }}>
          {formatFullTime(s.requestedAt)}
        </Text>
        <Text size="10px" c="dimmed">
          {ms(s.responseTime)}
        </Text>
      </Stack>

      <IconChevronRight size={14} color="var(--mantine-color-gray-7)" />
    </Group>
  )
}

// ─── 섹션 헤더 컴포넌트 ───────────────────────────────────────────────────────

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
  return (
    <Group gap="sm" mb="sm">
      <ThemeIcon size={22} radius="sm" variant="transparent" c="indigo.4">
        {icon}
      </ThemeIcon>
      <Text fw={700} size="sm" c="gray.2" style={{ letterSpacing: '0.3px' }}>
        {title}
      </Text>
      {badge && (
        <Badge size="xs" variant="light" color="indigo" ml="auto">
          {badge}
        </Badge>
      )}
    </Group>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const PAPER_STYLE: React.CSSProperties = {
  background: 'rgba(10, 12, 22, 0.95)',
  border: '1px solid rgba(99, 107, 183, 0.18)',
  backdropFilter: 'blur(12px)',
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [systems, setSystems] = useState<SystemStatus[]>([])
  const [failures, setFailures] = useState<RecentFailure[]>([])
  const [rollingData, setRolling] = useState<ChartDataPoint[]>([])
  const [todayData, setToday] = useState<ChartDataPoint[]>([])

  const [statsLoading, setStatsL] = useState(true)
  const [sysLoading, setSysL] = useState(true)
  const [failLoading, setFailL] = useState(true)
  const [chartLoading, setChartL] = useState(true)

  const [activeTab, setActiveTab] = useState<string | null>('rolling')
  const [lastRefreshed, setRefreshed] = useState(new Date())

  // ── 데이터 로딩 ────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    setStatsL(true)
    try { setStats(await getStats()) } catch { /* no-op */ }
    finally { setStatsL(false) }
  }, [])

  const loadSystems = useCallback(async () => {
    setSysL(true)
    try { setSystems(await getSystemStatus()) } catch { setSystems([]) }
    finally { setSysL(false) }
  }, [])

  const loadFailures = useCallback(async () => {
    setFailL(true)
    try { setFailures(await getRecentFailures()) } catch { setFailures([]) }
    finally { setFailL(false) }
  }, [])

  const loadCharts = useCallback(async () => {
    setChartL(true)
    try {
      const [r, t] = await Promise.all([getRollingChart(), getTodayChart()])
      setRolling(r)
      setToday(t)
    } catch {
      setRolling([])
      setToday([])
    } finally {
      setChartL(false)
    }
  }, [])

  const refresh = useCallback(() => {
    setRefreshed(new Date())
    loadStats()
    loadSystems()
    loadFailures()
    loadCharts()
  }, [loadStats, loadSystems, loadFailures, loadCharts])

  useEffect(() => { refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getErrorMessage = (message: string) => {
    if (!message) return '상세 에러 없음';
    if (message.includes('400')) return '잘못된 요청 (데이터 형식 오류)';
    if (message.includes('401')) return '인증 실패 (권한 없음)';
    if (message.includes('403')) return '접근 거부';
    if (message.includes('404')) return '경로 오류 (존재하지 않는 API)';
    if (message.includes('500')) return '서버 내부 오류';
    if (message.includes('503')) return '서비스 점검 중';
    if (message.toLowerCase().includes('timeout')) return '응답 시간 초과';
    return message;
  };

  // ── 파생 데이터 ────────────────────────────────────────────────────────────

  const today = stats?.today

  // ── 렌더링 ─────────────────────────────────────────────────────────────────

  return (
    <Stack gap="lg">
      {/* ── 헤더 바 ── */}
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <IconShieldCheck size={16} color="var(--mantine-color-indigo-4)" />
          <Text size="xs" c="dimmed" style={{ letterSpacing: '0.5px' }}>
            마지막 갱신:{' '}
            {lastRefreshed.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        </Group>
        <Button
          size="xs"
          variant="light"
          color="indigo"
          leftSection={statsLoading || sysLoading || chartLoading
            ? <Loader size={12} />
            : <IconRefresh size={14} />}
          onClick={refresh}
        >
          새로고침
        </Button>
      </Group>

      {/* ── TOP: 통계 카드 4개 ── */}
      <Group grow gap="md">
        <StatTile
          label="오늘 호출수"
          value={formatNum(today?.totalCount)}
          sub={`전체 ${formatNum(stats?.total.totalCount)}건`}
          accent="#6366f1"
          icon={<IconActivity size={15} />}
          loading={statsLoading}
        />
        <StatTile
          label="성공률"
          value={pct(today?.successRate)}
          sub={`성공 ${formatNum(today?.successCount)}건`}
          accent="#22c55e"
          icon={<IconShieldCheck size={15} />}
          loading={statsLoading}
        />
        <StatTile
          label="에러 건수"
          value={formatNum(today?.failCount)}
          sub={today?.failCount ? '즉시 확인 필요' : '이상 없음'}
          accent={today?.failCount ? '#ef4444' : '#22c55e'}
          icon={<IconAlertTriangle size={15} />}
          loading={statsLoading}
        />
        <StatTile
          label="평균 응답시간"
          value={ms(today?.averageResponseTime)}
          sub={today?.averageResponseTime && today.averageResponseTime >= 1500 ? '⚠ 지연 감지' : '정상 범위'}
          accent={today?.averageResponseTime && today.averageResponseTime >= 1500 ? '#eab308' : '#38bdf8'}
          icon={<IconClock size={15} />}
          loading={statsLoading}
        />
      </Group>

      {/* ── MIDDLE: 차트(70%) + 기관 리스트(30%) ── */}
      <Grid gutter="md">
        {/* 좌측: 차트 */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper radius="md" style={{ ...PAPER_STYLE, height: '100%' }}>
            <Box p="md">
              <SectionHeader icon={<IconTimeline size={15} />} title="호출 트래픽 현황" />

              <Tabs
                value={activeTab}
                onChange={setActiveTab}
                styles={{ tab: { fontSize: '0.78rem', padding: '6px 12px' } }}
              >
                <Tabs.List mb="md">
                  <Tabs.Tab value="rolling">24시간 추이</Tabs.Tab>
                  <Tabs.Tab value="today">오늘의 트래픽</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="rolling">
                  <DashChart data={rollingData} loading={chartLoading} />
                </Tabs.Panel>
                <Tabs.Panel value="today">
                  <DashChart data={todayData} loading={chartLoading} />
                </Tabs.Panel>
              </Tabs>
            </Box>
          </Paper>
        </Grid.Col>

        {/* 우측: 기관별 슬림 리스트 */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper radius="md" style={{ ...PAPER_STYLE, height: '100%' }}>
            <Box p="md" pb={0}>
              <SectionHeader
                icon={<IconTargetArrow size={15} />}
                title="기관별 실시간 상태"
                badge={`${systems.length}개`}
              />
            </Box>

            {sysLoading ? (
              <Stack gap={1} p="md">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={48} radius="sm" />)}
              </Stack>
            ) : (
              <ScrollArea h={320} scrollbarSize={4}>
                {systems.length === 0 ? (
                  <Box style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text size="sm" c="dimmed">연결된 기관이 없습니다.</Text>
                  </Box>
                ) : (
                  // FAIL → warn → ok 순서로 정렬
                  [...systems]
                    .sort((a, b) => {
                      const order: Record<HealthLevel, number> = { error: 0, warn: 1, unknown: 2, ok: 3 }
                      return order[getHealth(a)] - order[getHealth(b)]
                    })
                    .map((s) => (
                      <SystemRow key={s.configId} s={s} onClick={() => navigate('/logs')} />
                    ))
                )}
              </ScrollArea>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      {/* ── BOTTOM: 실시간 이슈 타임라인 ── */}
      <Paper radius="md" style={PAPER_STYLE}>
        <Box p="md" pb={0}>
          <SectionHeader
            icon={<IconAlertTriangle size={15} />}
            title="실시간 이슈 타임라인"
            badge={failures.length > 0 ? `${failures.length}건` : undefined}
          />
        </Box>

        {failLoading ? (
          <Stack gap={1} p="md">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={52} radius="sm" />)}
          </Stack>
        ) : failures.length === 0 ? (
          <Group gap="sm" p="lg" style={{ justifyContent: 'center' }}>
            <ThemeIcon size={24} radius="xl" style={{ background: '#22c55e22', color: '#22c55e' }}>
              <IconCheck size={14} />
            </ThemeIcon>
            <Text size="sm" c="dimmed">현재 감지된 이슈가 없습니다. 모든 기관이 정상 운영 중입니다.</Text>
          </Group>
        ) : (
          <Box>
            {failures.map((f) => (
              <Tooltip key={f.id} label="로그 페이지에서 상세 분석" position="top">
                <Box
                  onClick={() => navigate(`/logs?target_system=${f.targetSystem}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <IssueRow
                    s={{
                      ...f,
                      message: getErrorMessage(f.message)
                    }}
                  />
                </Box>
              </Tooltip>
            ))}
          </Box>
        )}
      </Paper>
    </Stack>
  )
}
