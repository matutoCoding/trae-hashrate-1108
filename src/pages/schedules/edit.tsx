import { useState, useEffect } from 'react'
import { View, Text, Input, ScrollView, Picker, Textarea } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useStore } from '@/store'
import { formatDate, addDays } from '@/utils'
import './edit.scss'

const TIME_OPTIONS = (() => {
  const arr: string[] = []
  for (let h = 7; h <= 20; h++) {
    arr.push(`${h.toString().padStart(2, '0')}:00`)
    arr.push(`${h.toString().padStart(2, '0')}:30`)
  }
  return arr
})()

export default function SchedulesEdit() {
  const router = useRouter()
  const id = router.params?.id
  const isEdit = !!id

  const { sites, schedules, addSchedule, updateSchedule } = useStore()

  const [siteId, setSiteId] = useState('')
  const [date, setDate] = useState(formatDate(new Date()))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('16:00')
  const [stations, setStations] = useState('2')
  const [exceptionReason, setExceptionReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const dateOptions = (() => {
    const dates: string[] = []
    const today = new Date()
    for (let i = 0; i < 180; i++) {
      dates.push(formatDate(addDays(today, i)))
    }
    return dates
  })()

  useEffect(() => {
    if (isEdit) {
      const schedule = schedules.find(s => s.id === id)
      if (schedule) {
        setSiteId(schedule.siteId)
        setDate(schedule.date)
        setStartTime(schedule.startTime)
        setEndTime(schedule.endTime)
        setStations(String(schedule.stations))
        setExceptionReason(schedule.exceptionReason || '')
      }
    } else if (sites.length > 0) {
      setSiteId(sites[0].id)
      setStations(String(sites[0].stations))
    }
  }, [id, isEdit, schedules, sites])

  const onSiteChange = (sid: string) => {
    setSiteId(sid)
    const site = sites.find(s => s.id === sid)
    if (site && !isEdit) {
      setStations(String(site.stations))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!siteId) newErrors.siteId = '请选择采血点'
    if (!date) newErrors.date = '请选择日期'
    if (!startTime) newErrors.startTime = '请选择开始时间'
    if (!endTime) newErrors.endTime = '请选择结束时间'
    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = '结束时间必须晚于开始时间'
    }
    const stationsNum = parseInt(stations)
    if (isNaN(stationsNum) || stationsNum < 1 || stationsNum > 50) {
      newErrors.stations = '请输入1-50之间的数字'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) {
      Taro.showToast({ title: '请检查输入', icon: 'none' })
      return
    }

    const site = sites.find(s => s.id === siteId)
    if (!site) {
      Taro.showToast({ title: '采血点不存在', icon: 'none' })
      return
    }

    const scheduleData = {
      siteId: site.id,
      siteName: site.name,
      date,
      startTime,
      endTime,
      stations: parseInt(stations),
      isException: true,
      exceptionReason: exceptionReason.trim() || undefined
    }

    if (isEdit) {
      updateSchedule(id!, {
        ...scheduleData,
        exceptionReason: exceptionReason.trim() || undefined
      })
      Taro.showToast({ title: '调整成功', icon: 'success' })
    } else {
      addSchedule({
        ...scheduleData,
        isException: false,
        exceptionReason: undefined
      })
      Taro.showToast({ title: '创建成功', icon: 'success' })
    }

    setTimeout(() => {
      Taro.navigateBack()
    }, 1000)
  }

  const siteOptions = sites.map(s => s.name)

  return (
    <ScrollView className='schedules-edit-page' scrollY>
      <View className='container'>
        <View className='card'>
          <View className='card-title'>
            <Text>{isEdit ? '调整排班（例外）' : '新增排班'}</Text>
          </View>

          <View className='form-item'>
            <Text className='form-item-label form-item-label-required'>选择采血点</Text>
            <Picker
              mode='selector'
              range={siteOptions}
              value={sites.findIndex(s => s.id === siteId)}
              onChange={e => {
                const idx = e.detail.value
                if (sites[idx]) onSiteChange(sites[idx].id)
              }}
            >
              <View className='picker-wrapper'>
                {sites.find(s => s.id === siteId)?.name || '请选择采血点'}
              </View>
            </Picker>
            {errors.siteId && <Text className='form-item-error'>{errors.siteId}</Text>}
          </View>

          <View className='form-item'>
            <Text className='form-item-label form-item-label-required'>日期</Text>
            <Picker
              mode='selector'
              range={dateOptions}
              value={dateOptions.indexOf(date)}
              onChange={e => setDate(dateOptions[e.detail.value])}
            >
              <View className='picker-wrapper'>{date || '选择日期'}</View>
            </Picker>
            {errors.date && <Text className='form-item-error'>{errors.date}</Text>}
          </View>

          <View className='form-row'>
            <View className='form-item form-item-half'>
              <Text className='form-item-label form-item-label-required'>开始时间</Text>
              <Picker
                mode='selector'
                range={TIME_OPTIONS}
                value={TIME_OPTIONS.indexOf(startTime)}
                onChange={e => setStartTime(TIME_OPTIONS[e.detail.value])}
              >
                <View className='picker-wrapper'>{startTime || '选择时间'}</View>
              </Picker>
              {errors.startTime && <Text className='form-item-error'>{errors.startTime}</Text>}
            </View>
            <View className='form-item form-item-half'>
              <Text className='form-item-label form-item-label-required'>结束时间</Text>
              <Picker
                mode='selector'
                range={TIME_OPTIONS}
                value={TIME_OPTIONS.indexOf(endTime)}
                onChange={e => setEndTime(TIME_OPTIONS[e.detail.value])}
              >
                <View className='picker-wrapper'>{endTime || '选择时间'}</View>
              </Picker>
              {errors.endTime && <Text className='form-item-error'>{errors.endTime}</Text>}
            </View>
          </View>

          <View className='form-item'>
            <Text className='form-item-label form-item-label-required'>采血位数量</Text>
            <Input
              className='form-item-input'
              type='number'
              placeholder='请输入采血位数量'
              value={stations}
              onInput={e => setStations(e.detail.value.replace(/[^0-9]/g, ''))}
              maxlength={2}
            />
            {errors.stations && <Text className='form-item-error'>{errors.stations}</Text>}
          </View>

          {isEdit && (
            <View className='form-item'>
              <Text className='form-item-label'>调整原因</Text>
              <Textarea
                className='form-item-textarea'
                placeholder='请输入调整原因（如：临时设备维护、人员调动等）'
                value={exceptionReason}
                onInput={e => setExceptionReason(e.detail.value)}
                maxlength={200}
              />
            </View>
          )}
        </View>

        <View className='footer-actions'>
          <View
            className='btn btn-secondary flex-1'
            onClick={() => Taro.navigateBack()}
          >
            取消
          </View>
          <View
            className='btn btn-primary flex-1'
            onClick={handleSubmit}
          >
            {isEdit ? '保存调整' : '创建排班'}
          </View>
        </View>
      </View>
    </ScrollView>
  )
}
