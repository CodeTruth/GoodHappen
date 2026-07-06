import { Component } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export interface TabItem {
  pagePath: string
  text: string
  icon: string
  selectedIcon: string
  center?: boolean
}

const TAB_LIST: TabItem[] = [
  {
    pagePath: 'pages/home/index',
    text: '首页',
    icon: '\u{1F3E0}',
    selectedIcon: '\u{1F3E0}'
  },
  {
    pagePath: 'pages/discover/index',
    text: '发现',
    icon: '\u{1F50D}',
    selectedIcon: '\u{1F50D}'
  },
  {
    pagePath: 'pages/record/index',
    text: '记录',
    icon: '\u{2795}',
    selectedIcon: '\u{2795}',
    center: true
  },
  {
    pagePath: 'pages/circle-dashboard/index',
    text: '善行圈',
    icon: '\u{1F4CA}',
    selectedIcon: '\u{1F4CA}'
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
        {TAB_LIST.map((tab, index) => {
          const isActive = selected === index
          const isCenter = tab.center

          return (
            <View
              key={tab.pagePath}
              className={`custom-tab-bar__item ${isActive ? 'custom-tab-bar__item--active' : ''} ${isCenter ? 'custom-tab-bar__item--center' : ''}`}
              onClick={() => this.switchTab(index, tab)}
            >
              {isCenter ? (
                <View className={`custom-tab-bar__center-btn ${isActive ? 'custom-tab-bar__center-btn--active' : ''}`}>
                  <Text className='custom-tab-bar__center-icon'>
                    {isActive ? tab.selectedIcon : tab.icon}
                  </Text>
                </View>
              ) : (
                <>
                  <View className='custom-tab-bar__icon'>
                    <Text
                      className='custom-tab-bar__icon-text'
                      style={{
                        filter: isActive ? 'none' : 'grayscale(100%)',
                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isActive ? tab.selectedIcon : tab.icon}
                    </Text>
                  </View>
                  <Text className='custom-tab-bar__text'>
                    {tab.text}
                  </Text>
                </>
              )}
            </View>
          )
        })}
      </View>
    )
  }
}

export default CustomTabBar
