import { Component } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export interface TabItem {
  pagePath: string
  text: string
  icon: string // normal icon (emoji or text)
  selectedIcon: string // selected icon (emoji or text)
}

const TAB_LIST: TabItem[] = [
  {
    pagePath: 'pages/home/index',
    text: '首页',
    icon: '\u{1F3E0}',
    selectedIcon: '\u{1F3E0}'
  },
  {
    pagePath: 'pages/record/index',
    text: '记录',
    icon: '\u{1F4DD}',
    selectedIcon: '\u{270D}\u{FE0F}'
  },
  {
    pagePath: 'pages/discover/index',
    text: '发现',
    icon: '\u{1F30D}',
    selectedIcon: '\u{1F310}'
  },
  {
    pagePath: 'pages/mine/index',
    text: '我的',
    icon: '\u{1F464}',
    selectedIcon: '\u{1F9D1}'
  }
]

interface CustomTabBarProps {
  current: number
}

interface CustomTabBarState {
  selected: number
}

class CustomTabBar extends Component<CustomTabBarProps, CustomTabBarState> {
  constructor(props: CustomTabBarProps) {
    super(props)
    this.state = {
      selected: props.current || 0
    }
  }

  // 监听 props 变化（小程序端切换页面时会更新 current）
  static getDerivedStateFromProps(props: CustomTabBarProps) {
    if (props.current !== undefined) {
      return { selected: props.current }
    }
    return null
  }

  switchTab = (index: number, tab: TabItem) => {
    this.setState({ selected: index })
    Taro.switchTab({
      url: `/${tab.pagePath}`
    })
  }

  render() {
    const { selected } = this.state

    return (
      <View className='custom-tab-bar'>
        {TAB_LIST.map((tab, index) => (
          <View
            key={tab.pagePath}
            className={`custom-tab-bar__item ${selected === index ? 'custom-tab-bar__item--active' : ''}`}
            onClick={() => this.switchTab(index, tab)}
          >
            <View className='custom-tab-bar__icon'>
              <Text
                className='custom-tab-bar__icon-text'
                style={{
                  filter: selected === index ? 'none' : 'grayscale(100%)',
                  transform: selected === index ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s ease'
                }}
              >
                {selected === index ? tab.selectedIcon : tab.icon}
              </Text>
            </View>
            <Text className='custom-tab-bar__text'>
              {tab.text}
            </Text>
          </View>
        ))}
      </View>
    )
  }
}

export default CustomTabBar
