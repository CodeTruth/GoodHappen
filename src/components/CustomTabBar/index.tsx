import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

interface TabItem {
  pagePath: string;
  text: string;
  icon: string;
  selectedIcon: string;
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
    pagePath: 'pages/circle/index',
    text: '善行圈',
    icon: '\u{1F310}',
    selectedIcon: '\u{1F30D}'
  },
  {
    pagePath: 'pages/mine/index',
    text: '我的',
    icon: '\u{1F464}',
    selectedIcon: '\u{1F9D1}'
  }
];

// 页面路径到 tab index 的映射
const PAGE_TO_INDEX: Record<string, number> = {};
TAB_LIST.forEach((tab, index) => {
  PAGE_TO_INDEX[tab.pagePath] = index;
});

interface CustomTabBarProps {
  /** 当前页面路径（不含前导/） */
  currentPath: string;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({ currentPath }) => {
  const initialIndex = PAGE_TO_INDEX[currentPath] ?? 0;
  const [selected, setSelected] = useState(initialIndex);

  // 每次页面显示时更新选中状态（H5环境中用useEffect替代useDidShow）
  useEffect(() => {
    const idx = PAGE_TO_INDEX[currentPath];
    if (idx !== undefined) {
      setSelected(idx);
    }
  }, []);

  // currentPath 变化时更新
  useEffect(() => {
    const idx = PAGE_TO_INDEX[currentPath];
    if (idx !== undefined) {
      setSelected(idx);
    }
  }, [currentPath]);

  const switchTab = (index: number, tab: TabItem) => {
    if (index === selected) return;
    setSelected(index);
    Taro.switchTab({
      url: `/${tab.pagePath}`
    });
  };

  return (
    <View className={styles.tabBar}>
      {TAB_LIST.map((tab, index) => (
        <View
          key={tab.pagePath}
          className={`${styles.tabItem} ${selected === index ? styles.tabItemActive : ''}`}
          onClick={() => switchTab(index, tab)}
        >
          <View className={styles.icon}>
            <Text className={styles.iconText}>
              {selected === index ? tab.selectedIcon : tab.icon}
            </Text>
          </View>
          <Text className={styles.tabText}>{tab.text}</Text>
        </View>
      ))}
    </View>
  );
};

export default CustomTabBar;
export { TAB_LIST, PAGE_TO_INDEX };
