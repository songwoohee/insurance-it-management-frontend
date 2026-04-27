import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { useDisclosure } from '@mantine/hooks'
import {
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Drawer,
  FileInput,
  Group,
  Loader,
  Modal,
  Pagination,
  Paper,
  ScrollArea,
  Select,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconEdit,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconWifi,
  IconUpload,
  IconDownload,
  IconList,
} from '@tabler/icons-react'
import axios from 'axios'
import {
  type ApiConfig,
  type ApiConfigFormData,
  createApiConfig,
  deleteApiConfig,
  getApiConfigs,
  runInterface,
  updateApiConfig,
} from '../api/apiConfigs'
import { uploadFtpFile, getFtpList } from '../api/ftp'

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const PROTOCOL_OPTIONS = ['REST', 'SOAP', 'MQ', 'gRPC', 'GraphQL', 'FTP']
const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const EMPTY_FORM: ApiConfigFormData = {
  name: '',
  target_system: '',
  protocol: 'REST',
  url: '',
  method: 'POST',
  description: '',
}

// ─── 유틸리티 ──────────────────────────────────────────────────────────────────

function getProtocolColor(protocol: string): string {
  const map: Record<string, string> = {
    'REST API': 'indigo',
    REST: 'indigo',
    SOAP: 'violet',
    GRPC: 'cyan',
    GRAPHQL: 'pink',
    MQ: 'orange',
    FTP: 'gray'
  }
  return map[protocol.toUpperCase()] ?? map[protocol] ?? 'gray'
}

function getMethodColor(method: string): string {
  const map: Record<string, string> = {
    GET: 'teal',
    POST: 'blue',
    PUT: 'orange',
    PATCH: 'yellow',
    DELETE: 'red',
  }
  return map[method?.toUpperCase()] ?? 'gray'
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

// ─── 등록/수정 모달 ────────────────────────────────────────────────────────────

interface ConfigModalProps {
  opened: boolean
  onClose: () => void
  editTarget: ApiConfig | null
  onSuccess: () => void
}

function ConfigModal({ opened, onClose, editTarget, onSuccess }: ConfigModalProps) {
  const isEdit = editTarget !== null
  const [form, setForm] = useState<ApiConfigFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // 모달이 열릴 때마다 폼 초기화
  useEffect(() => {
    if (opened) {
      if (editTarget) {
        setForm({
          name: editTarget.name ?? '',
          target_system: editTarget.target_system ?? '',
          protocol: editTarget.protocol ?? 'REST API',
          url: (editTarget.url ?? editTarget.endpoint ?? '') as string,
          method: (editTarget.method ?? 'POST') as string,
          description: (editTarget.description ?? '') as string,
        })
      } else {
        setForm(EMPTY_FORM)
      }
    }
  }, [opened, editTarget])

  const set = (key: keyof ApiConfigFormData) => (val: string | null) =>
    setForm((prev) => ({ ...prev, [key]: val ?? '' }))

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.target_system.trim() || !form.url.trim()) {
      notifications.show({
        title: '입력 오류',
        message: '인터페이스 명, 대상 시스템, URL은 필수 입력 항목입니다.',
        color: 'orange',
        icon: <IconAlertTriangle size={16} />,
      })
      return
    }

    setSaving(true)
    try {
      if (isEdit && editTarget) {
        await updateApiConfig(editTarget.id, form)
        notifications.show({
          title: '수정 완료',
          message: `[${form.name}] 수정 완료: 설정이 즉시 적용됩니다.`,
          color: 'teal',
          icon: <IconCircleCheck size={16} />,
        })
      } else {
        await createApiConfig(form)
        notifications.show({
          title: '등록 완료',
          message: `[${form.name}] 등록 완료: 이제 모니터링 및 실행이 가능합니다.`,
          color: 'teal',
          icon: <IconCircleCheck size={16} />,
        })
      }
      onSuccess()
      onClose()
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? err.message
        : '저장 중 오류가 발생했습니다.'
      notifications.show({
        title: isEdit ? '수정 실패' : '등록 실패',
        message,
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="sm" c="gray.1">
          {isEdit ? '인터페이스 수정' : '신규 인터페이스 등록'}
        </Text>
      }
      size="lg"
      radius="md"
      styles={{
        content: { background: '#13151f', border: '1px solid rgba(99,107,183,0.3)' },
        header: { background: '#13151f', borderBottom: '1px solid rgba(99,107,183,0.2)' },
        close: { color: '#aaa' },
      }}
    >
      <Box pt="sm">
        <TextInput
          label="인터페이스 명"
          placeholder="예) 금감원 신계약 접수 API"
          required
          value={form.name}
          onChange={(e) => set('name')(e.currentTarget.value)}
          mb="sm"
          styles={{ label: { color: '#adb5bd', fontSize: '0.8rem' } }}
        />

        <TextInput
          label="대상 시스템 (기관명)"
          placeholder="예) 금감원, KB손해보험"
          required
          value={form.target_system}
          onChange={(e) => set('target_system')(e.currentTarget.value)}
          mb="sm"
          styles={{ label: { color: '#adb5bd', fontSize: '0.8rem' } }}
        />

        <Group grow mb="sm">
          <Select
            label="통신 프로토콜"
            data={PROTOCOL_OPTIONS}
            value={form.protocol}
            onChange={set('protocol')}
            styles={{ label: { color: '#adb5bd', fontSize: '0.8rem' } }}
          />
          <Select
            label="HTTP 메소드"
            data={METHOD_OPTIONS}
            value={form.method}
            onChange={set('method')}
            styles={{ label: { color: '#adb5bd', fontSize: '0.8rem' } }}
          />
        </Group>

        <TextInput
          label="엔드포인트 URL"
          placeholder="예) https://api.fss.or.kr/v1/contract"
          required
          value={form.url}
          onChange={(e) => set('url')(e.currentTarget.value)}
          mb="sm"
          styles={{
            label: { color: '#adb5bd', fontSize: '0.8rem' },
            input: { fontFamily: 'monospace', fontSize: '0.82rem' },
          }}
        />

        <Textarea
          label="상세 설명"
          placeholder="인터페이스의 목적, 연계 시스템, 주의사항 등을 입력하세요."
          value={form.description}
          onChange={(e) => set('description')(e.currentTarget.value)}
          minRows={3}
          autosize
          styles={{ label: { color: '#adb5bd', fontSize: '0.8rem' } }}
        />

        <Group justify="flex-end" mt="xl" gap="sm">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button
            variant="gradient"
            gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
            onClick={handleSubmit}
            loading={saving}
            leftSection={saving ? undefined : <IconCircleCheck size={15} />}
          >
            {isEdit ? '저장' : '등록'}
          </Button>
        </Group>
      </Box>
    </Modal>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

function getFtpActionType(config: ApiConfig) {
  if (config.protocol !== 'FTP') return null
  return config.action_type || 'UNKNOWN'
}

export default function InterfaceTable() {
  const navigate = useNavigate()
  const [configs, setConfigs] = useState<ApiConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ── 페이징 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState('50')
  const scrollRef = useRef<HTMLDivElement>(null)

  // 다중 선택
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 모달
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [editTarget, setEditTarget] = useState<ApiConfig | null>(null)

  // FTP 모달/드로어 상태
  const [uploadDrawerOpened, { open: openUploadDrawer, close: closeUploadDrawer }] = useDisclosure(false)
  const [uploadConfig, setUploadConfig] = useState<ApiConfig | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const [listModalOpened, { open: openListModal, close: closeListModal }] = useDisclosure(false)
  const [listConfig, setListConfig] = useState<ApiConfig | null>(null)

  // ── 목록 조회 ──────────────────────────────────────────────────────────────

  const fetchConfigs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getApiConfigs({ page: currentPage, limit: Number(itemsPerPage) })
      setConfigs(response.data)
      setTotalItems(response.total)
      setTotalPages(response.totalPages)
      setSelectedIds(new Set()) // 조회 후 선택 초기화
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? `서버 연결 실패: ${err.message}`
        : '알 수 없는 오류가 발생했습니다.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [currentPage, itemsPerPage])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  // ── 신규 등록 ──────────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditTarget(null)
    openModal()
  }

  // ── 수정 ──────────────────────────────────────────────────────────────────

  const handleOpenEdit = (config: ApiConfig) => {
    setEditTarget(config)
    openModal()
  }


  // ── 선택 삭제 ─────────────────────────────────────────────────────────────

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`선택한 ${selectedIds.size}개의 인터페이스를 삭제하시겠습니까?`)) return
    try {
      await Promise.all([...selectedIds].map((id) => deleteApiConfig(id)))
      notifications.show({
        title: '선택 삭제 완료',
        message: `${selectedIds.size}건이 삭제되었습니다.`,
        color: 'teal',
        icon: <IconCircleCheck size={16} />,
      })
      fetchConfigs()
    } catch {
      notifications.show({ title: '삭제 실패', message: '일부 항목 삭제 중 오류가 발생했습니다.', color: 'red', icon: <IconAlertTriangle size={16} /> })
    }
  }

  // ── 인터페이스 실행 ────────────────────────────────────────────────────────

  const handleRun = async (config: ApiConfig) => {
    if (runningIds.has(config.id)) return
    setRunningIds((prev) => new Set(prev).add(config.id))
    try {
      const result = await runInterface(config.id)
      if ((result as any).status === 'FAIL') {
        notifications.show({ title: `처리 대기 중 — ${config.name}`, message: '⚠️ 요청 실패. 잠시 후 재시도 예정', color: 'orange', icon: <IconRefresh size={16} />, autoClose: 5000 })
      } else {
        notifications.show({ title: '요청 성공', message: `[${config.name}] 정상적으로 요청되었습니다.`, color: 'teal', icon: <IconCircleCheck size={16} />, autoClose: 4000 })
      }
    } catch {
      notifications.show({ title: '시스템 오류', message: '오류 발생, 해당 기관에 문의해주세요.', color: 'red', icon: <IconAlertTriangle size={16} />, autoClose: 5000 })
    } finally {
      setRunningIds((prev) => { const next = new Set(prev); next.delete(config.id); return next })
    }
  }

  // ── FTP 인터페이스 실행 ──────────────────────────────────────────────────────

  const handleOpenUpload = (config: ApiConfig) => {
    setUploadConfig(config)
    setUploadFiles([])
    openUploadDrawer()
  }

  const handleSubmitUpload = async () => {
    if (!uploadConfig || uploadFiles.length === 0) return
    setUploading(true)
    try {
      await uploadFtpFile(uploadConfig.id, uploadFiles)
      notifications.show({
        title: '업로드 완료',
        message: '업로드가 완료되었습니다.',
        color: 'teal',
        icon: <IconCircleCheck size={16} />,
      })
      closeUploadDrawer()
    } catch (err) {
      notifications.show({
        title: '업로드 실패',
        message: '파일 업로드 중 오류가 발생했습니다.',
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleOpenDownload = (config: ApiConfig) => {
    notifications.show({
      title: '다운로드 안내',
      message: '다운로드는 [호출 로그] 페이지에서 개별 또는 일괄 선택하여 진행하실 수 있습니다.',
      color: 'blue',
      icon: <IconDownload size={16} />,
      autoClose: 5000,
    })
    // 해당 기관 필터를 걸어서 로그 페이지로 이동
    navigate(`/logs?target_system=${encodeURIComponent(config.target_system)}`)
  }

  const handleRunList = async (config: ApiConfig) => {
    if (runningIds.has(config.id)) return
    setRunningIds((prev) => new Set(prev).add(config.id))
    try {
      await getFtpList(config.id)
      setListConfig(config)
      openListModal()
    } catch (err) {
      notifications.show({
        title: '시스템 오류',
        message: '목록 조회 중 오류가 발생했습니다.',
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      })
    } finally {
      setRunningIds((prev) => { const next = new Set(prev); next.delete(config.id); return next })
    }
  }

  // ── 체크박스 ──────────────────────────────────────────────────────────────

  const allChecked = configs.length > 0 && selectedIds.size === configs.length
  const indeterminate = selectedIds.size > 0 && selectedIds.size < configs.length

  const toggleAll = () =>
    setSelectedIds(allChecked ? new Set() : new Set(configs.map((c) => c.id)))

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // ── 로딩 / 에러 ───────────────────────────────────────────────────────────

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

  // ── 렌더링 ────────────────────────────────────────────────────────────────

  const THEAD_STYLE = { background: 'rgba(99, 107, 183, 0.08)', borderBottom: '1px solid rgba(99, 107, 183, 0.2)' }
  const TH = ({ children, width }: { children: React.ReactNode; width?: number }) => (
    <Table.Th style={width ? { width } : undefined}>
      <Text size="xs" fw={600} c="gray.4">{children}</Text>
    </Table.Th>
  )

  return (
    <>
      <ConfigModal
        opened={modalOpened}
        onClose={closeModal}
        editTarget={editTarget}
        onSuccess={fetchConfigs}
      />

      <Drawer
        opened={uploadDrawerOpened}
        onClose={closeUploadDrawer}
        title={<Text fw={700} size="sm" c="gray.1">외부 기관 사진 전송 (업로드)</Text>}
        position="right"
        size="md"
        styles={{
          content: { background: '#13151f', borderLeft: '1px solid rgba(99,107,183,0.3)' },
          header: { background: '#13151f', borderBottom: '1px solid rgba(99,107,183,0.2)' },
          close: { color: '#aaa' },
        }}
      >
        <Box pt="sm">
          <Text size="sm" c="dimmed" mb="md">업로드할 파일을 선택하거나 드래그 앤 드롭하세요.</Text>
          <FileInput
            multiple
            label="파일 선택"
            placeholder="클릭하여 파일 선택"
            value={uploadFiles}
            onChange={setUploadFiles}
            clearable
            styles={{ label: { color: '#adb5bd', fontSize: '0.8rem' } }}
          />

          <Group justify="flex-end" mt="xl" gap="sm">
            <Button variant="subtle" color="gray" onClick={closeUploadDrawer} disabled={uploading}>
              취소
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
              onClick={handleSubmitUpload}
              loading={uploading}
              leftSection={uploading ? undefined : <IconUpload size={15} />}
            >
              등록
            </Button>
          </Group>
        </Box>
      </Drawer>

      <Modal
        opened={listModalOpened}
        onClose={closeListModal}
        title={<Text fw={700} size="sm" c="gray.1">파일 목록 조회</Text>}
        size="sm"
        centered
        styles={{
          content: { background: '#13151f', border: '1px solid rgba(99,107,183,0.3)' },
          header: { background: '#13151f', borderBottom: '1px solid rgba(99,107,183,0.2)' },
          close: { color: '#aaa' },
        }}
      >
        <Box py="md" style={{ textAlign: 'center' }}>
          <Text size="sm" c="gray.3" mb="xl">
            목록 조회가 완료되었습니다.<br />
            로그 테이블로 이동하여 목록을 확인하세요.
          </Text>
          <Group justify="center" gap="sm">
            <Button variant="subtle" color="gray" onClick={closeListModal}>
              닫기
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
              onClick={() => {
                closeListModal()
                const target = listConfig?.target_system
                const url = target ? `/logs?target_system=${encodeURIComponent(target)}` : '/logs'
                navigate(url)
              }}
            >
              이동하기
            </Button>
          </Group>
        </Box>
      </Modal>

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
        {/* 툴바 */}
        <Group px="lg" py="md" justify="space-between">
          <Group gap="sm">
            <Text fw={600} size="sm" c="gray.2">인터페이스 목록</Text>
            <Badge variant="light" color="indigo" size="sm">{totalItems}건</Badge>
            {selectedIds.size > 0 && (
              <Badge variant="light" color="red" size="sm">{selectedIds.size}개 선택</Badge>
            )}
          </Group>

          <Group gap="xs">
            {selectedIds.size > 0 && (
              <>
                <Button
                  size="xs"
                  variant="light"
                  color="indigo"
                  leftSection={<IconEdit size={14} />}
                  onClick={() => {
                    const selectedConfig = configs.find((c) => c.id === Array.from(selectedIds)[0])
                    if (selectedConfig) handleOpenEdit(selectedConfig)
                  }}
                  disabled={selectedIds.size > 1}
                >
                  수정
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={handleBulkDelete}
                >
                  삭제 ({selectedIds.size}개)
                </Button>
              </>
            )}
            <Button
              size="xs"
              variant="gradient"
              gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
              leftSection={<IconPlus size={14} />}
              onClick={handleOpenCreate}
            >
              신규 등록
            </Button>
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
        </Group>

        {/* 테이블 */}
        <ScrollArea style={{ flex: 1 }} viewportRef={scrollRef}>
          <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 1100 }}>
            <Table.Thead style={THEAD_STYLE}>
              <Table.Tr>
                <Table.Th style={{ width: 44 }}>
                  <Checkbox
                    size="xs"
                    checked={allChecked}
                    indeterminate={indeterminate}
                    onChange={toggleAll}
                    styles={{ input: { cursor: 'pointer' } }}
                  />
                </Table.Th>
                <TH width={48}>#</TH>
                <TH>기관명</TH>
                <TH>API 이름</TH>
                <TH>프로토콜</TH>
                <TH>메소드</TH>
                <TH>URI</TH>
                <TH>설명</TH>
                <TH>최종 수정일</TH>
                <TH>최종 수정자</TH>
                <Table.Th style={{ width: 170, textAlign: 'center' }}>
                  <Text size="xs" fw={600} c="gray.4">작업</Text>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {configs.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={11}>
                    <Center py="xl">
                      <Box style={{ textAlign: 'center' }}>
                        <Text c="dimmed" size="sm" mb="md">등록된 인터페이스가 없습니다.</Text>
                        <Button size="xs" variant="light" color="indigo" leftSection={<IconPlus size={14} />} onClick={handleOpenCreate}>
                          첫 인터페이스 등록하기
                        </Button>
                      </Box>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                configs.map((config, index) => {
                  const raw = config as any
                  const updatedByLoginId: string =
                    raw.users_api_configs_updated_byTousers?.login_id ??
                    raw.updatedBy?.login_id ??
                    raw.updated_by_user?.login_id ?? '-'
                  const updatedAt: string = raw.updated_at ?? raw.updatedAt ?? ''
                  const isChecked = selectedIds.has(config.id)

                  return (
                    <Table.Tr
                      key={config.id}
                      style={{
                        transition: 'background 0.15s ease',
                        borderBottom: '1px solid rgba(99, 107, 183, 0.08)',
                        background: isChecked ? 'rgba(99,107,183,0.08)' : undefined,
                      }}
                    >
                      {/* 체크박스 */}
                      <Table.Td>
                        <Checkbox
                          size="xs"
                          checked={isChecked}
                          onChange={() => toggleOne(config.id)}
                          styles={{ input: { cursor: 'pointer' } }}
                        />
                      </Table.Td>

                      {/* 번호 */}
                      <Table.Td>
                        <Text size="sm" c="gray.5" style={{ fontFamily: 'monospace' }}>
                          {totalItems - ((currentPage - 1) * Number(itemsPerPage) + index)}
                        </Text>
                      </Table.Td>

                      {/* 기관명 */}
                      <Table.Td>
                        <Text size="sm" fw={600} c="gray.1">{config.target_system ?? '-'}</Text>
                      </Table.Td>

                      {/* API 이름 */}
                      <Table.Td>
                        <Text size="sm" fw={500} c="gray.2">{config.name}</Text>
                      </Table.Td>

                      {/* 프로토콜 */}
                      <Table.Td>
                        <Badge variant="light" color={getProtocolColor(config.protocol)} size="sm" radius="sm" style={{ fontFamily: 'monospace' }}>
                          {config.protocol}
                        </Badge>
                      </Table.Td>

                      {/* 메소드 */}
                      <Table.Td>
                        <Badge variant="dot" color={getMethodColor(config.method as string)} size="sm">
                          {(config.method as string) ?? '-'}
                        </Badge>
                      </Table.Td>

                      {/* URI */}
                      <Table.Td>
                        <Tooltip label={config.url ?? config.endpoint ?? '-'} multiline w={320} disabled={!(config.url ?? config.endpoint)}>
                          <Text size="xs" c="indigo.3" style={{ fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 200 }} lineClamp={1}>
                            {config.url ?? config.endpoint ?? '-'}
                          </Text>
                        </Tooltip>
                      </Table.Td>

                      {/* 설명 */}
                      <Table.Td>
                        <Tooltip label={config.description ?? '-'} disabled={!config.description} multiline w={240}>
                          <Text size="sm" c="gray.4" lineClamp={1} style={{ maxWidth: 160 }}>
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

                      {/* 작업 버튼 */}
                      <Table.Td>
                        <Group gap={4} justify="center">
                          {(() => {
                            const ftpAction = getFtpActionType(config)
                            const isRunning = runningIds.has(config.id)

                            if (ftpAction === 'UPLOAD') {
                              return (
                                <Tooltip label="FTP 파일 업로드">
                                  <Button
                                    size="xs"
                                    variant="gradient"
                                    gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
                                    px={12}
                                    leftSection={<IconUpload size={12} />}
                                    onClick={() => handleOpenUpload(config)}
                                  >
                                    업로드
                                  </Button>
                                </Tooltip>
                              )
                            }
                            if (ftpAction === 'DOWNLOAD') {
                              return (
                                <Tooltip label="호출 로그 페이지에서 다운로드">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    color="gray"
                                    px={12}
                                    leftSection={<IconDownload size={12} />}
                                    onClick={() => handleOpenDownload(config)}
                                  >
                                    로그에서 다운로드
                                  </Button>
                                </Tooltip>
                              )
                            }
                            if (ftpAction === 'LIST') {
                              return (
                                <Tooltip label="FTP 목록 조회">
                                  <Button
                                    size="xs"
                                    variant="gradient"
                                    gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                                    px={12}
                                    leftSection={isRunning ? <Loader size={11} color="white" /> : <IconList size={12} />}
                                    loading={isRunning}
                                    disabled={isRunning}
                                    onClick={() => handleRunList(config)}
                                  >
                                    목록 조회
                                  </Button>
                                </Tooltip>
                              )
                            }

                            return (
                              <Tooltip label="인터페이스 즉시 실행">
                                <Button
                                  size="xs"
                                  variant="gradient"
                                  gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
                                  px={12}
                                  leftSection={isRunning ? <Loader size={11} color="white" /> : <IconPlayerPlay size={12} />}
                                  loading={isRunning}
                                  disabled={isRunning}
                                  onClick={() => handleRun(config)}
                                >
                                  실행
                                </Button>
                              </Tooltip>
                            )
                          })()}
                        </Group>
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
    </>
  )
}
