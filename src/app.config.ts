export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/record/index',
    'pages/mine/index',
    'pages/circle/index',
    'pages/detail/index',
    'pages/circleDetail/index',
    'pages/login/index',
    'pages/profile-edit/index',
    'pages/privacy-settings/index',
    'pages/account-security/index',
    'pages/warmth-stats/index',
    'pages/my-stats/index',
    'pages/warmth-stories/index',
    'pages/warmth-map/index',
    'pages/checkin/index',
    'pages/circle-admin/index',
    'pages/notifications/index',
    'pages/search/index',
    'pages/shop/index',
    'pages/warmth-fund/index',
    'pages/merchant-list/index',
    'pages/charity-publish/index',
    'pages/charity-record/index',
    'pages/admin-alerts/index',
    'pages/challenges/index',
    'pages/onboarding/index',
    'pages/invite/index',
    'pages/annual-report/index',
    'pages/legal-aid/index',
    'pages/insurance/index',
    'pages/witness-network/index',
    'pages/evidence-report/index',
    'pages/protection-mode/index',
    'pages/safety-check/index',
    'pages/admin-review/index',
    'pages/admin-users/index',
    'pages/admin-config/index',
    'pages/admin-dashboard/index',
    'pages/admin-topics/index',
    'pages/charity-fund/index',
    'pages/recipients/index',
    'pages/charity-tasks/index',
    'pages/claim-flow/index',
    'pages/ai-chat/index',
    'pages/circle-moral-tasks/index',
    'pages/circle-dashboard/index',
    'pages/student-profile/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#C4956A',
    navigationBarTitleText: '好事发生',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    custom: true,
    color: '#9E8E7E',
    selectedColor: '#C4956A',
    backgroundColor: '#FFFCF8',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/record/index',
        text: '记录'
      },
      {
        pagePath: 'pages/circle/index',
        text: '善行圈'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
