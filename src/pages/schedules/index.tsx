import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Picker, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useStore } from '@/store'
import { formatDate, addDays, getWeekRange } from '@/utils'
import { WEEK_DAY_LABELS, Schedule } from '@/types'
import './index.scss'

export default function SchedulesIndex() {
  const { sites, schedules, deleteSchedule, updateSchedule, queues } = useStore()
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list')
  const [filterSiteId, setFilterSiteId] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [weekBaseDate, setWeekBaseDate] = useState(formatDate(new Date()))
  const [quickEditSchedule, setQuickEditSchedule] = useState<Schedule | null>(null)
  const [quickStations, setQuickStations] = useState('')
  const [quickCapacity, setQuickCapacity] = useState('')
  const [quickInterval, setQuickInterval] = useState('')

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
    const map: Record<string, { total: number; waiting: number; completed: number; cancelled: number }> = {}
    schedules.forEach(s => {
      map[s.id] = { total: 0, waiting: 0, completed: 0, cancelled: 0 }
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
        if (q.status === 'cancelled') {
          map[q.scheduleId].cancelled++
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

  const weekRange = useMemo(() => getWeekRange(weekBaseDate), [weekBaseDate])
  const weekDisplaySites = useMemo(() => {
    return filterSiteId ? sites.filter(s => s.id === filterSiteId) : sites
  }, [sites, filterSiteId])

  const weekCellSchedules = useMemo(() => {
    const map: Record<string, typeof schedules> = {}
    for (const site of weekDisplaySites) {
      for (const d of weekRange.days) {
        map[`${site.id}_${d}`] = schedules.filter(s => s.siteId === site.id && s.date === d)
      }
    }
    return map
  }, [schedules, weekDisplaySites, weekRange.days])

  const dateOptions = useMemo(() => {
    const dates: string[] = []
    const today = new Date()
    for (let i = 0; i < 60; i++) {
      dates.push(formatDate(addDays(today, i)))
    }
    return dates
  }, [])

  const today = formatDate(new Date())

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

  const handleSiteDetail = (siteId: string, date: string) => {
    Taro.navigateTo({ url: `/pages/sites/detail?siteId=${siteId}&date=${date}` })
  }

  const openQuickEdit = (sch: Schedule) => {
    setQuickEditSchedule(sch)
    setQuickStations(String(sch.stations))
    setQuickCapacity(String(sch.capacityPerSlot || 10))
    setQuickInterval(String(sch.slotIntervalMin || 60))
  }

  const closeQuickEdit = () => {
    setQuickEditSchedule(null)
  }

  const saveQuickEdit = () => {
    if (!quickEditSchedule) return
    const stations = parseInt(quickStations)
    const capacity = parseInt(quickCapacity)
    const interval = parseInt(quickInterval)
    if (isNaN(stations) || stations < 1 || stations > 50) {
      Taro.showToast({ title: '采位数1-50', icon: 'none' })
      return
    }
    if (isNaN(capacity) || capacity < 1 || capacity > 200) {
      Taro.showToast({ title: '容量1-200', icon: 'none' })
      return
    }
    if (isNaN(interval) || interval < 15 || interval > 240) {
      Taro.showToast({ title: '时段间隔15-240分钟', icon: 'none' })
      return
    }
    updateSchedule(quickEditSchedule.id, {
      stations,
      capacityPerSlot: capacity,
      slotIntervalMin: interval
    })
    Taro.showToast({ title: '已保存', icon: 'success' })
    closeQuickEdit()
  }

  const showScheduleActions = (sch: Schedule, date: string) => {
    Taro.showActionSheet({
      itemList: ['查看运营详情', '进入叫号台', '快速调整', '编辑排班', '删除排班'],
      success: (res) => {
        if (res.tapIndex === 0) handleSiteDetail(sch.siteId, date)
        else if (res.tapIndex === 1) handleQueue(sch.id)
        else if (res.tapIndex === 2) openQuickEdit(sch)
        else if (res.tapIndex === 3) handleEdit(sch.id)
        else if (res.tapIndex === 4) handleDelete(sch.id, sch.siteName, sch.date)
      }
    })
  }

  const prevWeek = () => {
    setWeekBaseDate(formatDate(addDays(weekBaseDate, -7)))
  }
  const nextWeek = () => {
    setWeekBaseDate(formatDate(addDays(weekBaseDate, 7)))
  }
  const thisWeek = () => {
    setWeekBaseDate(formatDate(new Date()))
  }

  const getWeekDay = (dateStr: string) => {
    const day = new Date(dateStr).getDay()
    return WEEK_DAY_LABELS[day]
  }

  const getPressureLevel = (used: number, capacity: number): { label: string; cls: string; percent: number } => {
    if (capacity <= 0) return { label: '空闲', cls: 'badge-low', percent: 0 }
    const percent = Math.min(100, Math.round((used / capacity) * 100))
    if (percent < 50) return { label: '空闲', cls: 'badge-low', percent }
    if (percent < 80) return { label: '适中', cls: 'badge-mid', percent }
    return { label: '繁忙', cls: 'badge-high', percent }
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

        <View className='view-switch'>
          <View
            className={`view-switch-item ${viewMode === 'list' ? 'view-switch-item-active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            📋 列表
          </View>
          <View
            className={`view-switch-item ${viewMode === 'week' ? 'view-switch-item-active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            📅 周运营视图
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
            {viewMode === 'list' && (
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
            )}
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

        {viewMode === 'week' ? (
          <>
            <View className='week-view-header'>
              <Text className='week-view-title'>{weekRange.start} ~ {weekRange.end}</Text>
              <View className='week-view-nav'>
                <View className='btn btn-secondary btn-sm' onClick={prevWeek}>← 上周</View>
                <View className='btn btn-secondary btn-sm' onClick={thisWeek}>本周</View>
                <View className='btn btn-secondary btn-sm' onClick={nextWeek}>下周 →</View>
              </View>
            </View>

            {weekDisplaySites.length === 0 ? (
              <View className='empty'>
                <Text className='empty-icon'>🏥</Text>
                <Text className='empty-text'>暂无采血点</Text>
              </View>
            ) : (
              <View className='week-grid'>
                <View className='week-grid-cell week-grid-cell-head week-grid-cell-corner'>采血点</View>
                {weekRange.days.map(d => (
                  <View key={d} className={`week-grid-cell week-grid-cell-head ${d === today ? 'is-today' : ''}`}>
                    <View className='week-cell-day'>{getWeekDay(d).replace('周', '')}</View>
                    <View className='week-cell-date'>{d.slice(5)}</View>
                  </View>
                ))}

                {weekDisplaySites.map(site => (
                  <>
                    <View key={`s_${site.id}`} className='week-grid-cell week-grid-cell-head'>
                      <View className='week-cell-site'>{site.name}</View>
                    </View>
                    {weekRange.days.map(d => {
                      const cellKey = `${site.id}_${d}`
                      const cellList = weekCellSchedules[cellKey] || []
                      return (
                        <View key={cellKey} className={`week-grid-cell ${d === today ? 'is-today' : ''}`}>
                          {cellList.length === 0 ? (
                            <View className='week-cell-empty'>—</View>
                          ) : (
                            cellList.map(sch => {
                              const stat = scheduleStats[sch.id] || { total: 0, waiting: 0, completed: 0, cancelled: 0 }
                              const capacity = (sch.capacityPerSlot || 10) * (Math.max(1, Math.floor(
                                (parseInt(sch.endTime.split(':')[0]) * 60 + parseInt(sch.endTime.split(':')[1])
                                  - parseInt(sch.startTime.split(':')[0]) * 60 - parseInt(sch.startTime.split(':')[1]))
                                / (sch.slotIntervalMin || 60)
                              )))
                              const pressure = getPressureLevel(stat.total, capacity)
                              return (
                                <View
                                  key={sch.id}
                                  className={`week-cell-schedule ${stat.total > 0 ? 'has-queue' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); showScheduleActions(sch, d) }}
                                >
                                  <View className='week-cell-time'>{sch.startTime}-{sch.endTime}</View>
                                  <View className='week-cell-meta'>
                                    <Text>{sch.stations}采位</Text>
                                    <Text>{stat.total}人</Text>
                                  </View>
                                </View>
                              )
                            })
                          )}
                        </View>
                      )
                    })}
                  </>
                ))}
              </View>
            )}

            <View className='card mt-6'>
              <View className='card-title'>
                <Text>本周运营概览</Text>
              </View>
              {(() => {
                const weekSchedules = schedules.filter(s => s.date >= weekRange.start && s.date <= weekRange.end)
                const weekQueues = queues.filter(q => weekSchedules.some(s => s.id === q.scheduleId))
                const totalSlots = weekSchedules.reduce((sum, s) => {
                  const hours = (parseInt(s.endTime.split(':')[0]) * 60 + parseInt(s.endTime.split(':')[1])
                    - parseInt(s.startTime.split(':')[0]) * 60 - parseInt(s.startTime.split(':')[1])) / (s.slotIntervalMin || 60)
                  return sum + Math.max(1, Math.floor(hours)) * (s.capacityPerSlot || 10)
                }, 0)
                const taken = weekQueues.filter(q => q.status !== 'cancelled').length
                const completed = weekQueues.filter(q => q.status === 'completed').length
                const missedCancelled = weekQueues.filter(q => q.status === 'cancelled' && q.missedCount >= 3).length
                return (
                  <View className='stat-grid'>
                    <View className='stat-card'>
                      <Text className='stat-card-value'>{weekSchedules.length}</Text>
                      <Text className='stat-card-label'>周排班数</Text>
                    </View>
                    <View className='stat-card'>
                      <Text className='stat-card-value'>{taken}</Text>
                      <Text className='stat-card-label'>周取号数</Text>
                    </View>
                    <View className='stat-card'>
                      <Text className='stat-card-value text-success'>{completed}</Text>
                      <Text className='stat-card-label'>周完成数</Text>
                    </View>
                    <View className='stat-card'>
                      <Text className='stat-card-value text-danger'>{missedCancelled}</Text>
                      <Text className='stat-card-label'>周过号作废</Text>
                    </View>
                  </View>
                )
              })()}
            </View>
          </>
        ) : (
          <>
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
                    const stats = scheduleStats[schedule.id] || { total: 0, waiting: 0, completed: 0, cancelled: 0 }
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
                          <View className='stat-mini'>
                            <Text className='stat-mini-value text-danger'>{stats.cancelled}</Text>
                            <Text className='stat-mini-label'>作废</Text>
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
          </>
        )}
      </View>

      {quickEditSchedule && (
        <View className='quick-edit-mask' onClick={closeQuickEdit}>
          <View className='quick-edit-panel' onClick={(e) => e.stopPropagation()}>
            <View className='quick-edit-title'>快速调整排班</View>
            <View className='quick-edit-sub'>
              {quickEditSchedule.date} {quickEditSchedule.siteName}
            </View>

            <View className='form-item'>
              <Text className='form-label'>采血位数量</Text>
              <Input
                className='form-input'
                type='number'
                value={quickStations}
                onInput={(e) => setQuickStations(e.detail.value)}
                placeholder='请输入采位数'
              />
            </View>

            <View className='form-item'>
              <Text className='form-label'>每时段容量（人）</Text>
              <Input
                className='form-input'
                type='number'
                value={quickCapacity}
                onInput={(e) => setQuickCapacity(e.detail.value)}
                placeholder='请输入每时段容量'
              />
            </View>

            <View className='form-item'>
              <Text className='form-label'>时段间隔（分钟）</Text>
              <Input
                className='form-input'
                type='number'
                value={quickInterval}
                onInput={(e) => setQuickInterval(e.detail.value)}
                placeholder='请输入时段间隔'
              />
            </View>

            <View className='footer-actions'>
              <View className='btn btn-secondary flex-1' onClick={closeQuickEdit}>取消</View>
              <View className='btn btn-primary flex-1' onClick={saveQuickEdit}>保存</View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  )
}
