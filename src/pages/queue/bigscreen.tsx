import { useMemo, useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { useStore } from '@/store'
import { WEEK_DAY_LABELS } from '@/types'
import './bigscreen.scss'

export default function BigScreen() {
  const router = useRouter()
  const { schedules, queues, sites } = useStore()
  const scheduleId = router.params.scheduleId as string
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('zh-CN', { hour12: false }))

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const schedule = useMemo(() => schedules.find(s => s.id === scheduleId), [schedules, scheduleId])
  const site = useMemo(() => sites.find(s => s.id === schedule?.siteId), [sites, schedule])

  const queueList = useMemo(() => {
    if (!scheduleId) return []
    return queues
      .filter(q => q.scheduleId === scheduleId && q.status !== 'cancelled')
      .sort((a, b) => a.number - b.number)
  }, [queues, scheduleId])

  const currentCalled = useMemo(() => {
    const processing = queueList.filter(q => q.status === 'processing')
    const called = queueList.filter(q => q.status === 'called')
    return [...processing, ...called]
  }, [queueList])

  const waitingList = useMemo(() => {
    return queueList.filter(q => q.status === 'waiting').slice(0, 8)
  }, [queueList])

  const stats = useMemo(() => {
    const total = queueList.length
    const completed = queueList.filter(q => q.status === 'completed').length
    const waiting = queueList.filter(q => q.status === 'waiting').length
    const processing = queueList.filter(q => q.status === 'called' || q.status === 'processing').length
    const stations = schedule?.stations || 3
    const freeStations = Math.max(0, stations - processing)
    return { total, completed, waiting, processing, stations, freeStations }
  }, [queueList, schedule])

  const getWeekDay = (dateStr: string) => {
    const day = new Date(dateStr).getDay()
    return WEEK_DAY_LABELS[day]
  }

  const handleBack = () => {
    Taro.navigateBack()
  }

  const handleCallNext = () => {
    Taro.navigateBack()
  }

  if (!schedule) {
    return (
      <View className='bigscreen-page'>
        <View className='empty'>
          <Text className='empty-icon'>📅</Text>
          <Text className='empty-text'>排班不存在</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='bigscreen-page'>
      <View className='bigscreen-header'>
        <View className='bigscreen-header-left'>
          <Text className='bigscreen-site'>{site?.name || '采血点'}</Text>
          <Text className='bigscreen-time-range'>{schedule.startTime} - {schedule.endTime} · {schedule.stations}采血位</Text>
        </View>
        <View className='bigscreen-header-right'>
          <Text className='bigscreen-date'>{schedule.date} {getWeekDay(schedule.date)}</Text>
          <Text className='bigscreen-clock'>{currentTime}</Text>
        </View>
      </View>

      <View className='bigscreen-main'>
        <View className='bigscreen-left'>
          <View className='current-calling-block'>
            <View className='current-calling-label'>当前叫号</View>
            {currentCalled.length === 0 ? (
              <View className='current-calling-empty'>
                <Text className='current-calling-empty-text'>等待叫号中...</Text>
              </View>
            ) : (
              <View className='current-calling-list'>
                {currentCalled.map(item => (
                  <View key={item.id} className={`current-calling-item ${item.status === 'processing' ? 'is-processing' : ''}`}>
                    <Text className='current-calling-number'>{String(item.number).padStart(3, '0')}</Text>
                    <Text className='current-calling-name'>{item.name || '献血者'}</Text>
                    {item.timeSlot && (
                      <Text className='current-calling-slot'>{item.timeSlot} 时段</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className='station-block'>
            <View className='station-block-title'>采血位状态</View>
            <View className='station-grid'>
              {Array.from({ length: schedule.stations }, (_, i) => {
                const idx = i
                const calledItem = currentCalled[idx]
                const isBusy = !!calledItem
                return (
                  <View key={i} className={`station-card ${isBusy ? 'station-busy' : 'station-free'}`}>
                    <View className='station-no'>{i + 1}号采位</View>
                    {isBusy ? (
                      <>
                        <View className='station-status-text'>采集中</View>
                        <View className='station-number'>{String(calledItem.number).padStart(3, '0')}</View>
                        <View className='station-name'>{calledItem.name || '献血者'}</View>
                      </>
                    ) : (
                      <>
                        <View className='station-status-text'>空闲</View>
                        <View className='station-number'>—</View>
                      </>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        </View>

        <View className='bigscreen-right'>
          <View className='waiting-block'>
            <View className='waiting-block-header'>
              <Text className='waiting-block-title'>等待中</Text>
              <Text className='waiting-block-count'>{stats.waiting} 人</Text>
            </View>
            <ScrollView className='waiting-list' scrollY>
              {waitingList.length === 0 ? (
                <View className='waiting-empty'>暂无等待</View>
              ) : (
                waitingList.map((item, idx) => (
                  <View key={item.id} className='waiting-item'>
                    <Text className='waiting-index'>{idx + 1}</Text>
                    <Text className='waiting-number'>{String(item.number).padStart(3, '0')}</Text>
                    <Text className='waiting-name'>{item.name || '献血者'}</Text>
                    {item.timeSlot && (
                      <Text className='waiting-slot'>{item.timeSlot}</Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          <View className='stats-block'>
            <View className='stats-row'>
              <View className='stats-item'>
                <Text className='stats-value'>{stats.total}</Text>
                <Text className='stats-label'>今日取号</Text>
              </View>
              <View className='stats-item'>
                <Text className='stats-value text-success'>{stats.completed}</Text>
                <Text className='stats-label'>已完成</Text>
              </View>
            </View>
            <View className='stats-row'>
              <View className='stats-item'>
                <Text className='stats-value' style={{ color: '#F59E0B' }}>{stats.waiting}</Text>
                <Text className='stats-label'>等待中</Text>
              </View>
              <View className='stats-item'>
                <Text className='stats-value' style={{ color: '#3B82F6' }}>{stats.processing}</Text>
                <Text className='stats-label'>采集中</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className='bigscreen-footer'>
        <View className='btn btn-secondary btn-lg' onClick={handleBack}>← 返回叫号台</View>
      </View>
    </View>
  )
}
