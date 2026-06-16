import dayjs from 'dayjs'
import { DONATION_INTERVAL_DAYS, Schedule } from '@/types'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function formatDate(date: Date | string, format = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format)
}

export function formatDateTime(date: Date | string, format = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).format(format)
}

export function formatTime(date: Date | string, format = 'HH:mm'): string {
  return dayjs(date).format(format)
}

export function addDays(date: Date | string, days: number): Date {
  return dayjs(date).add(days, 'day').toDate()
}

export function diffDays(date1: Date | string, date2: Date | string): number {
  return dayjs(date1).diff(dayjs(date2), 'day')
}

export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  return dayjs(date1).isSame(dayjs(date2), 'day')
}

export function isBetween(date: Date | string, start: Date | string, end: Date | string): boolean {
  const d = dayjs(date)
  return d.isAfter(dayjs(start).subtract(1, 'day')) && d.isBefore(dayjs(end).add(1, 'day'))
}

export function validateIdCard(idCard: string): boolean {
  const reg = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/
  return reg.test(idCard)
}

export function validatePhone(phone: string): boolean {
  const reg = /^1[3-9]\d{9}$/
  return reg.test(phone)
}

export function validateDonationInterval(lastDonationDate?: string): { valid: boolean; message: string } {
  if (!lastDonationDate) {
    return { valid: true, message: '' }
  }
  const days = diffDays(new Date(), lastDonationDate)
  if (days < DONATION_INTERVAL_DAYS) {
    const remain = DONATION_INTERVAL_DAYS - days
    return {
      valid: false,
      message: `距离上次献血不足${DONATION_INTERVAL_DAYS}天，还需等待${remain}天`
    }
  }
  return { valid: true, message: '' }
}

export function generateSchedulesByRule(rule: {
  id: string
  siteId: string
  siteName: string
  weekDays: number[]
  startTime: string
  endTime: string
  stations: number
  startDate: string
  endDate: string
}): Schedule[] {
  const schedules: Schedule[] = []
  const start = dayjs(rule.startDate)
  const end = dayjs(rule.endDate)
  let current = start

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dayOfWeek = current.day()
    if (rule.weekDays.includes(dayOfWeek)) {
      schedules.push({
        id: generateId(),
        siteId: rule.siteId,
        siteName: rule.siteName,
        date: current.format('YYYY-MM-DD'),
        startTime: rule.startTime,
        endTime: rule.endTime,
        stations: rule.stations,
        isException: false,
        createTime: formatDateTime(new Date())
      })
    }
    current = current.add(1, 'day')
  }

  return schedules
}

export function padZero(num: number): string {
  return num.toString().padStart(2, '0')
}

export function getTimeSlots(startTime: string, endTime: string, intervalMin = 30): string[] {
  const slots: string[] = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  for (let m = startMin; m < endMin; m += intervalMin) {
    const h = Math.floor(m / 60)
    const min = m % 60
    slots.push(`${padZero(h)}:${padZero(min)}`)
  }
  return slots
}
