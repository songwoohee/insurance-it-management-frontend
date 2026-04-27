import axiosInstance from './axiosInstance'

/**
 * [POST] 파일 업로드
 * Endpoint: POST /ftp/:apiConfigId/files
 */
export async function uploadFtpFile(apiConfigId: string, files: File[]) {
  const formData = new FormData()
  if (files.length > 0) {
    formData.append('file', files[0])
  }

  const response = await axiosInstance.post(
    `/ftp/${apiConfigId}/files`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return response.data
}

/**
 * [GET] 파일 목록 조회
 * Endpoint: GET /ftp/:apiConfigId/files
 */
export async function getFtpList(apiConfigId: string) {
  const response = await axiosInstance.get(`/ftp/${apiConfigId}/files`)
  return response.data
}

/**
 * [GET] 연결 테스트
 * Endpoint: GET /ftp/:apiConfigId/test
 */
export async function testFtpConnection(apiConfigId: string) {
  const response = await axiosInstance.get(`/ftp/${apiConfigId}/test`)
  return response.data
}

/**
 * [GET] 외부 기관 파일 다운로드 (단건)
 * Endpoint: GET /ftp/:apiConfigId/download/:correlationId
 * 설명: 브라우저에서 직접 링크를 열어 다운로드 수행
 */
export async function downloadFtpFile(apiConfigId: string, correlationId: string) {
  const response = await axiosInstance.get(`/ftp/${apiConfigId}/download/${correlationId}`, {
    responseType: 'blob'
  })

  // 헤더에서 파일명 추출 시도 (CORS Expose-Headers 필요)
  let filename = 'downloaded_file'
  const contentDisposition = response.headers['content-disposition']
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (filenameMatch && filenameMatch[1]) {
      filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''))
    }
  }

  return { blob: response.data, filename }
}

export function downloadFtpFileUrl(apiConfigId: string, correlationId: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
  // axios 쓰지 말고, 그냥 완성된 URL 문자열만 리턴!
  return `${baseUrl}/ftp/${apiConfigId}/download/${correlationId}`;
}

/**
 * [POST] 일괄 다운로드
 * Endpoint: POST /ftp/bulk-download
 * 설명: 선택한 여러 파일(또는 단일 파일)을 ZIP 압축하여 다운로드
 */
export async function bulkDownloadFtpFiles(correlationIds: string[]) {
  const response = await axiosInstance.post(
    '/ftp/bulk-download',
    { correlation_ids: correlationIds },
    { responseType: 'blob' }
  )

  // 헤더에서 파일명 추출 시도
  let filename = 'Img_download.zip'
  const contentDisposition = response.headers['content-disposition']
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (filenameMatch && filenameMatch[1]) {
      filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''))
    }
  }

  return { blob: response.data, filename }
}