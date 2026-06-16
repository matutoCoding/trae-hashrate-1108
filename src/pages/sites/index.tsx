import { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useStore } from '@/store'
import './index.scss'

export default function SitesIndex() {
  const { sites, deleteSite, schedules } = useStore()
  const [, forceUpdate] = useState(0)

  useDidShow(() => {
    forceUpdate(v => v + 1)
  })

  const siteScheduleCount = useMemo(() => {
    const map: Record<string, number> = {}
    schedules.forEach(s => {
      map[s.siteId] = (map[s.siteId] || 0) + 1
    })
    return map
  }, [schedules])

  const handleAdd = () => {
    Taro.navigateTo({ url: '/pages/sites/edit' })
  }

  const handleEdit = (id: string) => {
    Taro.navigateTo({ url: `/pages/sites/edit?id=${id}` })
  }

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '删除确认',
      content: '确定要删除该采血点吗？相关的排班记录不会受影响。',
      confirmColor: '#DC2626',
      success: (res) => {
        if (res.confirm) {
          deleteSite(id)
          Taro.showToast({ title: '删除成功', icon: 'success' })
        }
      }
    })
  }

  const handleCall = (phone: string) => {
    Taro.makePhoneCall({ phoneNumber: phone })
  }

  return (
    <ScrollView className='sites-page' scrollY>
      <View className='container'>
        <View className='page-header'>
          <View className='page-header-info'>
            <Text className='page-header-title'>采血点列表</Text>
            <Text className='page-header-desc'>共 {sites.length} 个采血点</Text>
          </View>
          <View className='btn btn-primary btn-sm' onClick={handleAdd}>
            + 新增
          </View>
        </View>

        {sites.length === 0 ? (
          <View className='empty'>
            <Text className='empty-icon'>🏥</Text>
            <Text className='empty-text'>暂无采血点</Text>
            <View className='btn btn-primary mt-6' onClick={handleAdd}>
              创建第一个采血点
            </View>
          </View>
        ) : (
          sites.map(site => (
            <View key={site.id} className='site-card'>
              <View className='site-card-header'>
                <View className='site-card-title'>
                  <View className='site-card-icon'>🏥</View>
                  <Text className='site-card-name'>{site.name}</Text>
                </View>
                <View className='site-card-tags'>
                  <Text className='tag tag-blue'>{site.stations}个采血位</Text>
                  <Text className='tag tag-green'>{siteScheduleCount[site.id] || 0}条排班</Text>
                </View>
              </View>

              <View className='site-card-info'>
                <View className='site-card-info-item'>
                  <Text className='site-card-info-label'>📍 地址</Text>
                  <Text className='site-card-info-value'>{site.address}</Text>
                </View>
                <View className='site-card-info-item' onClick={() => handleCall(site.phone)}>
                  <Text className='site-card-info-label'>📞 联系电话</Text>
                  <Text className='site-card-info-value site-card-info-link'>{site.phone}</Text>
                </View>
              </View>

              <View className='site-card-actions'>
                <View
                  className='btn btn-secondary btn-sm flex-1'
                  onClick={() => handleEdit(site.id)}
                >
                  编辑
                </View>
                <View
                  className='btn btn-danger btn-sm flex-1'
                  onClick={() => handleDelete(site.id)}
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
