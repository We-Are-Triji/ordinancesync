export type OrdinanceStatus = "active" | "pending" | "archived"

export interface Ordinance {
  _id: string
  ordinanceNumber: string
  title: string
  status: OrdinanceStatus
  pageCount: number
  fileId: string
  fileName: string
  fileSize: number
  summary?: string
  text?: string
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
  acronym?: string
  description?: string
  contactPerson?: string
  secondaryEmail?: string
  phone?: string
  address?: string
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

// One AI-drafted notification targeted at a single affected office.
export interface DispatchDraft {
  officeId: string
  officeName: string
  email: string
  subject: string
  message: string
}

export type DispatchItemStatus = "pending" | "sent" | "failed"

export interface DispatchItem extends DispatchDraft {
  status: DispatchItemStatus
  error?: string
  sentAt?: string
}

export interface Dispatch {
  _id: string
  ordinanceId: string
  ordinanceNumber: string
  ordinanceTitle: string
  items: DispatchItem[]
  createdAt: string
  dispatchedAt?: string
}
