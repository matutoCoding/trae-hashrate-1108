import { useState, useEffect } from 'react'
import { View, Text, Input, ScrollView, Picker } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useStore } from '@/store'
import { WEEK_DAY_LABELS } from '@/types'
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

export default function RulesEdit() {
  const router = useRouter()
  const id = router.params?.id
  const isEdit = !!id

  const { sites, rules, addRule, updateRule } = useStore()

  const [siteId, setSiteId] = useState('')
  const [weekDays, setWeekDays] = useState<number[]>([1, 3, 5])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('16:00')
  const [capacityPerHour, setCapacityPerHour] = useState('10')
  const [startDate, setStartDate] = useState(formatDate(new Date()))
  const [endDate, setEndDate] = useState(formatDate(addDays(new Date(), 180)))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isEdit) {
      const rule = rules.find(r => r.id === id)
      if (rule) {
        setSiteId(rule.siteId)
        setWeekDays([...rule.weekDays])
        setStartTime(rule.startTime)
        setEndTime(rule.endTime)
        setCapacityPerHour(String(rule.capacityPerHour))
        setStartDate(rule.startDate)
        setEndDate(rule.endDate)
      }
    } else if (sites.length > 0) {
      setSiteId(sites[0].id)
    }
  }, [id, isEdit, rules, sites])

  const toggleWeekDay = (day: number) => {
    if (weekDays.includes(day)) {
      setWeekDays(weekDays.filter(d => d !== day))
    } else {
      setWeekDays([...weekDays, day].sort())
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!siteId) newErrors.siteId = '请选择采血点'
    if (weekDays.length === 0) newErrors.weekDays = '请至少选择一天'
    if (!startTime) newErrors.startTime = '请选择开始时间'
    if (!endTime) newErrors.endTime = '请选择结束时间'
    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = '结束时间必须晚于开始时间'
    }
    const capacity = parseInt(capacityPerHour)
    if (isNaN(capacity) || capacity < 1 || capacity > 100) {
      newErrors.capacityPerHour = '请输入1-100之间的数字'
    }
    if (!startDate) newErrors.startDate = '请选择开始日期'
    if (!endDate) newErrors.endDate = '请选择结束日期'
    if (startDate && endDate && startDate >= endDate) {
      newErrors.endDate = '结束日期必须晚于开始日期'
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

    const ruleData = {
      siteId: site.id,
      siteName: site.name,
      weekDays: [...weekDays].sort(),
      startTime,
      endTime,
      capacityPerHour: parseInt(capacityPerHour),
      startDate,
      endDate
    }

    if (isEdit) {
      updateRule(id!, ruleData)
      Taro.showToast({ title: '修改成功', icon: 'success' })
    } else {
      addRule(ruleData)
      Taro.showToast({ title: '创建成功', icon: 'success' })
    }

    setTimeout(() => {
      Taro.navigateBack()
    }, 1000)
  }

  const siteOptions = sites.map(s => s.name)

  return (
    <ScrollView className='rules-edit-page' scrollY>
      <View className='container'>
        <View className='card'>
          <View className='card-title'>
            <Text>{isEdit ? '编辑周期规则' : '新建周期规则'}</Text>
          </View>

          <View className='form-item'>
            <Text className='form-item-label form-item-label-required'>选择采血点</Text>
            <Picker
              mode='selector'
              range={siteOptions}
              value={sites.findIndex(s => s.id === siteId)}
              onChange={e => {
                const idx = e.detail.value
                if (sites[idx]) setSiteId(sites[idx].id)
              }}
            >
              <View className='picker-wrapper'>
                {sites.find(s => s.id === siteId)?.name || '请选择采血点'}
              </View>
            </Picker>
            {errors.siteId && <Text className='form-item-error'>{errors.siteId}</Text>}
          </View>

          <View className='form-item'>
            <Text className='form-item-label form-item-label-required'>每周重复</Text>
            <View className='switch-group'>
              {WEEK_DAY_LABELS.map((label, idx) => (
                <View
                  key={idx}
                  className={`switch-group-item ${weekDays.includes(idx) ? 'switch-group-item-active' : ''}`}
                  onClick={() => toggleWeekDay(idx)}
                >
                  {label}
                </View>
              ))}
            </View>
            {errors.weekDays && <Text className='form-item-error'>{errors.weekDays}</Text>}
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
            <Text className='form-item-label form-item-label-required'>每小时容量（人）</Text>
            <Input
              className='form-item-input'
              type='number'
              placeholder='请输入每小时可接待人数'
              value={capacityPerHour}
              onInput={e => setCapacityPerHour(e.detail.value.replace(/[^0-9]/g, ''))}
              maxlength={3}
            />
            {errors.capacityPerHour && <Text className='form-item-error'>{errors.capacityPerHour}</Text>}
          </View>

          <View className='form-row'>
            <View className='form-item form-item-half'>
              <Text className='form-item-label form-item-label-required'>开始日期</Text>
              <Picker
                mode='date'
                value={startDate}
                onChange={e => setStartDate(e.detail.value)}
              >
                <View className='picker-wrapper'>{startDate || '选择日期'}</View>
              </Picker>
              {errors.startDate && <Text className='form-item-error'>{errors.startDate}</Text>}
            </View>
            <View className='form-item form-item-half'>
              <Text className='form-item-label form-item-label-required'>结束日期</Text>
              <Picker
                mode='date'
                value={endDate}
                start={startDate}
                onChange={e => setEndDate(e.detail.value)}
              >
                <View className='picker-wrapper'>{endDate || '选择日期'}</View>
              </Picker>
              {errors.endDate && <Text className='form-item-error'>{errors.endDate}</Text>}
            </View>
          </View>
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
            {isEdit ? '保存修改' : '创建规则'}
          </View>
        </View>
      </View>
    </ScrollView>
  )
}
