import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useStore } from '@/store'
import { formatDate, addDays } from '@/utils'
import { WEEK_DAY_LABELS } from '@/types'
import './index.scss'

export default function SchedulesIndex() {
  const { sites, schedules, deleteSchedule, queues } = useStore()
  const [filterSiteId, setFilterSiteId] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const filteredSchedules = useMemo(() => {
    let list = [...schedules]
    if (filterSiteId) {
      list = list.filter(s => s.siteId === filterSiteId)
    }
    if (filterDate) {
      list = list.filter(s => s.date === filterDate)
    }
    return list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.startTime.localeCompare(b.startTime)
    })
  }, [schedules, filterSiteId, filterDate])

  const scheduleStats = useMemo(() => {
    const map: Record<string, { total: number; waiting: number; completed: number }> = {}
    schedules.forEach(s => {
      map[s.id] = { total: 0, waiting: 0, completed: 0 }
    })
    queues.forEach(q => {
      if (map[q.scheduleId]) {
        map[q.scheduleId].total++
        if (q.status === 'waiting' || q.status === 'called' || q.status === 'processing') {
          map[q.scheduleId].waiting++
        }
        if (q.status === 'completed') {
          map[q.scheduleId].completed++
        }
      }
    })
    return map
  }, [schedules, queues])

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filteredSchedules> = {}
    filteredSchedules.forEach(s => {
      if (!groups[s.date]) groups[s.date] = []
      groups[s.date].push(s)
    })
    return groups
  }, [filteredSchedules])

  const dateOptions = useMemo(() => {
    const dates: string[] = []
    const today = new Date()
    for (let i = 0; i < 60; i++) {
      dates.push(formatDate(addDays(today, i)))
    }
    return dates
  }, [])

  const handleAdd = () => {
    Taro.navigateTo({ url: '/pages/schedules/edit' })
  }

  const handleEdit = (id: string) => {
    Taro.navigateTo({ url: `/pages/schedules/edit?id=${id}` })
  }

  const handleDelete = (id: string, siteName: string, date: string) => {
    Taro.showModal({
      title: '删除确认',
      content: `确定删除 ${date} ${siteName} 的排班吗？`,
      confirmColor: '#DC2626',
      success: (res) => {
        if (res.confirm) {
          deleteSchedule(id)
          Taro.showToast({ title: '删除成功', icon: 'success' })
        }
      }
    })
  }

  const handleQueue = (id: string) => {
    Taro.switchTab({ url: '/pages/queue/index' })
    setTimeout(() => {
      Taro.navigateTo({ url: `/pages/queue/detail?scheduleId=${id}` })
    }, 100)
  }

  const getWeekDay = (dateStr: string) => {
    const day = new Date(dateStr).getDay()
    return WEEK_DAY_LABELS[day]
  }

  return (
    <ScrollView className='schedules-page' scrollY>
      <View className='container'>
        <View className='page-header'>
          <View className='page-header-info'>
            <Text className='page-header-title'>排班管理</Text>
            <Text className='page-header-desc'>共 {schedules.length} 条排班</Text>
          </View>
          <View className='btn btn-primary btn-sm' onClick={handleAdd}>
            + 新增
          </View>
        </View>

        <View className='filter-card'>
          <View className='filter-row'>
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
            <View className='filter-item'>
              <Text className='filter-label'>日期</Text>
              <Picker
                mode='selector'
                range={['全部', ...dateOptions]}
                value={filterDate ? dateOptions.findIndex(d => d === filterDate) + 1 : 0}
                onChange={e => {
                  const idx = e.detail.value
                  setFilterDate(idx === 0 ? '' : dateOptions[idx - 1] || '')
                }}
              >
                <View className='picker-wrapper picker-wrapper-sm'>
                  {filterDate || '全部'}
                </View>
              </Picker>
            </View>
          </View>
          {(filterSiteId || filterDate) && (
            <View
              className='filter-clear'
              onClick={() => { setFilterSiteId(''); setFilterDate('') }}
            >
              清除筛选
            </View>
          )}
        </View>

        {Object.keys(groupedByDate).length === 0 ? (
          <View className='empty'>
            <Text className='empty-icon'>📋</Text>
            <Text className='empty-text'>暂无排班记录</Text>
            <Text className='empty-hint'>请前往「周期规则」批量生成排班</Text>
            <View className='btn btn-primary mt-6' onClick={handleAdd}>
              手动新增排班
            </View>
          </View>
        ) : (
          Object.keys(groupedByDate).map(date => (
            <View key={date} className='date-group'>
              <View className='date-group-header'>
                <Text className='date-group-date'>{date}</Text>
                <Text className='date-group-weekday'>{getWeekDay(date)}</Text>
                <Text className='date-group-count'>{groupedByDate[date].length}条</Text>
              </View>

              {groupedByDate[date].map(schedule => {
                const stats = scheduleStats[schedule.id] || { total: 0, waiting: 0, completed: 0 }
                return (
                  <View key={schedule.id} className='schedule-card'>
                    <View className='schedule-card-header'>
                      <View className='schedule-card-title'>
                        <Text className='schedule-card-time'>
                          {schedule.startTime} - {schedule.endTime}
                        </Text>
                        <Text className='schedule-card-site'>{schedule.siteName}</Text>
                      </View>
                      <View className='schedule-card-tags'>
                        {schedule.isException && (
                          <Text className='tag tag-yellow'>例外调整</Text>
                        )}
                        <Text className='tag tag-blue'>{schedule.stations}位</Text>
                      </View>
                    </View>

                    {schedule.isException && schedule.exceptionReason && (
                      <View className='schedule-card-reason'>
                        <Text className='schedule-card-reason-label'>调整原因：</Text>
                        <Text className='schedule-card-reason-text'>{schedule.exceptionReason}</Text>
                      </View>
                    )}

                    <View className='schedule-card-stats'>
                      <View className='stat-mini'>
                        <Text className='stat-mini-value'>{stats.total}</Text>
                        <Text className='stat-mini-label'>取号</Text>
                      </View>
                      <View className='stat-mini'>
                        <Text className='stat-mini-value' style={{ color: '#F59E0B' }}>{stats.waiting}</Text>
                        <Text className='stat-mini-label'>待采</Text>
                      </View>
                      <View className='stat-mini'>
                        <Text className='stat-mini-value text-success'>{stats.completed}</Text>
                        <Text className='stat-mini-label'>完成</Text>
                      </View>
                    </View>

                    <View className='schedule-card-actions'>
                      <View
                        className='btn btn-success btn-sm flex-1'
                        onClick={() => handleQueue(schedule.id)}
                      >
                        📣 叫号
                      </View>
                      <View
                        className='btn btn-secondary btn-sm flex-1'
                        onClick={() => handleEdit(schedule.id)}
                      >
                        调整
                      </View>
                      <View
                        className='btn btn-danger btn-sm flex-1'
                        onClick={() => handleDelete(schedule.id, schedule.siteName, schedule.date)}
                      >
                        删除
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}
