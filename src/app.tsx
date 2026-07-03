import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { initAnalytics, flushOnExit } from '@/services/analytics';
import { loadSeedData } from '@/services/seed-data';
// 全局样式
import './app.scss';

function App(props: { children: React.ReactNode }) {
  // 应用显示时初始化埋点自动上报
  useEffect(() => {
    initAnalytics();

    // 首次启动加载种子数据（100用户+100善行+校园善行圈等）
    loadSeedData();

    // 监听应用显示/隐藏事件（兼容 H5 和小程序）
    const showHandler = () => { initAnalytics(); };
    const hideHandler = () => { flushOnExit(); };

    // Taro 事件监听
    try {
      Taro.eventCenter.on('onAppShow', showHandler);
      Taro.eventCenter.on('onAppHide', hideHandler);
    } catch { /* 忽略不支持的环境 */ }

    return () => {
      try {
        Taro.eventCenter.off('onAppShow', showHandler);
        Taro.eventCenter.off('onAppHide', hideHandler);
      } catch { /* 忽略 */ }
      flushOnExit();
    };
  }, []);

  return props.children;
}

export default App;
