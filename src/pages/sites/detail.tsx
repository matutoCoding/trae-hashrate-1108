import { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { useStore } from '@/store'
import { formatDate } from '@/utils'
import { WEEK_DAY_LABELS } from '@/types'
import './detail.scss'

export default function SiteDetail() {
  const router = useRouter()
  const { sites, schedules, queues } = useStore()
  const siteId = router.params.siteId as string
  const [date, setDate] = useState(router.params.date || formatDate(new Date()))

  useDidShow(() => {
    if (router.params.date) {
      setDate(router.params.date)
    }
  })

  const site = useMemo(() => sites.find(s => s.id === siteId), [sites, siteId])

  const daySchedules = useMemo(() => {
    return schedules.filter(s => s.siteId === siteId && s.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [schedules, siteId, date])

  const slotStatsBySchedule = useMemo(() => {
    const map: Record<string, {
      scheduleId: string
      scheduleName: string
      startTime: string
      endTime: string
      stations: number
      totalCapacity: number
      slotStats: {
        slot: string
        capacity: number
        waiting: number
        processing: number
        completed: number
        missedCancelled: number
        total: number
      }[]
    }> = {}

    for (const sch of daySchedules) {
      const slotInterval = sch.slotIntervalMin || 60
      const capacityPer = sch.capacityPerSlot || 10
      let slots: string[] = []
      try {
        let cur = parseInt(sch.startTime.split(':')[0]) * 60 + parseInt(sch.startTime.split(':')[1])
        const end = parseInt(sch.endTime.split(':')[0]) * 60 + parseInt(sch.endTime.split(':')[1])
        while (cur < end) {
          const h = Math.floor(cur / 60).toString().padStart(2, '0')
          const m = (cur % 60).toString().padStart(2, '0')
          slots.push(`${h}:${m}`)
          cur += slotInterval
        }
      } catch {}
      if (slots.length === 0) slots = [sch.startTime]

      const schQueues = queues.filter(q => q.scheduleId === sch.id)
      const slotStats = slots.map(slot => {
        const slotQs = schQueues.filter(q => q.timeSlot === slot)
        return {
          slot,
          capacity: capacityPer,
          waiting: slotQs.filter(q => q.status === 'waiting').length,
          processing: slotQs.filter(q => q.status === 'called' || q.status === 'processing').length,
          completed: slotQs.filter(q => q.status === 'completed').length,
          missedCancelled: slotQs.filter(q => q.status === 'cancelled' && q.missedCount >= 3).length,
          total: slotQs.filter(q => q.status !== 'cancelled').length
        }
      })

      map[sch.id] = {
        scheduleId: sch.id,
        scheduleName: `${sch.startTime}-${sch.endTime}`,
        startTime: sch.startTime,
        endTime: sch.endTime,
        stations: sch.stations,
        totalCapacity: slots.length * capacityPer,
        slotStats
      }
    }

    return map
  }, [daySchedules, queues])

  const overall = useMemo(() => {
    const allQs = queues.filter(q => {
      const sch = daySchedules.find(s => s.id === q.scheduleId)
      return !!sch
    })
    return {
      scheduleCount: daySchedules.length,
      totalCapacity: daySchedules.reduce((sum, s) => {
        const interval = s.slotIntervalMin || 60
        try {
          const start = parseInt(s.startTime.split(':')[0]) * 60 + parseInt(s.startTime.split(':')[1])
          const end = parseInt(s.endTime.split(':')[0]) * 60 + parseInt(s.endTime.split(':')[1])
          const slots = Math.max(1, Math.floor((end - start) / interval))
          return sum + slots * (s.capacityPerSlot || 10)
        } catch { return sum + (s.capacityPerSlot || 10) }
      }, 0),
      taken: allQs.filter(q => q.status !== 'cancelled').length,
      completed: allQs.filter(q => q.status === 'completed').length,
      waiting: allQs.filter(q => q.status === 'waiting').length,
      processing: allQs.filter(q => q.status === 'called' || q.status === 'processing').length,
      missedCancelled: allQs.filter(q => q.status === 'cancelled' && q.missedCount >= 3).length
    }
  }, [daySchedules, queues])

  const goQueue = (scheduleId: string, slot?: string) => {
    const url = `/pages/queue/detail?scheduleId=${scheduleId}${slot ? `&slot=${slot}` : ''}`
    Taro.switchTab({ url: '/pages/queue/index' })
    setTimeout(() => {
      Taro.navigateTo({ url })
    }, 100)
  }

  const goPrevDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    setDate(formatDate(d))
  }

  const goNextDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    setDate(formatDate(d))
  }

  const getWeekDay = (dateStr: string) => {
    const day = new Date(dateStr).getDay()
    return WEEK_DAY_LABELS[day]
  }

  if (!site) {
    return (
      <View className='site-detail-page'>
        <View className='empty'>
          <Text className='empty-icon'>🏥</Text>
          <Text className='empty-text'>采血点不存在</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className='site-detail-page' scrollY>
      <View className='site-detail-header'>
        <View className='site-detail-title'>{site.name}</View>
        <View className='site-detail-sub'>{site.address}</View>
        <View className='date-nav'>
          <View className='date-nav-btn' onClick={goPrevDay}>← 前一天</View>
          <View className='date-nav-center'>
            <Text className='date-nav-date'>{date}</Text>
            <Text className='date-nav-week'>{getWeekDay(date)}</Text>
          </View>
          <View className='date-nav-btn' onClick={goNextDay}>后一天 →</View>
        </View>
      </View>

      <View className='container'>
        <View className='overview-grid'>
          <View className='overview-card'>
            <Text className='overview-value'>{overall.scheduleCount}</Text>
            <Text className='overview-label'>当日排班</Text>
          </View>
          <View className='overview-card'>
            <Text className='overview-value'>{overall.taken}</Text>
            <Text className='overview-label'>已取号</Text>
          </View>
          <View className='overview-card'>
            <Text className='overview-value text-success'>{overall.completed}</Text>
            <Text className='overview-label'>已完成</Text>
          </View>
          <View className='overview-card'>
            <Text className='overview-value text-danger'>{overall.missedCancelled}</Text>
            <Text className='overview-label'>过号作废</Text>
          </View>
        </View>

        <View className='card'>
          <View className='card-title'>
            <Text>分时段运营详情</Text>
          </View>

          {daySchedules.length === 0 ? (
            <View className='empty'>
              <Text className='empty-icon'>📅</Text>
              <Text className='empty-text'>当日暂无排班</Text>
            </View>
          ) : (
            daySchedules.map(sch => {
              const info = slotStatsBySchedule[sch.id]
              if (!info) return null
              return (
                <View key={sch.id} className='schedule-block'>
                  <View className='schedule-block-header'>
                    <View className='schedule-block-title'>
                      <Text className='schedule-block-time'>{sch.startTime} - {sch.endTime}</Text>
                      <Text className='schedule-block-meta'>{sch.stations}采血位 · 容量{info.totalCapacity}人</Text>
                    </View>
                    <View className='btn btn-primary btn-sm' onClick={() => goQueue(sch.id)}>进入叫号台</View>
                  </View>

                  <View className='slot-stats-table'>
                    <View className='slot-table-head'>
                      <Text className='slot-col-time'>时段</Text>
                      <Text className='slot-col-num'>预约</Text>
                      <Text className='slot-col-num'>等待</Text>
                      <Text className='slot-col-num'>采集中</Text>
                      <Text className='slot-col-num'>完成</Text>
                      <Text className='slot-col-num'>过号作废</Text>
                    </View>
                    {info.slotStats.map(slot => (
                      <View
                        key={slot.slot}
                        className='slot-table-row'
                        onClick={() => goQueue(sch.id, slot.slot)}
                      >
                        <Text className='slot-col-time slot-col-time-val'>{slot.slot}</Text>
                        <Text className='slot-col-num'>
                          {slot.total}<Text className='slot-col-sub'>/{slot.capacity}</Text>
                        </Text>
                        <Text className='slot-col-num' style={{ color: '#F59E0B' }}>{slot.waiting}</Text>
                        <Text className='slot-col-num' style={{ color: '#3B82F6' }}>{slot.processing}</Text>
                        <Text className='slot-col-num text-success'>{slot.completed}</Text>
                        <Text className='slot-col-num text-danger'>{slot.missedCancelled}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            })
          )}
        </View>
      </View>
    </ScrollView>
  )
}
