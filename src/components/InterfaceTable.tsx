import { useEffect, useState } from 'react'
import { notifications } from '@mantine/notifications'
import {
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Table,
  Text,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconPlayerPlay,
  IconRefresh,
  IconWifi,
} from '@tabler/icons-react'
import axios from 'axios'
import { type ApiConfig, getApiConfigs, runInterface } from '../api/apiConfigs'

// ─── 유틸리티 ──────────────────────────────────────────────────────────────────

function getProtocolColor(protocol: string): string {
  const map: Record<string, string> = {
    REST: 'indigo',
    SOAP: 'violet',
    GRPC: 'cyan',
    GRAPHQL: 'pink',
    MQ: 'orange',
  }
  return map[protocol.toUpperCase()] ?? 'gray'
}

function formatDate(dateString: string) {
  if (!dateString) return '-'
  try {
    const d = new Date(dateString)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return dateString
  }
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function InterfaceTable() {
  const [configs, setConfigs] = useState<ApiConfig[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())

  // ── 목록 조회 ──────────────────────────────────────────────────────────────

  const fetchConfigs = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getApiConfigs()
      setConfigs(data)
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? `서버 연결 실패: ${err.message}`
        : '알 수 없는 오류가 발생했습니다.'
      setError(message)
      notifications.show({
        title: '목록 조회 실패',
        message,
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  // ── 인터페이스 실행 ────────────────────────────────────────────────────────

  const handleRun = async (config: ApiConfig) => {
    if (runningIds.has(config.id)) return;
    setRunningIds((prev) => new Set(prev).add(config.id));

    try {
      const result = await runInterface(config.id);

      // 1. 실제 비즈니스 로직 결과를 확인 (예: status가 FAIL인 경우)
      if (result.status === 'FAIL') {
        notifications.show({
          title: `처리 대기 중 — ${config.name}`,
          message: '⚠️ 요청 실패. 잠시 후 재시도 예정',
          color: 'orange',
          icon: <IconRefresh size={16} />,
          autoClose: 5000,
        });
      } else {
        // 2. 진짜 성공했을 때
        notifications.show({
          title: '요청 성공',
          message: `[${config.name}] 정상적으로 요청되었습니다.`,
          color: 'teal',
          icon: <IconCircleCheck size={16} />,
          autoClose: 4000,
        });
      }
    } catch (err) {
      // 3. 서버가 죽었거나 통신 자체가 불가능할 때 (400, 500 에러)
      notifications.show({
        title: '시스템 오류',
        message: '오류 발생, 해당 기관에 문의해주세요.',
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
        autoClose: 5000,
      });
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(config.id);
        return next;
      });
    }
  };

  // ── 로딩 상태 ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Center h={300}>
        <Box style={{ textAlign: 'center' }}>
          <Loader size="lg" color="indigo" variant="dots" />
          <Text mt="md" c="dimmed" size="sm">인터페이스 목록을 불러오는 중입니다…</Text>
        </Box>
      </Center>
    )
  }

  // ── 에러 상태 ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Center h={300}>
        <Box style={{ textAlign: 'center' }}>
          <IconWifi size={48} opacity={0.3} />
          <Text mt="sm" c="dimmed" size="sm" mb="md">{error}</Text>
          <Button leftSection={<IconRefresh size={16} />} variant="light" color="indigo" onClick={fetchConfigs}>
            다시 시도
          </Button>
        </Box>
      </Center>
    )
  }

  // ── 정상 렌더링 ────────────────────────────────────────────────────────────

  return (
    <Paper
      radius="lg"
      style={{
        background: 'rgba(19, 21, 31, 0.8)',
        border: '1px solid rgba(99, 107, 183, 0.2)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
      }}
    >
      {/* 테이블 상단 툴바 */}
      <Group px="lg" py="md" justify="space-between">
        <Group gap="sm">
          <Text fw={600} size="sm" c="gray.2">인터페이스 목록</Text>
          <Badge variant="light" color="indigo" size="sm">{configs.length}건</Badge>
        </Group>
        <Tooltip label="목록 새로고침" position="left">
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<IconRefresh size={14} />}
            onClick={fetchConfigs}
            loading={loading}
          >
            새로고침
          </Button>
        </Tooltip>
      </Group>

      {/* 테이블 */}
      <ScrollArea>
        <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="lg" style={{ minWidth: 1000 }}>
          <Table.Thead style={{ background: 'rgba(99, 107, 183, 0.08)', borderBottom: '1px solid rgba(99, 107, 183, 0.2)' }}>
            <Table.Tr>
              <Table.Th style={{ width: 56 }}>
                <Text size="xs" fw={600} c="gray.4">#</Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={600} c="gray.4">기관명</Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={600} c="gray.4">API 이름</Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={600} c="gray.4">프로토콜</Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={600} c="gray.4">URI</Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={600} c="gray.4">설명</Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={600} c="gray.4">최종 수정일</Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={600} c="gray.4">최종 수정자</Text>
              </Table.Th>
              <Table.Th style={{ width: 100, textAlign: 'center' }}>
                <Text size="xs" fw={600} c="gray.4">실행</Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {configs.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={9}>
                  <Center py="xl">
                    <Text c="dimmed" size="sm">등록된 인터페이스가 없습니다.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              configs.map((config, index) => (
                <InterfaceRow
                  key={config.id}
                  index={configs.length - index}
                  config={config}
                  isRunning={runningIds.has(config.id)}
                  onRun={handleRun}
                />
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  )
}

// ─── 행 컴포넌트 ───────────────────────────────────────────────────────────────

interface InterfaceRowProps {
  index: number
  config: ApiConfig
  isRunning: boolean
  onRun: (config: ApiConfig) => void
}

function InterfaceRow({ index, config, isRunning, onRun }: InterfaceRowProps) {
  const raw = config as any

  // updated_by 유저 login_id — 백엔드 relation 이름에 따라 키가 다를 수 있음
  const updatedByLoginId: string =
    raw.users_api_configs_updated_byTousers?.login_id ??
    raw.updatedBy?.login_id ??
    raw.updated_by_user?.login_id ??
    '-'

  const updatedAt: string = raw.updated_at ?? raw.updatedAt ?? ''

  return (
    <Table.Tr style={{ transition: 'background 0.15s ease', borderBottom: '1px solid rgba(99, 107, 183, 0.08)' }}>
      {/* 번호 */}
      <Table.Td>
        <Text size="sm" c="gray.5" style={{ fontFamily: 'monospace' }}>{index}</Text>
      </Table.Td>

      {/* 기관명 */}
      <Table.Td>
        <Text size="sm" fw={600} c="gray.1">{config.target_system ?? raw.target_system ?? '-'}</Text>
      </Table.Td>

      {/* API 이름 */}
      <Table.Td>
        <Text size="sm" fw={500} c="gray.2">{config.name}</Text>
      </Table.Td>

      {/* 프로토콜 */}
      <Table.Td>
        <Badge
          variant="light"
          color={getProtocolColor(config.protocol)}
          size="sm"
          radius="sm"
          style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
        >
          {config.protocol}
        </Badge>
      </Table.Td>

      {/* URI */}
      <Table.Td>
        <Text size="xs" c="indigo.3" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {config.url ?? config.endpoint ?? '-'}
        </Text>
      </Table.Td>

      {/* 설명 */}
      <Table.Td>
        <Tooltip label={config.description ?? '-'} disabled={!config.description} multiline w={240}>
          <Text size="sm" c="gray.4" lineClamp={1} style={{ maxWidth: 180 }}>
            {config.description ?? '-'}
          </Text>
        </Tooltip>
      </Table.Td>

      {/* 최종 수정일 */}
      <Table.Td>
        <Text size="sm" c="gray.3" style={{ fontFamily: 'monospace' }}>
          {formatDate(updatedAt)}
        </Text>
      </Table.Td>

      {/* 최종 수정자 */}
      <Table.Td>
        <Text size="sm" c="gray.3">{updatedByLoginId}</Text>
      </Table.Td>

      {/* 실행 버튼 */}
      <Table.Td style={{ textAlign: 'center' }}>
        <Button
          size="xs"
          variant="gradient"
          gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
          leftSection={isRunning ? <Loader size={12} color="white" /> : <IconPlayerPlay size={12} />}
          loading={isRunning}
          disabled={isRunning}
          onClick={() => onRun(config)}
          style={{ minWidth: 72 }}
        >
          {isRunning ? '실행 중' : '실행'}
        </Button>
      </Table.Td>
    </Table.Tr>
  )
}
