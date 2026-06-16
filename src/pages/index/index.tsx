import { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useStore } from '@/store'
import { formatDate } from '@/utils'
import { WEEK_DAY_LABELS } from '@/types'
import './index.scss'

export default function Index() {
  const { sites, rules, schedules, queues, donors } = useStore()
  const [today, setToday] = useState(formatDate(new Date()))

  useDidShow(() => {
    setToday(formatDate(new Date()))
  })

  const todaySchedules = useMemo(() => {
    return schedules.filter(s => s.date === today)
  }, [schedules, today])

  const todayQueue = useMemo(() => {
    const scheduleIds = new Set(todaySchedules.map(s => s.id))
    return queues.filter(q => scheduleIds.has(q.scheduleId))
  }, [queues, todaySchedules])

  const stats = useMemo(() => {
    const todayCompleted = todayQueue.filter(q => q.status === 'completed').length
    const todayWaiting = todayQueue.filter(q => q.status === 'waiting' || q.status === 'called' || q.status === 'processing').length
    const todayCancelled = todayQueue.filter(q => q.status === 'cancelled').length
    const todayTaken = todayQueue.filter(q => q.status !== 'cancelled').length
    const totalCapacity = todaySchedules.reduce((sum, s) => {
      const slots = Math.max(1, Math.floor(
        (parseInt(s.endTime.split(':')[0]) * 60 + parseInt(s.endTime.split(':')[1])
          - parseInt(s.startTime.split(':')[0]) * 60 - parseInt(s.startTime.split(':')[1]))
        / (s.slotIntervalMin || 60)
      ))
      return sum + slots * (s.capacityPerSlot || 10)
    }, 0)
    const completionRate = todayTaken > 0 ? Math.round((todayCompleted / todayTaken) * 100) : 0

    return {
      siteCount: sites.length,
      ruleCount: rules.length,
      todayScheduleCount: todaySchedules.length,
      todayQueueCount: todayTaken,
      todayCompleted,
      todayWaiting,
      todayCancelled,
      totalCapacity,
      completionRate,
      donorCount: donors.length,
      totalSchedules: schedules.length
    }
  }, [sites, rules, schedules, donors, todayQueue, todaySchedules])

  const siteStats = useMemo(() => {
    const siteMap: Record<string, {
      siteId: string
      siteName: string
      scheduleCount: number
      totalCapacity: number
      waiting: number
      completed: number
      cancelled: number
      taken: number
      pressurePercent: number
      pressureLabel: string
      pressureCls: string
      queueScheduleId?: string
    }> = {}

    for (const site of sites) {
      siteMap[site.id] = {
        siteId: site.id,
        siteName: site.name,
        scheduleCount: 0,
        totalCapacity: 0,
        waiting: 0,
        completed: 0,
        cancelled: 0,
        taken: 0,
        pressurePercent: 0,
        pressureLabel: '空闲',
        pressureCls: 'badge-low'
      }
    }

    for (const s of todaySchedules) {
      if (!siteMap[s.siteId]) continue
      siteMap[s.siteId].scheduleCount++
      const slots = Math.max(1, Math.floor(
        (parseInt(s.endTime.split(':')[0]) * 60 + parseInt(s.endTime.split(':')[1])
          - parseInt(s.startTime.split(':')[0]) * 60 - parseInt(s.startTime.split(':')[1]))
        / (s.slotIntervalMin || 60)
      ))
      siteMap[s.siteId].totalCapacity += slots * (s.capacityPerSlot || 10)
    }

    for (const q of todayQueue) {
      const sch = todaySchedules.find(s => s.id === q.scheduleId)
      if (!sch || !siteMap[sch.siteId]) continue
      const row = siteMap[sch.siteId]
      if (!row.queueScheduleId) row.queueScheduleId = sch.id
      if (q.status === 'completed') row.completed++
      else if (q.status === 'cancelled') row.cancelled++
      else { row.waiting++; row.taken++ }
      if (q.status !== 'cancelled') row.taken++
    }

    return Object.values(siteMap).map(row => {
      const percent = row.totalCapacity > 0 ? Math.min(100, Math.round((row.taken / row.totalCapacity) * 100)) : 0
      let label = '空闲', cls = 'badge-low'
      if (percent >= 80) { label = '繁忙'; cls = 'badge-high' }
      else if (percent >= 50) { label = '适中'; cls = 'badge-mid' }
      return { ...row, pressurePercent: percent, pressureLabel: label, pressureCls: cls }
    }).sort((a, b) => b.pressurePercent - a.pressurePercent)
  }, [sites, todaySchedules, todayQueue])

  const todayScheduleList = useMemo(() => {
    return todaySchedules
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 6)
      .map(s => {
        const q = queues.filter(item => item.scheduleId === s.id)
        return {
          ...s,
          total: q.filter(i => i.status !== 'cancelled').length,
          waiting: q.filter(i => i.status === 'waiting' || i.status === 'called' || i.status === 'processing').length,
          completed: q.filter(i => i.status === 'completed').length
        }
      })
  }, [todaySchedules, queues])

  const navTo = (url: string) => {
    Taro.navigateTo({ url })
  }

  const switchTab = (url: string) => {
    Taro.switchTab({ url })
  }

  const goQueue = (scheduleId?: string) => {
    if (scheduleId) {
      switchTab('/pages/queue/index')
      setTimeout(() => {
        Taro.navigateTo({ url: `/pages/queue/detail?scheduleId=${scheduleId}` })
      }, 100)
    } else {
      switchTab('/pages/queue/index')
    }
  }

  const goSchedules = () => {
    switchTab('/pages/schedules/index')
  }

  const getWeekDay = (dateStr: string) => {
    const day = new Date(dateStr).getDay()
    return WEEK_DAY_LABELS[day]
  }

  const modules = [
    {
      title: '采血点管理',
      desc: '采血位资源建档',
      icon: '🏥',
      color: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      action: () => navTo('/pages/sites/index')
    },
    {
      title: '周期规则',
      desc: '设定排班周期',
      icon: '📅',
      color: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
      action: () => navTo('/pages/rules/index')
    },
    {
      title: '排班管理',
      desc: '批量生成&周视图',
      icon: '📋',
      color: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      action: goSchedules
    },
    {
      title: '现场叫号',
      desc: '取号排队&叫号',
      icon: '🔔',
      color: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      action: () => goQueue()
    }
  ]

  return (
    <ScrollView className='index-page' scrollY>
      <View className='header'>
        <View className='header-bg' />
        <View className='header-content'>
          <View className='header-title'>
            <Text className='header-title-main'>采血车排班系统</Text>
            <Text className='header-title-sub'>{today} {getWeekDay(today)} · 欢迎使用</Text>
          </View>
        </View>
      </View>

      <View className='container'>
        <View className='stat-grid'>
          <View className='stat-card-full' onClick={goSchedules}>
            <Text className='stat-card-value'>{stats.todayScheduleCount}</Text>
            <Text className='stat-card-label'>今日排班（点击查看全部）</Text>
          </View>
          <View className='stat-card' onClick={() => goQueue()}>
            <Text className='stat-card-value'>{stats.todayQueueCount}</Text>
            <Text className='stat-card-label'>今日取号</Text>
          </View>
          <View className='stat-card'>
            <Text className='stat-card-value text-success'>{stats.todayCompleted}</Text>
            <Text className='stat-card-label'>已完成采血</Text>
          </View>
          <View className='stat-card'>
            <Text className='stat-card-value' style={{ color: '#10B981' }}>{stats.completionRate}%</Text>
            <Text className='stat-card-label'>完成率</Text>
          </View>
          <View className='stat-card'>
            <Text className='stat-card-value' style={{ color: '#F59E0B' }}>{stats.todayWaiting}</Text>
            <Text className='stat-card-label'>等待采集中</Text>
          </View>
          <View className='stat-card'>
            <Text className='stat-card-value text-danger'>{stats.todayCancelled}</Text>
            <Text className='stat-card-label'>过号作废</Text>
          </View>
        </View>

        <View className='card'>
          <View className='card-title'>
            <Text>功能模块</Text>
          </View>
          <View className='module-grid'>
            {modules.map((m, idx) => (
              <View
                key={idx}
                className='module-item'
                onClick={m.action}
              >
                <View className='module-icon' style={{ background: m.color }}>
                  <Text>{m.icon}</Text>
                </View>
                <Text className='module-title'>{m.title}</Text>
                <Text className='module-desc'>{m.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className='card' onClick={goSchedules}>
          <View className='card-title'>
            <Text>今日排班</Text>
            <Text className='card-more'>
              查看全部 →
            </Text>
          </View>
          {todayScheduleList.length === 0 ? (
            <View className='empty'>
              <Text className='empty-icon'>📅</Text>
              <Text className='empty-text'>今日暂无排班</Text>
            </View>
          ) : (
            todayScheduleList.map(s => (
              <View key={s.id} className='schedule-item' onClick={(e) => { e.stopPropagation(); goQueue(s.id) }}>
                <View className='schedule-item-left'>
                  <Text className='schedule-item-time'>
                    {s.startTime} - {s.endTime}
                  </Text>
                  <Text className='schedule-item-site'>{s.siteName}</Text>
                </View>
                <View className='schedule-item-right'>
                  {s.isException && <Text className='tag tag-yellow' style={{ marginRight: 8 }}>例外</Text>}
                  <Text className='schedule-item-stations'>
                    {s.stations}位 · 待采{s.waiting}/完成{s.completed}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View className='card'>
          <View className='card-title'>
            <Text>采血点排队压力</Text>
            <Text className='card-more' onClick={goSchedules}>
              周视图 →
            </Text>
          </View>
          {siteStats.length === 0 ? (
            <View className='empty'>
              <Text className='empty-icon'>🏥</Text>
              <Text className='empty-text'>暂无采血点</Text>
            </View>
          ) : (
            siteStats.map(row => (
              <View
                key={row.siteId}
                className='site-stats-card'
                onClick={() => row.queueScheduleId ? goQueue(row.queueScheduleId) : goSchedules()}
              >
                <View className='site-stats-header'>
                  <Text className='site-stats-name'>{row.siteName}</Text>
                  <View className={`site-stats-badge ${row.pressureCls}`}>{row.pressureLabel} {row.pressurePercent}%</View>
                </View>
                <View className='site-stats-row'>
                  <Text>排班<span className='site-stats-num'>{row.scheduleCount}</span></Text>
                  <Text>等待<span className='site-stats-num' style={{ color: '#F59E0B' }}>{row.waiting}</span></Text>
                  <Text>完成<span className='site-stats-num text-success'>{row.completed}</span></Text>
                  <Text>作废<span className='site-stats-num text-danger'>{row.cancelled}</span></Text>
                </View>
                <View className='pressure-bar'>
                  <View className='pressure-bar-fill' style={{ width: `${row.pressurePercent}%` }} />
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  )
}
