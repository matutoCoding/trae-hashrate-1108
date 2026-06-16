import { useState, useEffect } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { useStore } from '@/store'
import { validatePhone } from '@/utils'
import './edit.scss'

export default function SitesEdit() {
  const router = useRouter()
  const id = router.params?.id
  const isEdit = !!id

  const { sites, addSite, updateSite } = useStore()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [stations, setStations] = useState('2')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isEdit) {
      const site = sites.find(s => s.id === id)
      if (site) {
        setName(site.name)
        setAddress(site.address)
        setPhone(site.phone)
        setStations(String(site.stations))
      }
    }
  }, [id, isEdit, sites])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = '请输入采血点名称'
    if (!address.trim()) newErrors.address = '请输入采血点地址'
    if (!phone.trim()) {
      newErrors.phone = '请输入联系电话'
    } else if (!/^[\d\-]+$/.test(phone)) {
      newErrors.phone = '电话格式不正确'
    }
    const stationsNum = parseInt(stations)
    if (isNaN(stationsNum) || stationsNum < 1 || stationsNum > 20) {
      newErrors.stations = '请输入1-20之间的数字'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) {
      Taro.showToast({ title: '请检查输入', icon: 'none' })
      return
    }

    const siteData = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      stations: parseInt(stations)
    }

    if (isEdit) {
      updateSite(id!, siteData)
      Taro.showToast({ title: '修改成功', icon: 'success' })
    } else {
      addSite(siteData)
      Taro.showToast({ title: '创建成功', icon: 'success' })
    }

    setTimeout(() => {
      Taro.navigateBack()
    }, 1000)
  }

  const handleStationsChange = (v: string) => {
    const num = v.replace(/[^0-9]/g, '')
    setStations(num)
  }

  return (
    <ScrollView className='sites-edit-page' scrollY>
      <View className='container'>
        <View className='card'>
          <View className='card-title'>
            <Text>{isEdit ? '编辑采血点' : '新建采血点'}</Text>
          </View>

          <View className='form-item'>
            <Text className='form-item-label form-item-label-required'>采血点名称</Text>
            <Input
              className='form-item-input'
              placeholder='请输入采血点名称'
              value={name}
              onInput={e => setName(e.detail.value)}
              maxlength={50}
            />
            {errors.name && <Text className='form-item-error'>{errors.name}</Text>}
          </View>

          <View className='form-item'>
            <Text className='form-item-label form-item-label-required'>采血点地址</Text>
            <Input
              className='form-item-input'
              placeholder='请输入详细地址'
              value={address}
              onInput={e => setAddress(e.detail.value)}
              maxlength={100}
            />
            {errors.address && <Text className='form-item-error'>{errors.address}</Text>}
          </View>

          <View className='form-item'>
            <Text className='form-item-label form-item-label-required'>联系电话</Text>
            <Input
              className='form-item-input'
              type='number'
              placeholder='请输入联系电话'
              value={phone}
              onInput={e => setPhone(e.detail.value)}
              maxlength={20}
            />
            {errors.phone && <Text className='form-item-error'>{errors.phone}</Text>}
          </View>

          <View className='form-item'>
            <Text className='form-item-label form-item-label-required'>采血位数量</Text>
            <Input
              className='form-item-input'
              type='number'
              placeholder='请输入采血位数量（1-20）'
              value={stations}
              onInput={e => handleStationsChange(e.detail.value)}
              maxlength={2}
            />
            {errors.stations && <Text className='form-item-error'>{errors.stations}</Text>}
            <Text className='form-item-hint'>采血位数量决定每次可同时接待的献血者人数</Text>
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
            {isEdit ? '保存修改' : '创建'}
          </View>
        </View>
      </View>
    </ScrollView>
  )
}
