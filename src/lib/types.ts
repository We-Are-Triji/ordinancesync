export type OrdinanceStatus = "active" | "pending" | "archived"

export interface Ordinance {
  _id: string
  ordinanceNumber: string
  title: string
  office: string
  status: OrdinanceStatus
  pageCount: number
  fileId: string
  fileName: string
  fileSize: number
  summary?: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedOrdinances {
  items: Ordinance[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
