export interface DonationSite {
  id: string
  name: string
  address: string
  phone: string
  stations: number
  createTime: string
}

export interface CycleRule {
  id: string
  siteId: string
  siteName: string
  weekDays: number[]
  startTime: string
  endTime: string
  capacityPerHour: number
  startDate: string
  endDate: string
  createTime: string
}

export interface Schedule {
  id: string
  siteId: string
  siteName: string
  date: string
  startTime: string
  endTime: string
  stations: number
  isException: boolean
  exceptionReason?: string
  createTime: string
}

export interface Donor {
  id: string
  name: string
  idCard: string
  phone: string
  bloodType: 'A' | 'B' | 'AB' | 'O' | 'unknown'
  lastDonationDate?: string
  createTime: string
}

export interface QueueItem {
  id: string
  scheduleId: string
  donorId: string
  donorName: string
  queueNumber: number
  status: 'waiting' | 'called' | 'processing' | 'completed' | 'missed' | 'cancelled'
  missedCount: number
  callTime?: string
  createTime: string
  updateTime: string
}

export const BLOOD_TYPES = ['A', 'B', 'AB', 'O', 'unknown'] as const
export const BLOOD_TYPE_LABELS: Record<string, string> = {
  A: 'A型',
  B: 'B型',
  AB: 'AB型',
  O: 'O型',
  unknown: '未知'
}

export const WEEK_DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export const QUEUE_STATUS_LABELS: Record<string, string> = {
  waiting: '等待中',
  called: '已叫号',
  processing: '采血中',
  completed: '已完成',
  missed: '已过号',
  cancelled: '已取消'
}

export const QUEUE_STATUS_COLORS: Record<string, string> = {
  waiting: '#3B82F6',
  called: '#F59E0B',
  processing: '#8B5CF6',
  completed: '#10B981',
  missed: '#EF4444',
  cancelled: '#6B7280'
}

export const DONATION_INTERVAL_DAYS = 180
