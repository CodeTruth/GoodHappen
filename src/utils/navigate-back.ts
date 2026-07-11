import Taro from '@tarojs/taro'

/**
 * 安全返回上一页。如果页面栈为空（无上一页），则 switchTab 回首页。
 * 解决 Taro H5 在手机浏览器中 navigateBack 直接退出系统的问题。
 */
export function safeNavigateBack(delta = 1): void {
  const pages = Taro.getCurrentPages()
  if (pages.length > 1) {
    Taro.navigateBack({ delta })
  } else {
    // 页面栈只剩当前页，switchTab 回首页
    Taro.switchTab({ url: '/pages/home/index' })
  }
}