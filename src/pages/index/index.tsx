import { useState, useMemo } from 'react'
import { View, Text, ScrollView, useDidShow } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useStore } from '@/store'
import { formatDate, formatDateTime, isSameDay } from '@/utils'
import './index.scss'

export default function Index() {
  const { sites, rules, schedules, queues, donors } = useStore()
  const [today, setToday] = useState(formatDate(new Date()))

  useDidShow(() => {
    setToday(formatDate(new Date()))
  })

  const stats = useMemo(() => {
    const todaySchedules = schedules.filter(s => s.date === today)
    const todayQueue = queues.filter(q => {
      const s = schedules.find(sc => sc.id === q.scheduleId)
      return s && s.date === today
    })
    const todayCompleted = todayQueue.filter(q => q.status === 'completed').length
    const todayWaiting = todayQueue.filter(q => q.status === 'waiting' || q.status === 'called').length

    return {
      siteCount: sites.length,
      ruleCount: rules.length,
      todayScheduleCount: todaySchedules.length,
      todayQueueCount: todayQueue.length,
      todayCompleted,
      todayWaiting,
      donorCount: donors.length,
      totalSchedules: schedules.length
    }
  }, [sites, rules, schedules, queues, donors, today])

  const todaySchedules = useMemo(() => {
    return schedules
      .filter(s => s.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 5)
  }, [schedules, today])

  const navTo = (url: string) => {
    Taro.navigateTo({ url })
  }

  const switchTab = (url: string) => {
    Taro.switchTab({ url })
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
      desc: '批量生成&例外调整',
      icon: '📋',
      color: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      action: () => switchTab('/pages/schedules/index')
    },
    {
      title: '现场叫号',
      desc: '取号排队&叫号',
      icon: '🔔',
      color: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      action: () => switchTab('/pages/queue/index')
    }
  ]

  return (
    <ScrollView className='index-page' scrollY>
      <View className='header'>
        <View className='header-bg' />
        <View className='header-content'>
          <View className='header-title'>
            <Text className='header-title-main'>采血车排班系统</Text>
            <Text className='header-title-sub'>{today} · 欢迎使用</Text>
          </View>
        </View>
      </View>

      <View className='container'>
        <View className='stats-grid'>
          <View className='stat-card'>
            <Text className='stat-card-value'>{stats.siteCount}</Text>
            <Text className='stat-card-label'>采血点数</Text>
          </View>
          <View className='stat-card'>
            <Text className='stat-card-value'>{stats.ruleCount}</Text>
            <Text className='stat-card-label'>周期规则</Text>
          </View>
          <View className='stat-card'>
            <Text className='stat-card-value'>{stats.todayScheduleCount}</Text>
            <Text className='stat-card-label'>今日排班</Text>
          </View>
          <View className='stat-card'>
            <Text className='stat-card-value'>{stats.todayQueueCount}</Text>
            <Text className='stat-card-label'>今日取号</Text>
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

        <View className='card'>
          <View className='card-title'>
            <Text>今日排班</Text>
            <Text
              className='card-more'
              onClick={() => switchTab('/pages/schedules/index')}
            >
              查看全部 →
            </Text>
          </View>
          {todaySchedules.length === 0 ? (
            <View className='empty'>
              <Text className='empty-icon'>📅</Text>
              <Text className='empty-text'>今日暂无排班</Text>
            </View>
          ) : (
            todaySchedules.map(s => (
              <View key={s.id} className='schedule-item'>
                <View className='schedule-item-left'>
                  <Text className='schedule-item-time'>
                    {s.startTime} - {s.endTime}
                  </Text>
                  <Text className='schedule-item-site'>{s.siteName}</Text>
                </View>
                <View className='schedule-item-right'>
                  {s.isException && <Text className='tag tag-yellow'>例外</Text>}
                  <Text className='schedule-item-stations'>{s.stations}个采血位</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View className='card'>
          <View className='card-title'>
            <Text>今日统计</Text>
          </View>
          <View className='stats-detail'>
            <View className='stats-detail-item'>
              <Text className='stats-detail-value text-success'>{stats.todayCompleted}</Text>
              <Text className='stats-detail-label'>已完成采血</Text>
            </View>
            <View className='stats-detail-divider' />
            <View className='stats-detail-item'>
              <Text className='stats-detail-value' style={{ color: '#F59E0B' }}>{stats.todayWaiting}</Text>
              <Text className='stats-detail-label'>等待中</Text>
            </View>
            <View className='stats-detail-divider' />
            <View className='stats-detail-item'>
              <Text className='stats-detail-value' style={{ color: '#3B82F6' }}>{stats.donorCount}</Text>
              <Text className='stats-detail-label'>注册献血者</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}
