import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Code,
  Drawer,
  Group,
  Loader,
  Pagination,
  Paper,
  ScrollArea,
  Select,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconAlertTriangle,
  IconClock,
  IconCode,
  IconDownload,
  IconRefresh,
  IconSearch,
  IconWifi,
} from '@tabler/icons-react'
import { getApiLogs, type ApiLog } from '../api/apiLogs'
import { bulkDownloadFtpFiles } from '../api/ftp'
import axios from 'axios'

// ─── 유틸리티 ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  if (!dateString) return '-'
  try {
    const d = new Date(dateString)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return dateString
  }
}

function formatJson(data: any) {
  if (!data) return ''
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(data)
  }
}

/** display_status 값에 따라 뱃지 색상 분기 */
function getStatusColor(displayStatus: string) {
  switch (displayStatus) {
    case '성공': return 'teal'
    case '최종 실패': return 'red'
    case '재처리 대기 중': return 'yellow'
    case '실패': return 'orange'
    default: return 'gray'
  }
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────────

export default function ApiLogsPage() {
  const [searchParams] = useSearchParams()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ── 체크박스 & 다운로드 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)

  // ── 필터 상태
  const [searchTargetSystem, setSearchTargetSystem] = useState(searchParams.get('target_system') || '')
  const [filterDisplayStatus, setFilterDisplayStatus] = useState<string | null>(null)
  const [searchLoginId, setSearchLoginId] = useState('')
  const [searchCorrelationId, setSearchCorrelationId] = useState('')

  // ── 페이징 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState('50')
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── 상세 보기 Drawer 상태
  const [opened, { open, close }] = useDisclosure(false)
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null)

  // 검색어 debounce 처리 (500ms)
  const [debouncedTargetSystem, setDebouncedTargetSystem] = useState('')
  const [debouncedLoginId, setDebouncedLoginId] = useState('')
  const [debouncedCorrelationId, setDebouncedCorrelationId] = useState('')

  // ── 데이터 조회 ────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getApiLogs({
        target_system: searchTargetSystem || undefined,
        display_status: filterDisplayStatus || undefined,
        login_id: searchLoginId || undefined,
        correlation_id: searchCorrelationId || undefined,
        page: currentPage,
        limit: Number(itemsPerPage),
      })
      setLogs(response.data)
      setTotalItems(response.total)
      setTotalPages(response.totalPages)
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
  }, [debouncedTargetSystem, filterDisplayStatus, debouncedLoginId, debouncedCorrelationId, currentPage, itemsPerPage]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTargetSystem(searchTargetSystem), 500)
    return () => clearTimeout(timer)
  }, [searchTargetSystem])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLoginId(searchLoginId), 500)
    return () => clearTimeout(timer)
  }, [searchLoginId])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCorrelationId(searchCorrelationId), 500)
    return () => clearTimeout(timer)
  }, [searchCorrelationId])

  // fetchLogs는 debounce된 값 + status(즉시반응) + pagination 값 기준으로 실행
  useEffect(() => {
    fetchLogs()
  }, [debouncedTargetSystem, filterDisplayStatus, debouncedLoginId, debouncedCorrelationId, currentPage, itemsPerPage])

  // 검색어가 변경될 때 페이지 1로 초기화 (검색 후 useEffect가 fetchLogs 호출)
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedTargetSystem, filterDisplayStatus, debouncedLoginId, debouncedCorrelationId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  // ── 상세 보기 핸들러 ────────────────────────────────────────────────────────

  const handleViewDetails = (log: ApiLog) => {
    setSelectedLog(log)
    open()
  }

  // ── 체크박스 & 다운로드 로직 ────────────────────────────────────────────────
  const validLogs = useMemo(() => {
    return logs.map(log => {
      const raw = log as any
      // correlationId가 있으면 사용, 없으면 logId 사용 (사용자 요청 사항)
      return raw.correlationId ?? raw.correlation_id ?? log.logId ?? '-'
    }).filter(id => id !== '-')
  }, [logs])

  const allChecked = validLogs.length > 0 && selectedIds.size === validLogs.length
  const indeterminate = selectedIds.size > 0 && selectedIds.size < validLogs.length

  const toggleAll = () =>
    setSelectedIds(allChecked ? new Set() : new Set(validLogs))

  const toggleOne = (id: string) => {
    if (id === '-') return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return
    setDownloading(true)
    try {
      const { blob, filename } = await bulkDownloadFtpFiles(Array.from(selectedIds))

      const url = window.URL.createObjectURL(new Blob([blob]))
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'Img_download.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      notifications.show({
        title: '다운로드 시작',
        message: '파일 다운로드가 시작되었습니다.',
        color: 'teal',
      })
      setSelectedIds(new Set())
    } catch (err: any) {
      let errorMessage = '파일을 일괄 다운로드할 수 없습니다.'
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const errorJson = JSON.parse(text)
          if (errorJson.message) errorMessage = errorJson.message
        } catch (e) { }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      }
      notifications.show({
        title: '다운로드 실패',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertTriangle size={16} />
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleRefresh = () => {
    // 1. 검색 상태 초기화
    setSearchTargetSystem('')
    setFilterDisplayStatus(null)
    setSearchLoginId('')
    setSearchCorrelationId('')
    setCurrentPage(1)
    // 2. useEffect가 의존성 변화 감지해서 fetchLogs 자동 실행됨
  }

  // ── 렌더링: 로딩 / 에러 ────────────────────────────────────────────────────

  if (loading && logs.length === 0) {
    return (
      <Center h={400}>
        <Box style={{ textAlign: 'center' }}>
          <Loader size="lg" color="indigo" variant="dots" />
          <Text mt="md" c="dimmed" size="sm">로그 데이터를 불러오는 중입니다…</Text>
        </Box>
      </Center>
    )
  }

  if (error && logs.length === 0) {
    return (
      <Center h={400}>
        <Box style={{ textAlign: 'center' }}>
          <IconWifi size={48} opacity={0.3} />
          <Text mt="sm" c="dimmed" size="sm" mb="md">{error}</Text>
          <Button leftSection={<IconRefresh size={16} />} variant="light" color="indigo" onClick={fetchLogs}>
            다시 시도
          </Button>
        </Box>
      </Center>
    )
  }

  // ── 렌더링: 정상 ────────────────────────────────────────────────────────────

  return (
    <>
      <Paper
        radius="lg"
        style={{
          background: 'rgba(19, 21, 31, 0.8)',
          border: '1px solid rgba(99, 107, 183, 0.2)',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 120px)',
        }}
      >
        {/* 상단 툴바 / 필터 영역 */}
        <Box px="lg" py="md" style={{ borderBottom: '1px solid rgba(99, 107, 183, 0.2)' }}>
          <Group justify="space-between" align="flex-end">
            <Group gap="md">
              {/* 로그 식별자 검색 */}
              <TextInput
                placeholder="로그 식별자 검색"
                leftSection={<IconSearch size={16} />}
                value={searchCorrelationId}
                onChange={(e) => setSearchCorrelationId(e.currentTarget.value)}
                size="sm"
                w={200}
              />

              {/* 기관명 검색 */}
              <TextInput
                placeholder="기관명 검색"
                leftSection={<IconSearch size={16} />}
                value={searchTargetSystem}
                onChange={(e) => setSearchTargetSystem(e.currentTarget.value)}
                size="sm"
                w={200}
              />

              {/* 상태 필터 — 백엔드 display_status 한글값 그대로 사용 */}
              <Select
                placeholder="상태 전체"
                data={[
                  { value: '성공', label: '성공' },
                  { value: '실패', label: '실패' },
                  { value: '재처리 대기 중', label: '재처리 대기 중' },
                ]}
                value={filterDisplayStatus}
                onChange={setFilterDisplayStatus}
                clearable
                size="sm"
                w={160}
              />

              {/* 처리자 검색 */}
              <TextInput
                placeholder="처리자 ID 검색"
                leftSection={<IconSearch size={16} />}
                value={searchLoginId}
                onChange={(e) => setSearchLoginId(e.currentTarget.value)}
                size="sm"
                w={180}
              />
            </Group>

            <Group gap="sm">
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                  leftSection={<IconDownload size={16} />}
                  onClick={handleBulkDownload}
                  loading={downloading}
                  px="md"
                >
                  다운로드 ({selectedIds.size}개)
                </Button>
              )}
              <Badge variant="light" color="indigo" size="lg">
                총 {totalItems}건
              </Badge>
              <Tooltip label="새로고침">
                <Button size="sm" variant="subtle" color="gray" px="xs" onClick={fetchLogs} loading={loading}>
                  <IconRefresh size={18} />
                </Button>
              </Tooltip>
              <Button variant="subtle" color="gray" onClick={handleRefresh}>
                초기화
              </Button>
            </Group>
          </Group>
        </Box>

        {/* 테이블 영역 */}
        <ScrollArea style={{ flex: 1 }} viewportRef={scrollRef}>
          <Table stickyHeader striped highlightOnHover verticalSpacing="sm" horizontalSpacing="lg" style={{ minWidth: 1200 }}>
            <Table.Thead style={{ background: '#13151f', position: 'relative', zIndex: 5, whiteSpace: 'nowrap' }}>
              <Table.Tr>
                <Table.Th style={{ width: 40, textAlign: 'center' }}>
                  <Checkbox
                    size="xs"
                    checked={allChecked}
                    indeterminate={indeterminate}
                    onChange={toggleAll}
                    styles={{ input: { cursor: 'pointer' } }}
                  />
                </Table.Th>
                <Table.Th style={{ width: 56 }}>
                  <Text size="xs" fw={600} c="gray.4">#</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600} c="gray.4">요청 일시</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600} c="gray.4">거래 일련번호</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600} c="gray.4">업로드 식별 번호</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600} c="gray.4">기관명</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600} c="gray.4">API명</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600} c="gray.4">상태</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600} c="gray.4">재요청 횟수</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600} c="gray.4">응답 시간</Text>
                </Table.Th>
                <Table.Th style={{ width: 100, textAlign: 'center' }}>
                  <Text size="xs" fw={600} c="gray.4">상세</Text>
                </Table.Th>
                <Table.Th>
                  <Text size="xs" fw={600} c="gray.4">처리자</Text>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={12}>
                    <Center py="xl">
                      <Text c="dimmed" size="sm">조건에 맞는 로그가 없습니다.</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                logs.map((log, index) => {
                  const raw = log as any
                  const targetSystem: string =
                    raw.api_configs?.target_system ?? raw.target_system ?? '-'
                  const displayStatus: string = raw.display_status ?? log.status ?? '-'
                  const loginId: string =
                    raw.users?.login_id ?? raw.login_id ?? '-'
                  const requestedAt: string =
                    log.requestedAt ?? raw.requested_at ?? ''
                  const responseTime =
                    log.responseTime ?? raw.execution_time_ms ?? '-'
                  const retryCount: string =
                    raw.api_configs?.retry_count ?? raw.retry_count ?? '-'
                  // const correlationId: string =
                  //   raw.api_configs?.correlation_id ?? raw.correlation_id ?? '-'
                  const apiName: string =
                    raw.api_configs?.name ?? raw.name ?? '-'
                  const requestGroupId: string = raw.request_group_id ?? raw.requestGroupId ?? '-'

                  // 선택 및 다운로드에 사용할 ID (사용자 요청: correlationId 우선, 없으면 logId)
                  const effectiveId: string = raw.correlationId ?? raw.correlation_id ?? log.logId ?? '-'
                  const isChecked = effectiveId !== '-' && selectedIds.has(effectiveId)

                  return (
                    <Table.Tr
                      key={log.logId || log.id}
                      style={{
                        borderBottom: '1px solid rgba(99, 107, 183, 0.08)',
                        background: isChecked ? 'rgba(99, 107, 183, 0.08)' : undefined,
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* 체크박스 */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        {effectiveId !== '-' ? (
                          <Checkbox
                            size="xs"
                            checked={isChecked}
                            onChange={() => toggleOne(effectiveId)}
                            styles={{ input: { cursor: 'pointer' } }}
                          />
                        ) : null}
                      </Table.Td>

                      {/* 번호 */}
                      <Table.Td>
                        <Text size="sm" c="gray.5" style={{ fontFamily: 'monospace' }}>
                          {(raw as any).idx ?? ((currentPage - 1) * Number(itemsPerPage) + index + 1)}
                        </Text>
                      </Table.Td>

                      {/* 날짜 */}
                      <Table.Td>
                        <Text size="sm" c="gray.3" style={{ fontFamily: 'monospace' }}>
                          {formatDate(requestedAt)}
                        </Text>
                      </Table.Td>

                      {/* 로그 식별자 */}
                      <Table.Td>
                        <Text size="sm" c="gray.3" style={{ fontFamily: 'monospace' }}>
                          {effectiveId}
                        </Text>
                      </Table.Td>

                      {/* 업로드 식별 번호 */}
                      <Table.Td>
                        <Text size="sm" c="indigo.2" style={{ fontFamily: 'monospace' }}>
                          {requestGroupId}
                        </Text>
                      </Table.Td>

                      {/* 기관명 */}
                      <Table.Td>
                        <Text size="sm" fw={500} c="gray.1">{targetSystem}</Text>
                      </Table.Td>

                      {/* API명 */}
                      <Table.Td>
                        <Text size="sm" fw={500} c="gray.1">{apiName}</Text>
                      </Table.Td>

                      {/* 상태 — display_status 한글값 + 색상 분기 */}
                      <Table.Td>
                        <Badge
                          variant="dot"
                          color={getStatusColor(displayStatus)}
                          size="sm"
                        >
                          {displayStatus}
                        </Badge>
                      </Table.Td>

                      {/* 재처리 횟수 */}
                      <Table.Td>
                        <Text size="sm" fw={500} c="gray.1">{retryCount}</Text>
                      </Table.Td>

                      {/* 응답 시간 */}
                      <Table.Td>
                        <Group gap={4}>
                          <IconClock size={14} color="#636bb7" />
                          <Text size="sm" fw={600} c="indigo.2">
                            {responseTime}
                            {responseTime !== '-' && (
                              <Text span size="xs" c="dimmed"> ms</Text>
                            )}
                          </Text>
                        </Group>
                      </Table.Td>

                      {/* 상세 버튼 */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Button
                          size="xs"
                          variant="light"
                          color="indigo"
                          leftSection={<IconCode size={14} />}
                          onClick={() => handleViewDetails(log)}
                        >
                          보기
                        </Button>
                      </Table.Td>

                      {/* 처리자 */}
                      <Table.Td>
                        <Text size="sm" c="gray.3">{loginId}</Text>
                      </Table.Td>
                    </Table.Tr>
                  )
                })
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {/* 하단 제어 바 */}
        <Group justify="space-between" align="center" px="lg" py="md" style={{ borderTop: '1px solid rgba(99, 107, 183, 0.2)' }}>
          <Select
            data={[
              { value: '50', label: '50개씩 보기' },
              { value: '100', label: '100개씩 보기' },
              { value: '300', label: '300개씩 보기' },
            ]}
            value={itemsPerPage}
            onChange={(val) => {
              setItemsPerPage(val || '50')
              setCurrentPage(1)
            }}
            size="sm"
            w={130}
          />

          <Pagination.Root
            total={totalPages}
            value={currentPage}
            onChange={setCurrentPage}
            siblings={2}
          >
            <Group gap={5} justify="center">
              <Pagination.First
                onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(1, p - 10)) }}
              />
              <Pagination.Previous />
              <Pagination.Items />
              <Pagination.Next />
              <Pagination.Last
                onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(totalPages, p + 10)) }}
              />
            </Group>
          </Pagination.Root>

          <Text size="sm" c="gray.4">
            현재 페이지 <Text span fw={700} c="indigo.2">{currentPage}</Text> / 총 {totalPages}개
          </Text>
        </Group>
      </Paper>

      {/* 상세 보기 Drawer */}
      <Drawer
        opened={opened}
        onClose={close}
        title={<Text fw={700} size="lg">로그 상세 정보</Text>}
        position="right"
        size="lg"
        overlayProps={{ opacity: 0.5, blur: 4 }}
        styles={{
          content: { background: '#13151f' },
          header: { background: '#13151f', borderBottom: '1px solid rgba(99, 107, 183, 0.2)' },
          title: { color: '#fff' },
          close: { color: '#fff' },
        }}
      >
        {selectedLog && (() => {
          const raw = selectedLog as any
          const displayStatus: string = raw.display_status ?? selectedLog.status ?? '-'
          const requestedAt: string = selectedLog.requestedAt ?? raw.requested_at ?? ''

          return (
            <Box mt="md">
              <Group mb="lg">
                <Badge color={getStatusColor(displayStatus)}>
                  {displayStatus}
                </Badge>
                <Text size="sm" c="dimmed">{formatDate(requestedAt)}</Text>
              </Group>

              {selectedLog.errorMessage && (
                <Box mb="xl">
                  <Text size="sm" fw={600} mb="xs" c="red.4">에러 메시지</Text>
                  <Paper p="sm" bg="rgba(250, 82, 82, 0.1)" style={{ border: '1px solid rgba(250, 82, 82, 0.2)' }}>
                    <Text size="sm" c="red.2">{selectedLog.errorMessage}</Text>
                  </Paper>
                </Box>
              )}

              <Box mb="xl">
                <Text size="sm" fw={600} mb="xs" c="gray.3">요청 페이로드 (Request)</Text>
                <ScrollArea.Autosize mah={300} bg="#0f1117" p="sm" style={{ borderRadius: 8, border: '1px solid rgba(99, 107, 183, 0.2)' }}>
                  <Code block bg="transparent" c="indigo.1">
                    {formatJson(raw.requestPayload ?? raw.request_payload ?? '데이터 없음')}
                  </Code>
                </ScrollArea.Autosize>
              </Box>

              <Box>
                <Text size="sm" fw={600} mb="xs" c="gray.3">응답 페이로드 (Response)</Text>
                <ScrollArea.Autosize mah={400} bg="#0f1117" p="sm" style={{ borderRadius: 8, border: '1px solid rgba(99, 107, 183, 0.2)' }}>
                  <Code block bg="transparent" c="teal.1">
                    {formatJson(raw.responsePayload ?? raw.response_payload ?? '데이터 없음')}
                  </Code>
                </ScrollArea.Autosize>
              </Box>
            </Box>
          )
        })()}
      </Drawer>
    </>
  )
}