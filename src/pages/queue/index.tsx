import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useStore } from '@/store'
import { formatDate, addDays } from '@/utils'
import { WEEK_DAY_LABELS } from '@/types'
import './index.scss'

export default function QueueIndex() {
  const { schedules, queues, sites } = useStore()
  const [filterDate, setFilterDate] = useState(formatDate(new Date()))
  const [filterSiteId, setFilterSiteId] = useState('')

  const dateOptions = useMemo(() => {
    const dates: string[] = []
    const today = new Date()
    for (let i = -3; i < 30; i++) {
      dates.push(formatDate(addDays(today, i)))
    }
    return dates
  }, [])

  const filteredSchedules = useMemo(() => {
    let list = schedules.filter(s => s.date === filterDate)
    if (filterSiteId) {
      list = list.filter(s => s.siteId === filterSiteId)
    }
    return list.sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [schedules, filterDate, filterSiteId])

  const scheduleQueueStats = useMemo(() => {
    const map: Record<string, {
      total: number
      waiting: number
      called: number
      processing: number
      completed: number
      missed: number
      cancelled: number
    }> = {}

    filteredSchedules.forEach(s => {
      map[s.id] = { total: 0, waiting: 0, called: 0, processing: 0, completed: 0, missed: 0, cancelled: 0 }
    })

    queues.forEach(q => {
      if (map[q.scheduleId]) {
        map[q.scheduleId].total++
        if (map[q.scheduleId][q.status] !== undefined) {
          map[q.scheduleId][q.status]++
        }
      }
    })

    return map
  }, [filteredSchedules, queues])

  const handleDetail = (scheduleId: string) => {
    Taro.navigateTo({ url: `/pages/queue/detail?scheduleId=${scheduleId}` })
  }

  const getWeekDay = (dateStr: string) => {
    const day = new Date(dateStr).getDay()
    return WEEK_DAY_LABELS[day]
  }

  return (
    <ScrollView className='queue-page' scrollY>
      <View className='container'>
        <View className='page-header'>
          <View>
            <Text className='page-header-title'>现场叫号</Text>
            <Text className='page-header-desc'>{filterDate} · {getWeekDay(filterDate)}</Text>
          </View>
        </View>

        <View className='filter-card'>
          <View className='filter-row'>
            <View className='filter-item'>
              <Text className='filter-label'>日期</Text>
              <Picker
                mode='selector'
                range={dateOptions}
                value={dateOptions.indexOf(filterDate)}
                onChange={e => setFilterDate(dateOptions[e.detail.value])}
              >
                <View className='picker-wrapper picker-wrapper-sm'>
                  {filterDate}
                </View>
              </Picker>
            </View>
            <View className='filter-item'>
              <Text className='filter-label'>采血点</Text>
              <Picker
                mode='selector'
                range={['全部', ...sites.map(s => s.name)]}
                value={filterSiteId ? sites.findIndex(s => s.id === filterSiteId) + 1 : 0}
                onChange={e => {
                  const idx = e.detail.value
                  setFilterSiteId(idx === 0 ? '' : sites[idx - 1]?.id || '')
                }}
              >
                <View className='picker-wrapper picker-wrapper-sm'>
                  {filterSiteId ? sites.find(s => s.id === filterSiteId)?.name : '全部'}
                </View>
              </Picker>
            </View>
          </View>
        </View>

        {filteredSchedules.length === 0 ? (
          <View className='empty'>
            <Text className='empty-icon'>🔔</Text>
            <Text className='empty-text'>该日期暂无排班</Text>
            <Text className='empty-hint'>请前往「排班管理」生成排班</Text>
          </View>
        ) : (
          filteredSchedules.map(schedule => {
            const stats = scheduleQueueStats[schedule.id] || {
              total: 0, waiting: 0, called: 0, processing: 0, completed: 0, missed: 0, cancelled: 0
            }
            return (
              <View
                key={schedule.id}
                className='queue-schedule-card'
                onClick={() => handleDetail(schedule.id)}
              >
                <View className='queue-schedule-header'>
                  <View className='queue-schedule-title'>
                    <Text className='queue-schedule-time'>
                      {schedule.startTime} - {schedule.endTime}
                    </Text>
                    <Text className='queue-schedule-site'>{schedule.siteName}</Text>
                  </View>
                  <View className='queue-schedule-badge'>
                    {schedule.isException && <Text className='tag tag-yellow'>例外</Text>}
                    <Text className='tag tag-blue'>{schedule.stations}位</Text>
                  </View>
                </View>

                <View className='queue-stats-row'>
                  <View className='queue-stat-item'>
                    <Text className='queue-stat-value' style={{ color: '#3B82F6' }}>{stats.waiting}</Text>
                    <Text className='queue-stat-label'>等待</Text>
                  </View>
                  <View className='queue-stat-item'>
                    <Text className='queue-stat-value' style={{ color: '#F59E0B' }}>{stats.called}</Text>
                    <Text className='queue-stat-label'>叫号</Text>
                  </View>
                  <View className='queue-stat-item'>
                    <Text className='queue-stat-value' style={{ color: '#8B5CF6' }}>{stats.processing}</Text>
                    <Text className='queue-stat-label'>采集中</Text>
                  </View>
                  <View className='queue-stat-item'>
                    <Text className='queue-stat-value text-success'>{stats.completed}</Text>
                    <Text className='queue-stat-label'>完成</Text>
                  </View>
                  <View className='queue-stat-item'>
                    <Text className='queue-stat-value text-danger'>{stats.missed + stats.cancelled}</Text>
                    <Text className='queue-stat-label'>过号</Text>
                  </View>
                </View>

                <View className='queue-stats-total'>
                  共取号 {stats.total} 人
                </View>

                <View className='queue-enter-btn'>
                  进入叫号台 →
                </View>
              </View>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}
