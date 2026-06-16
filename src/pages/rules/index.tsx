import { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useStore } from '@/store'
import { WEEK_DAY_LABELS } from '@/types'
import './index.scss'

export default function RulesIndex() {
  const { rules, deleteRule, batchGenerateSchedules, schedules } = useStore()
  const [, forceUpdate] = useState(0)
  const [generating, setGenerating] = useState(false)

  useDidShow(() => {
    forceUpdate(v => v + 1)
  })

  const ruleScheduleCount = useMemo(() => {
    const map: Record<string, number> = {}
    schedules.forEach(s => {
      const rule = rules.find(r =>
        r.siteId === s.siteId &&
        s.startTime === r.startTime &&
        s.endTime === r.endTime
      )
      if (rule && !s.isException) {
        map[rule.id] = (map[rule.id] || 0) + 1
      }
    })
    return map
  }, [rules, schedules])

  const handleAdd = () => {
    Taro.navigateTo({ url: '/pages/rules/edit' })
  }

  const handleEdit = (id: string) => {
    Taro.navigateTo({ url: `/pages/rules/edit?id=${id}` })
  }

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '删除确认',
      content: '确定要删除该周期规则吗？已生成的排班记录不会受影响。',
      confirmColor: '#DC2626',
      success: (res) => {
        if (res.confirm) {
          deleteRule(id)
          Taro.showToast({ title: '删除成功', icon: 'success' })
        }
      }
    })
  }

  const handleGenerate = async (rule: { id: string; siteName: string }) => {
    if (generating) return
    setGenerating(true)

    try {
      Taro.showLoading({ title: '生成中...', mask: true })
      await new Promise(r => setTimeout(r, 300))
      const generated = batchGenerateSchedules(rule.id)
      Taro.hideLoading()

      if (generated.length > 0) {
        Taro.showModal({
          title: '生成成功',
          content: `已为「${rule.siteName}」生成 ${generated.length} 条排班记录。`,
          showCancel: false,
          confirmText: '好的'
        })
      } else {
        Taro.showToast({
          title: '没有新排班可生成',
          icon: 'none'
        })
      }
    } finally {
      setGenerating(false)
    }
  }

  const formatWeekDays = (days: number[]) => {
    return days
      .sort((a, b) => a - b)
      .map(d => WEEK_DAY_LABELS[d])
      .join('、')
  }

  return (
    <ScrollView className='rules-page' scrollY>
      <View className='container'>
        <View className='page-header'>
          <View className='page-header-info'>
            <Text className='page-header-title'>周期规则</Text>
            <Text className='page-header-desc'>共 {rules.length} 条规则</Text>
          </View>
          <View className='btn btn-primary btn-sm' onClick={handleAdd}>
            + 新增
          </View>
        </View>

        {rules.length === 0 ? (
          <View className='empty'>
            <Text className='empty-icon'>📅</Text>
            <Text className='empty-text'>暂无周期规则</Text>
            <View className='btn btn-primary mt-6' onClick={handleAdd}>
              创建第一条规则
            </View>
          </View>
        ) : (
          rules.map(rule => (
            <View key={rule.id} className='rule-card'>
              <View className='rule-card-header'>
                <View className='rule-card-title'>
                  <View className='rule-card-icon'>📅</View>
                  <View className='rule-card-title-text'>
                    <Text className='rule-card-name'>{rule.siteName}</Text>
                    <Text className='rule-card-time'>{rule.startTime} - {rule.endTime}</Text>
                  </View>
                </View>
              </View>

              <View className='rule-card-info'>
                <View className='rule-card-info-row'>
                  <Text className='rule-card-info-label'>每周</Text>
                  <Text className='tag tag-blue'>{formatWeekDays(rule.weekDays)}</Text>
                </View>
                <View className='rule-card-info-row'>
                  <Text className='rule-card-info-label'>有效期</Text>
                  <Text className='rule-card-info-value'>{rule.startDate} ~ {rule.endDate}</Text>
                </View>
                <View className='rule-card-info-row'>
                  <Text className='rule-card-info-label'>每小时容量</Text>
                  <Text className='rule-card-info-value'>{rule.capacityPerHour} 人/小时</Text>
                </View>
                <View className='rule-card-info-row'>
                  <Text className='rule-card-info-label'>已生成排班</Text>
                  <Text className='rule-card-info-value text-success'>
                    {ruleScheduleCount[rule.id] || 0} 条
                  </Text>
                </View>
              </View>

              <View className='rule-card-actions'>
                <View
                  className='btn btn-success btn-sm flex-1'
                  onClick={() => handleGenerate(rule)}
                >
                  🔄 批量生成
                </View>
                <View
                  className='btn btn-secondary btn-sm flex-1'
                  onClick={() => handleEdit(rule.id)}
                >
                  编辑
                </View>
                <View
                  className='btn btn-danger btn-sm flex-1'
                  onClick={() => handleDelete(rule.id)}
                >
                  删除
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}
