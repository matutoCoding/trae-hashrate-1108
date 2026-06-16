import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { useStore } from './store'
import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('采血车排班系统启动')
  })
  return children
}

export default App
