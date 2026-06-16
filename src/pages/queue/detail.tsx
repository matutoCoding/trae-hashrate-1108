import { useState, useMemo, useEffect } from 'react'
import { View, Text, ScrollView, Input, Picker, Textarea } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { useStore } from '@/store'
import {
  BLOOD_TYPES,
  BLOOD_TYPE_LABELS,
  QUEUE_STATUS_LABELS,
  QUEUE_STATUS_COLORS,
  WEEK_DAY_LABELS
} from '@/types'
import {
  validateIdCard,
  validatePhone,
  validateDonationInterval,
  formatSlotRange
} from '@/utils'
import './detail.scss'

export default function QueueDetail() {
  const router = useRouter()
  const scheduleId = router.params?.scheduleId || ''
  const initialSlot = router.params?.slot || ''

  const {
    schedules,
    queues,
    donors,
    getOrCreateDonor,
    addQueueItem,
    updateQueueItem,
    callNextNumber,
    markMissed,
    completeDonation,
    getAvailableSlots,
    checkDuplicateDonor
  } = useStore()

  const [tab, setTab] = useState<'queue' | 'register'>('queue')
  const [callSlotFilter, setCallSlotFilter] = useState<string>(initialSlot || 'all')

  const [donorName, setDonorName] = useState('')
  const [donorIdCard, setDonorIdCard] = useState('')
  const [donorPhone, setDonorPhone] = useState('')
  const [donorBloodType, setDonorBloodType] = useState<string>('unknown')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(initialSlot || '')
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({})
  const [duplicateHint, setDuplicateHint] = useState<{ show: boolean; message: string }>({ show: false, message: '' })

  useDidShow(() => {
    if (router.params?.slot) {
      setCallSlotFilter(router.params.slot as string)
      setSelectedTimeSlot(router.params.slot as string)
      setTab('queue')
    }
  })

  const schedule = useMemo(() => {
    return schedules.find(s => s.id === scheduleId)
  }, [schedules, scheduleId])

  const slotInterval = schedule?.slotIntervalMin || 60
  const availableSlots = useMemo(() => {
    return scheduleId ? getAvailableSlots(scheduleId) : []
  }, [scheduleId, getAvailableSlots])

  useEffect(() => {
    if (availableSlots.length > 0 && !selectedTimeSlot) {
      const firstAvailable = availableSlots.find(s => !s.full)
      if (firstAvailable) setSelectedTimeSlot(firstAvailable.slot)
    }
  }, [availableSlots, selectedTimeSlot])

  useEffect(() => {
    if (!donorIdCard.trim() || !scheduleId) {
      setDuplicateHint({ show: false, message: '' })
      return
    }
    if (!validateIdCard(donorIdCard.trim())) {
      setDuplicateHint({ show: false, message: '' })
      return
    }
    const result = checkDuplicateDonor(donorIdCard.trim(), scheduleId)
    if (result.duplicate) {
      setDuplicateHint({ show: true, message: result.message })
    } else {
      setDuplicateHint({ show: false, message: '' })
    }
  }, [donorIdCard, scheduleId, checkDuplicateDonor])

  const scheduleQueues = useMemo(() => {
    return queues
      .filter(q => q.scheduleId === scheduleId)
      .sort((a, b) => {
        if (a.status === b.status) return a.queueNumber - b.queueNumber
        const statusOrder = { called: 0, processing: 1, waiting: 2, completed: 3, missed: 4, cancelled: 5 }
        return statusOrder[a.status] - statusOrder[b.status]
      })
  }, [queues, scheduleId])

  const slotsStats = useMemo(() => {
    const stats: Record<string, { waiting: number; called: number; processing: number; completed: number; missed: number; missedCancelled: number; cancelled: number; total: number }> = {}
    for (const s of availableSlots) {
      stats[s.slot] = { waiting: 0, called: 0, processing: 0, completed: 0, missed: 0, missedCancelled: 0, cancelled: 0, total: s.capacity }
    }
    for (const q of scheduleQueues) {
      if (!stats[q.timeSlot]) {
        stats[q.timeSlot] = { waiting: 0, called: 0, processing: 0, completed: 0, missed: 0, missedCancelled: 0, cancelled: 0, total: 10 }
      }
      if (q.status === 'waiting') stats[q.timeSlot].waiting++
      else if (q.status === 'called') stats[q.timeSlot].called++
      else if (q.status === 'processing') stats[q.timeSlot].processing++
      else if (q.status === 'completed') stats[q.timeSlot].completed++
      else if (q.status === 'missed') stats[q.timeSlot].missed++
      else if (q.status === 'cancelled') {
        stats[q.timeSlot].cancelled++
        if (q.missedCount >= 3) stats[q.timeSlot].missedCancelled++
      }
    }
    return stats
  }, [scheduleQueues, availableSlots])

  const waitingList = useMemo(() => {
    let list = scheduleQueues.filter(q => q.status === 'waiting')
    if (callSlotFilter !== 'all') {
      list = list.filter(q => q.timeSlot === callSlotFilter)
    }
    return list.sort((a, b) => a.queueNumber - b.queueNumber)
  }, [scheduleQueues, callSlotFilter])

  const activeList = useMemo(() =>
    scheduleQueues.filter(q => q.status === 'called' || q.status === 'processing'),
    [scheduleQueues]
  )

  const finishedList = useMemo(() =>
    scheduleQueues
      .filter(q => q.status === 'completed' || q.status === 'cancelled')
      .sort((a, b) => b.updateTime.localeCompare(a.updateTime))
      .slice(0, 20),
    [scheduleQueues]
  )

  const currentCalled = useMemo(() =>
    activeList.filter(q => q.status === 'called').sort((a, b) => a.callTime!.localeCompare(b.callTime!))[0],
    [activeList]
  )

  const processingCount = activeList.filter(q => q.status === 'processing').length
  const canProcessMore = schedule ? processingCount < schedule.stations : true

  const getWeekDay = (dateStr: string) => {
    const day = new Date(dateStr).getDay()
    return WEEK_DAY_LABELS[day]
  }

  const validateRegister = () => {
    const errors: Record<string, string> = {}
    if (!donorName.trim()) errors.name = '请输入姓名'
    if (!donorIdCard.trim()) {
      errors.idCard = '请输入身份证号'
    } else if (!validateIdCard(donorIdCard.trim())) {
      errors.idCard = '身份证号格式不正确'
    }
    if (!donorPhone.trim()) {
      errors.phone = '请输入手机号'
    } else if (!validatePhone(donorPhone.trim())) {
      errors.phone = '手机号格式不正确'
    }
    if (!selectedTimeSlot) errors.timeSlot = '请选择预约时段'
    setRegisterErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleRegister = () => {
    if (!schedule) {
      Taro.showToast({ title: '排班不存在', icon: 'none' })
      return
    }

    if (!validateRegister()) {
      Taro.showToast({ title: '请检查输入', icon: 'none' })
      return
    }

    const existingDonor = donors.find(d => d.idCard === donorIdCard.trim())
    const intervalCheck = validateDonationInterval(existingDonor?.lastDonationDate)
    if (!intervalCheck.valid) {
      Taro.showModal({
        title: '献血间隔校验未通过',
        content: intervalCheck.message,
        showCancel: false,
        confirmColor: '#DC2626'
      })
      return
    }

    if (duplicateHint.show) {
      Taro.showModal({
        title: '重复取号提醒',
        content: duplicateHint.message,
        showCancel: false,
        confirmColor: '#F59E0B'
      })
      return
    }

    const donor = getOrCreateDonor({
      name: donorName.trim(),
      idCard: donorIdCard.trim(),
      phone: donorPhone.trim(),
      bloodType: donorBloodType as any,
      lastDonationDate: existingDonor?.lastDonationDate
    })

    const result = addQueueItem({
      scheduleId: schedule.id,
      donorId: donor.id,
      donorName: donor.name,
      timeSlot: selectedTimeSlot
    })

    if (!result.ok) {
      Taro.showModal({
        title: '取号失败',
        content: result.message || '请稍后重试',
        showCancel: false,
        confirmColor: '#DC2626'
      })
      return
    }

    const item = result.data!

    Taro.showModal({
      title: '取号成功',
      content: `${donor.name}，您的排队号是：A${String(item.queueNumber).padStart(3, '0')}\n预约时段：${formatSlotRange(item.timeSlot, slotInterval)}\n前方还有 ${item.queueNumber - 1} 人等候`,
      showCancel: false,
      confirmText: '好的'
    })

    setDonorName('')
    setDonorIdCard('')
    setDonorPhone('')
    setDonorBloodType('unknown')
    setSelectedTimeSlot('')
    setRegisterErrors({})
    setDuplicateHint({ show: false, message: '' })
    setTab('queue')
  }

  const handleCallNext = () => {
    const called = callNextNumber(scheduleId, callSlotFilter === 'all' ? undefined : callSlotFilter)
    if (!called) {
      Taro.showToast({ title: '暂无等待中的献血者', icon: 'none' })
      return
    }
    Taro.vibrateLong({})
    Taro.showToast({
      title: `请 A${String(called.queueNumber).padStart(3, '0')} 号（${called.timeSlot}时段）`,
      icon: 'none',
      duration: 2000
    })
  }

  const handleStartProcess = (id: string, donorName: string) => {
    updateQueueItem(id, { status: 'processing' })
    Taro.showToast({ title: `${donorName} 开始采血`, icon: 'success' })
  }

  const handleComplete = (id: string, donorName: string) => {
    Taro.showModal({
      title: '完成采血',
      content: `确认 ${donorName} 已完成采血？`,
      success: (res) => {
        if (res.confirm) {
          completeDonation(id)
          Taro.showToast({ title: '采血完成，感谢献血！', icon: 'success' })
        }
      }
    })
  }

  const handleMissed = (id: string, missedCount: number) => {
    const item = scheduleQueues.find(q => q.id === id)
    if (!item) return
    const isLastChance = missedCount >= 2
    Taro.showModal({
      title: '确认过号',
      content: isLastChance
        ? `${item.donorName} 已连续过号${missedCount}次，本次将自动取消排队资格。`
        : `${item.donorName} 确认过号？将重排至队尾（当前过号${missedCount}次，连续3次自动作废）。`,
      confirmColor: isLastChance ? '#DC2626' : '#F59E0B',
      success: (res) => {
        if (res.confirm) {
          markMissed(id)
          if (isLastChance) {
            Taro.showToast({ title: '已自动取消资格', icon: 'none' })
          } else {
            Taro.showToast({ title: '已重排至队尾', icon: 'none' })
          }
        }
      }
    })
  }

  const handleCancel = (id: string, donorName: string) => {
    Taro.showModal({
      title: '取消排队',
      content: `确认取消 ${donorName} 的排队资格？`,
      confirmColor: '#DC2626',
      success: (res) => {
        if (res.confirm) {
          updateQueueItem(id, { status: 'cancelled' })
          Taro.showToast({ title: '已取消', icon: 'none' })
        }
      }
    })
  }

  if (!schedule) {
    return (
      <View className='container'>
        <View className='empty'>
          <Text className='empty-icon'>📋</Text>
          <Text className='empty-text'>排班不存在</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className='queue-detail-page' scrollY>
      <View className='schedule-info-bar'>
        <View className='schedule-info-main'>
          <Text className='schedule-info-site'>{schedule.siteName}</Text>
          <Text className='schedule-info-date'>
            {schedule.date} {getWeekDay(schedule.date)} · {schedule.startTime}-{schedule.endTime}
          </Text>
          <Text className='schedule-info-sub'>
            {schedule.stations}采血位 · 每{slotInterval}分钟{schedule.capacityPerSlot || 10}人
          </Text>
        </View>
        <View className='schedule-info-actions'>
          <View className='btn-bigscreen' onClick={() => Taro.navigateTo({ url: `/pages/queue/bigscreen?scheduleId=${scheduleId}` })}>
            <Text className='btn-bigscreen-icon'>🖥️</Text>
            <Text className='btn-bigscreen-text'>大屏</Text>
          </View>
        </View>
      </View>

      <View className='tabs'>
        <View
          className={`tab-item ${tab === 'queue' ? 'tab-item-active' : ''}`}
          onClick={() => setTab('queue')}
        >
          <Text className='tab-icon'>📣</Text>
          <Text>叫号台</Text>
          {waitingList.length > 0 && (
            <Text className='tab-badge'>{waitingList.length}</Text>
          )}
        </View>
        <View
          className={`tab-item ${tab === 'register' ? 'tab-item-active' : ''}`}
          onClick={() => setTab('register')}
        >
          <Text className='tab-icon'>📝</Text>
          <Text>取号登记</Text>
        </View>
      </View>

      {tab === 'queue' ? (
        <>
          <View className='container'>
            {availableSlots.length > 0 && (
              <View className='card'>
                <View className='card-title'>
                  <Text>分时段运营统计</Text>
                </View>
                <View className='slot-filter-row'>
                  <View
                    key='all'
                    className={`slot-filter-item ${callSlotFilter === 'all' ? 'slot-filter-item-active' : ''}`}
                    onClick={() => setCallSlotFilter('all')}
                  >
                    全部时段
                  </View>
                  {availableSlots.map(s => (
                    <View
                      key={s.slot}
                      className={`slot-filter-item ${callSlotFilter === s.slot ? 'slot-filter-item-active' : ''}`}
                      onClick={() => setCallSlotFilter(s.slot)}
                    >
                      {s.slot}
                    </View>
                  ))}
                </View>
                <View className='slot-stats-grid'>
                  {availableSlots.map(s => {
                    const stat = slotsStats[s.slot] || { waiting: 0, called: 0, processing: 0, completed: 0, total: s.capacity }
                    return (
                      <View key={s.slot} className={`slot-stat-card ${s.full ? 'slot-stat-card-full' : ''}`}>
                        <View className='slot-stat-head'>
                          <Text className='slot-stat-time'>{formatSlotRange(s.slot, slotInterval)}</Text>
                          <View className={`slot-stat-badge ${s.full ? 'badge-full' : 'badge-ok'}`}>
                            {s.used}/{s.capacity}
                          </View>
                        </View>
                        <View className='slot-stat-body'>
                          <View className='slot-stat-item'>
                            <Text className='slot-stat-num' style={{ color: QUEUE_STATUS_COLORS.waiting }}>{stat.waiting}</Text>
                            <Text className='slot-stat-label'>等待</Text>
                          </View>
                          <View className='slot-stat-item'>
                            <Text className='slot-stat-num' style={{ color: QUEUE_STATUS_COLORS.processing }}>{stat.processing + stat.called}</Text>
                            <Text className='slot-stat-label'>采集中</Text>
                          </View>
                          <View className='slot-stat-item'>
                            <Text className='slot-stat-num' style={{ color: QUEUE_STATUS_COLORS.completed }}>{stat.completed}</Text>
                            <Text className='slot-stat-label'>已完成</Text>
                          </View>
                          <View className='slot-stat-item'>
                            <Text className='slot-stat-num text-danger'>{stat.missedCancelled || 0}</Text>
                            <Text className='slot-stat-label'>过号作废</Text>
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {currentCalled && (
              <View className='calling-card'>
                <View className='calling-label'>当前叫号</View>
                <View className='calling-number'>A{String(currentCalled.queueNumber).padStart(3, '0')}</View>
                <View className='calling-name'>{currentCalled.donorName}</View>
                <View className='calling-sub'>时段 {formatSlotRange(currentCalled.timeSlot, slotInterval)}</View>
                <View className='calling-actions'>
                  <View
                    className='btn btn-warning btn-sm'
                    onClick={() => handleMissed(currentCalled.id, currentCalled.missedCount)}
                  >
                    ⏰ 过号
                  </View>
                  <View
                    className={`btn ${canProcessMore ? 'btn-success' : 'btn-secondary'} btn-sm`}
                    onClick={() => canProcessMore && handleStartProcess(currentCalled.id, currentCalled.donorName)}
                  >
                    {canProcessMore ? '✅ 开始采血' : `采位已满(${processingCount}/${schedule.stations})`}
                  </View>
                </View>
              </View>
            )}

            {activeList.length > 0 && (
              <View className='card'>
                <View className='card-title'>
                  <Text>采血进行中 ({processingCount}/{schedule.stations})</Text>
                </View>
                {activeList.filter(q => q.status === 'processing').map(q => (
                  <View key={q.id} className='queue-item queue-item-processing'>
                    <View className='queue-item-left'>
                      <View className='queue-item-number processing'>
                        A{String(q.queueNumber).padStart(3, '0')}
                      </View>
                      <View className='queue-item-info'>
                        <Text className='queue-item-name'>{q.donorName}</Text>
                        <View className='queue-item-meta'>
                          <Text className='tag tag-blue' style={{ marginRight: 8 }}>
                            {formatSlotRange(q.timeSlot, slotInterval)}
                          </Text>
                          <Text className='queue-item-status' style={{ color: QUEUE_STATUS_COLORS[q.status] }}>
                            {QUEUE_STATUS_LABELS[q.status]}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View
                      className='btn btn-success btn-sm'
                      onClick={() => handleComplete(q.id, q.donorName)}
                    >
                      完成
                    </View>
                  </View>
                ))}
                {activeList.filter(q => q.status === 'called' && q.id !== currentCalled?.id).map(q => (
                  <View key={q.id} className='queue-item queue-item-called'>
                    <View className='queue-item-left'>
                      <View className='queue-item-number called'>
                        A{String(q.queueNumber).padStart(3, '0')}
                      </View>
                      <View className='queue-item-info'>
                        <Text className='queue-item-name'>{q.donorName}</Text>
                        <View className='queue-item-meta'>
                          <Text className='tag tag-blue' style={{ marginRight: 8 }}>
                            {formatSlotRange(q.timeSlot, slotInterval)}
                          </Text>
                          <Text className='queue-item-status' style={{ color: QUEUE_STATUS_COLORS[q.status] }}>
                            已叫号 · 等待到位
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className='queue-item-actions'>
                      <View
                        className='btn btn-warning btn-sm'
                        onClick={() => handleMissed(q.id, q.missedCount)}
                      >
                        过号
                      </View>
                      <View
                        className={`btn ${canProcessMore ? 'btn-success' : 'btn-secondary'} btn-sm`}
                        onClick={() => canProcessMore && handleStartProcess(q.id, q.donorName)}
                      >
                        采血
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View className='card'>
              <View className='card-title'>
                <Text>
                  等待队列 ({waitingList.length})
                  {callSlotFilter !== 'all' && ` · ${formatSlotRange(callSlotFilter, slotInterval)}`}
                </Text>
                <View
                  className='btn btn-primary btn-sm'
                  onClick={handleCallNext}
                >
                  🔔 叫下一位
                </View>
              </View>
              {waitingList.length === 0 ? (
                <View className='empty-small'>
                  <Text>暂无等待中的献血者</Text>
                </View>
              ) : (
                waitingList.map((q, idx) => (
                  <View key={q.id} className='queue-item queue-item-waiting'>
                    <View className='queue-item-left'>
                      <View className={`queue-item-number ${idx < 3 ? 'urgent' : ''}`}>
                        A{String(q.queueNumber).padStart(3, '0')}
                      </View>
                      <View className='queue-item-info'>
                        <Text className='queue-item-name'>{q.donorName}</Text>
                        <View className='queue-item-meta'>
                          <Text className='tag tag-blue' style={{ marginRight: 8 }}>
                            {formatSlotRange(q.timeSlot, slotInterval)}
                          </Text>
                          {q.missedCount > 0 && (
                            <Text className='tag tag-red' style={{ marginRight: 8 }}>
                              过号{q.missedCount}次
                            </Text>
                          )}
                          <Text className='queue-item-status' style={{ color: QUEUE_STATUS_COLORS[q.status] }}>
                            {idx === 0 ? '下一位' : `前方 ${idx} 人`}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View
                      className='btn btn-danger btn-sm'
                      onClick={() => handleCancel(q.id, q.donorName)}
                    >
                      取消
                    </View>
                  </View>
                ))
              )}
            </View>

            {finishedList.length > 0 && (
              <View className='card'>
                <View className='card-title'>
                  <Text>已处理 ({finishedList.length})</Text>
                </View>
                {finishedList.map(q => (
                  <View key={q.id} className='queue-item queue-item-finished'>
                    <View className='queue-item-left'>
                      <View className='queue-item-number finished'>
                        A{String(q.queueNumber).padStart(3, '0')}
                      </View>
                      <View className='queue-item-info'>
                        <Text className='queue-item-name'>{q.donorName}</Text>
                        <View className='queue-item-meta'>
                          <Text className='tag tag-gray' style={{ marginRight: 8 }}>
                            {formatSlotRange(q.timeSlot, slotInterval)}
                          </Text>
                          <Text className='queue-item-status' style={{ color: QUEUE_STATUS_COLORS[q.status] }}>
                            {QUEUE_STATUS_LABELS[q.status]}
                            {q.status === 'cancelled' && q.missedCount >= 3 && `（过号${q.missedCount}次作废）`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      ) : (
        <View className='container'>
          <View className='card'>
            <View className='card-title'>
              <Text>选择预约时段</Text>
            </View>
            {availableSlots.length === 0 ? (
              <View className='empty-small'>
                <Text>当前排班未配置时段</Text>
              </View>
            ) : (
              <View className='slot-grid'>
                {availableSlots.map(s => (
                  <View
                    key={s.slot}
                    className={`slot-card ${selectedTimeSlot === s.slot ? 'slot-card-active' : ''} ${s.full ? 'slot-card-disabled' : ''}`}
                    onClick={() => !s.full && setSelectedTimeSlot(s.slot)}
                  >
                    <View className='slot-card-time'>{formatSlotRange(s.slot, slotInterval)}</View>
                    <View className={`slot-card-count ${s.full ? 'count-full' : 'count-ok'}`}>
                      {s.full ? `已满(${s.used}/${s.capacity})` : `剩余 ${s.capacity - s.used}/${s.capacity}`}
                    </View>
                  </View>
                ))}
              </View>
            )}
            {registerErrors.timeSlot && <Text className='form-item-error'>{registerErrors.timeSlot}</Text>}
          </View>

          <View className='card'>
            <View className='card-title'>
              <Text>献血者信息登记</Text>
            </View>

            <View className='form-item'>
              <Text className='form-item-label form-item-label-required'>姓名</Text>
              <Input
                className='form-item-input'
                placeholder='请输入献血者姓名'
                value={donorName}
                onInput={e => setDonorName(e.detail.value)}
                maxlength={20}
              />
              {registerErrors.name && <Text className='form-item-error'>{registerErrors.name}</Text>}
            </View>

            <View className='form-item'>
              <Text className='form-item-label form-item-label-required'>身份证号</Text>
              <Input
                className='form-item-input'
                placeholder='请输入18位身份证号'
                value={donorIdCard}
                onInput={e => setDonorIdCard(e.detail.value.toUpperCase())}
                maxlength={18}
              />
              {registerErrors.idCard && <Text className='form-item-error'>{registerErrors.idCard}</Text>}
              {duplicateHint.show && (
                <View className='duplicate-warn'>
                  <Text className='duplicate-warn-icon'>⚠️</Text>
                  <Text className='duplicate-warn-text'>{duplicateHint.message}</Text>
                </View>
              )}
            </View>

            <View className='form-item'>
              <Text className='form-item-label form-item-label-required'>手机号</Text>
              <Input
                className='form-item-input'
                type='number'
                placeholder='请输入11位手机号'
                value={donorPhone}
                onInput={e => setDonorPhone(e.detail.value)}
                maxlength={11}
              />
              {registerErrors.phone && <Text className='form-item-error'>{registerErrors.phone}</Text>}
            </View>

            <View className='form-item'>
              <Text className='form-item-label'>血型（选填）</Text>
              <View className='switch-group'>
                {BLOOD_TYPES.map(bt => (
                  <View
                    key={bt}
                    className={`switch-group-item ${donorBloodType === bt ? 'switch-group-item-active' : ''}`}
                    onClick={() => setDonorBloodType(bt)}
                  >
                    {BLOOD_TYPE_LABELS[bt]}
                  </View>
                ))}
              </View>
            </View>

            <View className='interval-notice'>
              <View className='interval-notice-icon'>ℹ️</View>
              <Text className='interval-notice-text'>
                系统将自动校验身份证号，两次献血间隔需满180天；同一身份证当日不可重复取号
              </Text>
            </View>
          </View>

          <View
            className='btn btn-primary btn-block'
            onClick={handleRegister}
          >
            🎫 取号排队
          </View>
        </View>
      )}
    </ScrollView>
  )
}
