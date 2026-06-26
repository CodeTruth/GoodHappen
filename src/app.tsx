import { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
import { initAnalytics, flushOnExit } from '@/services/analytics';
// 全局样式
import './app.scss';

function App(props: { children: React.ReactNode }) {
  // 应用显示时初始化埋点自动上报
  useDidShow(() => {
    initAnalytics();
  });

  // 应用隐藏时 flush 埋点数据
  useDidHide(() => {
    flushOnExit();
  });

  return props.children;
}

export default App;
