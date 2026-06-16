export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/sites/index',
    'pages/sites/edit',
    'pages/rules/index',
    'pages/rules/edit',
    'pages/schedules/index',
    'pages/schedules/edit',
    'pages/queue/index',
    'pages/queue/detail'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#DC2626',
    navigationBarTitleText: '采血车排班系统',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#9CA3AF',
    selectedColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页'
      },
      {
        pagePath: 'pages/schedules/index',
        text: '排班'
      },
      {
        pagePath: 'pages/queue/index',
        text: '叫号'
      }
    ]
  }
})
