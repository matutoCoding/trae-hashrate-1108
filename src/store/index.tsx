import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react'
import Taro from '@tarojs/taro'
import {
  DonationSite,
  CycleRule,
  Schedule,
  Donor,
  QueueItem,
} from '@/types'
import { generateId, formatDateTime, generateSchedulesByRule } from '@/utils'

const STORAGE_KEYS = {
  sites: 'bd_sites',
  rules: 'bd_rules',
  schedules: 'bd_schedules',
  donors: 'bd_donors',
  queues: 'bd_queues',
}

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = Taro.getStorageSync(key)
    return data || defaultValue
  } catch {
    return defaultValue
  }
}

function setStorage<T>(key: string, data: T) {
  try {
    Taro.setStorageSync(key, data)
  } catch (e) {
    console.error('Storage error:', e)
  }
}

const initialSites: DonationSite[] = [
  {
    id: 'site_demo_1',
    name: '朝阳社区采血点',
    address: '朝阳区人民路128号社区广场',
    phone: '010-88881234',
    stations: 3,
    createTime: '2026-06-01 09:00:00'
  },
  {
    id: 'site_demo_2',
    name: '海淀公园采血点',
    address: '海淀区海淀公园东门',
    phone: '010-88882345',
    stations: 4,
    createTime: '2026-06-01 09:00:00'
  },
  {
    id: 'site_demo_3',
    name: '西城万达采血点',
    address: '西城区万达广场2号门',
    phone: '010-88883456',
    stations: 2,
    createTime: '2026-06-01 09:00:00'
  }
]

function initDemoData() {
  const existingSites = getStorage<DonationSite[]>(STORAGE_KEYS.sites, [])
  if (existingSites.length === 0) {
    setStorage(STORAGE_KEYS.sites, initialSites)
  }

  const existingRules = getStorage<CycleRule[]>(STORAGE_KEYS.rules, [])
  if (existingRules.length === 0) {
    const demoRules: CycleRule[] = [
      {
        id: 'rule_demo_1',
        siteId: 'site_demo_1',
        siteName: '朝阳社区采血点',
        weekDays: [1, 3, 5],
        startTime: '09:00',
        endTime: '16:00',
        capacityPerHour: 10,
        startDate: '2026-06-01',
        endDate: '2026-12-31',
        createTime: '2026-06-01 09:00:00'
      },
      {
        id: 'rule_demo_2',
        siteId: 'site_demo_2',
        siteName: '海淀公园采血点',
        weekDays: [2, 4, 6],
        startTime: '09:30',
        endTime: '17:00',
        capacityPerHour: 12,
        startDate: '2026-06-01',
        endDate: '2026-12-31',
        createTime: '2026-06-01 09:00:00'
      }
    ]
    setStorage(STORAGE_KEYS.rules, demoRules)
  }
}

export interface StoreContextValue {
  sites: DonationSite[]
  rules: CycleRule[]
  schedules: Schedule[]
  donors: Donor[]
  queues: QueueItem[]
  addSite: (site: Omit<DonationSite, 'id' | 'createTime'>) => DonationSite
  updateSite: (id: string, updates: Partial<DonationSite>) => void
  deleteSite: (id: string) => void
  addRule: (rule: Omit<CycleRule, 'id' | 'createTime'>) => CycleRule
  updateRule: (id: string, updates: Partial<CycleRule>) => void
  deleteRule: (id: string) => void
  batchGenerateSchedules: (ruleId: string) => Schedule[]
  addSchedule: (schedule: Omit<Schedule, 'id' | 'createTime'>) => Schedule
  updateSchedule: (id: string, updates: Partial<Schedule>) => void
  deleteSchedule: (id: string) => void
  getOrCreateDonor: (donorInfo: Omit<Donor, 'id' | 'createTime'>) => Donor
  updateDonor: (id: string, updates: Partial<Donor>) => void
  addQueueItem: (item: Omit<QueueItem, 'id' | 'queueNumber' | 'status' | 'missedCount' | 'createTime' | 'updateTime'>) => QueueItem
  updateQueueItem: (id: string, updates: Partial<QueueItem>) => void
  callNextNumber: (scheduleId: string) => QueueItem | null
  markMissed: (id: string) => void
  completeDonation: (id: string) => void
  forceRehydrate: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sites, setSites] = useState<DonationSite[]>([])
  const [rules, setRules] = useState<CycleRule[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [donors, setDonors] = useState<Donor[]>([])
  const [queues, setQueues] = useState<QueueItem[]>([])
  const rehydrateCount = useRef(0)

  const rehydrate = useCallback(() => {
    initDemoData()
    setSites(getStorage<DonationSite[]>(STORAGE_KEYS.sites, []))
    setRules(getStorage<CycleRule[]>(STORAGE_KEYS.rules, []))
    setSchedules(getStorage<Schedule[]>(STORAGE_KEYS.schedules, []))
    setDonors(getStorage<Donor[]>(STORAGE_KEYS.donors, []))
    setQueues(getStorage<QueueItem[]>(STORAGE_KEYS.queues, []))
    rehydrateCount.current++
  }, [])

  useEffect(() => {
    rehydrate()
  }, [rehydrate])

  const saveSites = useCallback((list: DonationSite[]) => {
    setSites(list)
    setStorage(STORAGE_KEYS.sites, list)
  }, [])

  const saveRules = useCallback((list: CycleRule[]) => {
    setRules(list)
    setStorage(STORAGE_KEYS.rules, list)
  }, [])

  const saveSchedules = useCallback((list: Schedule[]) => {
    setSchedules(list)
    setStorage(STORAGE_KEYS.schedules, list)
  }, [])

  const saveDonors = useCallback((list: Donor[]) => {
    setDonors(list)
    setStorage(STORAGE_KEYS.donors, list)
  }, [])

  const saveQueues = useCallback((list: QueueItem[]) => {
    setQueues(list)
    setStorage(STORAGE_KEYS.queues, list)
  }, [])

  const addSite = useCallback((site: Omit<DonationSite, 'id' | 'createTime'>) => {
    const newSite: DonationSite = {
      ...site,
      id: generateId(),
      createTime: formatDateTime(new Date())
    }
    const list = [...sites, newSite]
    saveSites(list)
    return newSite
  }, [sites, saveSites])

  const updateSite = useCallback((id: string, updates: Partial<DonationSite>) => {
    const list = sites.map(s => s.id === id ? { ...s, ...updates } : s)
    saveSites(list)
  }, [sites, saveSites])

  const deleteSite = useCallback((id: string) => {
    saveSites(sites.filter(s => s.id !== id))
  }, [sites, saveSites])

  const addRule = useCallback((rule: Omit<CycleRule, 'id' | 'createTime'>) => {
    const newRule: CycleRule = {
      ...rule,
      id: generateId(),
      createTime: formatDateTime(new Date())
    }
    saveRules([...rules, newRule])
    return newRule
  }, [rules, saveRules])

  const updateRule = useCallback((id: string, updates: Partial<CycleRule>) => {
    saveRules(rules.map(r => r.id === id ? { ...r, ...updates } : r))
  }, [rules, saveRules])

  const deleteRule = useCallback((id: string) => {
    saveRules(rules.filter(r => r.id !== id))
  }, [rules, saveRules])

  const batchGenerateSchedules = useCallback((ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId)
    if (!rule) return []

    const site = sites.find(s => s.id === rule.siteId)
    if (!site) return []

    const generated = generateSchedulesByRule({
      id: rule.id,
      siteId: rule.siteId,
      siteName: rule.siteName,
      weekDays: rule.weekDays,
      startTime: rule.startTime,
      endTime: rule.endTime,
      stations: site.stations,
      startDate: rule.startDate,
      endDate: rule.endDate
    })

    const existingKeys = new Set(
      schedules
        .filter(s => !s.isException)
        .map(s => `${s.siteId}_${s.date}`)
    )

    const newSchedules = generated.filter(
      g => !existingKeys.has(`${g.siteId}_${g.date}`)
    )

    if (newSchedules.length > 0) {
      saveSchedules([...schedules, ...newSchedules])
    }

    return newSchedules
  }, [rules, sites, schedules, saveSchedules])

  const addSchedule = useCallback((schedule: Omit<Schedule, 'id' | 'createTime'>) => {
    const newSchedule: Schedule = {
      ...schedule,
      id: generateId(),
      createTime: formatDateTime(new Date())
    }
    saveSchedules([...schedules, newSchedule])
    return newSchedule
  }, [schedules, saveSchedules])

  const updateSchedule = useCallback((id: string, updates: Partial<Schedule>) => {
    saveSchedules(schedules.map(s => s.id === id ? { ...s, ...updates, isException: true } : s))
  }, [schedules, saveSchedules])

  const deleteSchedule = useCallback((id: string) => {
    saveSchedules(schedules.filter(s => s.id !== id))
  }, [schedules, saveSchedules])

  const getOrCreateDonor = useCallback((donorInfo: Omit<Donor, 'id' | 'createTime'>) => {
    let donor = donors.find(d => d.idCard === donorInfo.idCard)
    let result: Donor
    if (donor) {
      if (donor.name !== donorInfo.name || donor.phone !== donorInfo.phone || donor.bloodType !== donorInfo.bloodType) {
        const updated = { ...donor, ...donorInfo }
        saveDonors(donors.map(d => d.id === donor.id ? updated : d))
        result = updated
      } else {
        result = donor
      }
    } else {
      const newDonor: Donor = {
        ...donorInfo,
        id: generateId(),
        createTime: formatDateTime(new Date())
      }
      saveDonors([...donors, newDonor])
      result = newDonor
    }
    return result
  }, [donors, saveDonors])

  const updateDonor = useCallback((id: string, updates: Partial<Donor>) => {
    saveDonors(donors.map(d => d.id === id ? { ...d, ...updates } : d))
  }, [donors, saveDonors])

  const addQueueItem = useCallback((item: Omit<QueueItem, 'id' | 'queueNumber' | 'status' | 'missedCount' | 'createTime' | 'updateTime'>) => {
    const scheduleQueues = queues
      .filter(q => q.scheduleId === item.scheduleId && q.status !== 'cancelled')
      .sort((a, b) => b.queueNumber - a.queueNumber)
    const nextNumber = scheduleQueues.length > 0 ? scheduleQueues[0].queueNumber + 1 : 1

    const newItem: QueueItem = {
      ...item,
      id: generateId(),
      queueNumber: nextNumber,
      status: 'waiting',
      missedCount: 0,
      createTime: formatDateTime(new Date()),
      updateTime: formatDateTime(new Date())
    }
    saveQueues([...queues, newItem])
    return newItem
  }, [queues, saveQueues])

  const updateQueueItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    saveQueues(queues.map(q =>
      q.id === id ? { ...q, ...updates, updateTime: formatDateTime(new Date()) } : q
    ))
  }, [queues, saveQueues])

  const callNextNumber = useCallback((scheduleId: string) => {
    const waiting = queues
      .filter(q => q.scheduleId === scheduleId && q.status === 'waiting')
      .sort((a, b) => a.queueNumber - b.queueNumber)

    if (waiting.length === 0) return null

    const next = waiting[0]
    const updated = { ...next, status: 'called' as const, callTime: formatDateTime(new Date()) }
    saveQueues(queues.map(q => q.id === next.id ? { ...q, ...updated } : q))
    return updated
  }, [queues, saveQueues])

  const markMissed = useCallback((id: string) => {
    const item = queues.find(q => q.id === id)
    if (!item) return

    const newMissedCount = item.missedCount + 1

    if (newMissedCount >= 3) {
      updateQueueItem(id, { status: 'cancelled', missedCount: newMissedCount })
    } else {
      const scheduleQueues = queues
        .filter(q => q.scheduleId === item.scheduleId && q.status !== 'cancelled')
        .sort((a, b) => b.queueNumber - a.queueNumber)
      const newNumber = scheduleQueues.length > 0 ? scheduleQueues[0].queueNumber + 1 : 1

      updateQueueItem(id, {
        status: 'waiting',
        missedCount: newMissedCount,
        queueNumber: newNumber
      })
    }
  }, [queues, updateQueueItem])

  const completeDonation = useCallback((id: string) => {
    const item = queues.find(q => q.id === id)
    updateQueueItem(id, { status: 'completed' })
    if (item) {
      const donor = donors.find(d => d.id === item.donorId)
      if (donor) {
        updateDonor(donor.id, {
          lastDonationDate: formatDateTime(new Date(), 'YYYY-MM-DD')
        })
      }
    }
  }, [queues, donors, updateQueueItem, updateDonor])

  const value = useMemo<StoreContextValue>(() => ({
    sites,
    rules,
    schedules,
    donors,
    queues,
    addSite,
    updateSite,
    deleteSite,
    addRule,
    updateRule,
    deleteRule,
    batchGenerateSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    getOrCreateDonor,
    updateDonor,
    addQueueItem,
    updateQueueItem,
    callNextNumber,
    markMissed,
    completeDonation,
    forceRehydrate: rehydrate,
  }), [
    sites, rules, schedules, donors, queues,
    addSite, updateSite, deleteSite,
    addRule, updateRule, deleteRule,
    batchGenerateSchedules, addSchedule, updateSchedule, deleteSchedule,
    getOrCreateDonor, updateDonor,
    addQueueItem, updateQueueItem, callNextNumber, markMissed, completeDonation,
    rehydrate
  ])

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return ctx
}
