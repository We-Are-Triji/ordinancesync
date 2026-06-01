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

export type OfficeCategory = "office" | "barangay"

export interface Office {
  _id: string
  name: string
  email: string
  category: OfficeCategory
  createdAt: string
  updatedAt: string
}

export interface PaginatedOffices {
  items: Office[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
