import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { StoreProvider } from './store'
import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('采血车排班系统启动')
  })
  return (
    <StoreProvider>
      {children}
    </StoreProvider>
  )
}

export default App
