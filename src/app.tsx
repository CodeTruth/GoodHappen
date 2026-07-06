import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View } from '@tarojs/components';
import { initAnalytics, flushOnExit } from '@/services/analytics';
import { loadSeedData } from '@/services/seed-data';
import { guestAutoLogin } from '@/services/auth';
import { useUserStore } from '@/store/user';
import CustomTabBar from '@/custom-tab-bar';
// 全局样式
import './app.scss';

/** 根据当前页面路径判断对应的 Tab 索引 */
function getTabIndexFromPath(): number {
  const pages = Taro.getCurrentPages();
  if (pages.length > 0) {
    const route = pages[pages.length - 1].route || '';
    if (route.includes('pages/home/index')) return 0;
    if (route.includes('pages/discover/index')) return 1;
    if (route.includes('pages/record/index')) return 2;
    if (route.includes('pages/circle-dashboard/index')) return 3;
    if (route.includes('pages/mine/index')) return 4;
  }
  // fallback：从 URL hash 判断（H5 端）
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash.includes('pages/home/index')) return 0;
    if (hash.includes('pages/discover/index')) return 1;
    if (hash.includes('pages/record/index')) return 2;
    if (hash.includes('pages/circle-dashboard/index')) return 3;
    if (hash.includes('pages/mine/index')) return 4;
  }
  return -1;  // 非 tab 页面不高亮任何 tab
}

function App(props: { children: React.ReactNode }) {
  const [tabIndex, setTabIndex] = useState(0);

  // 路由变化时更新选中 Tab
  useEffect(() => {
    setTabIndex(getTabIndexFromPath());

    if (typeof window !== 'undefined') {
      const onHashChange = () => setTabIndex(getTabIndexFromPath());
      window.addEventListener('hashchange', onHashChange);
      return () => window.removeEventListener('hashchange', onHashChange);
    }
  }, []);

  useEffect(() => {
    initAnalytics();
    loadSeedData();

    const ensureGuestLogin = async () => {
      const userStore = useUserStore.getState();
      if (!userStore.isLoggedIn) {
        const { token, userInfo } = guestAutoLogin();
        userStore.login(token, userInfo);
      }
    };
    ensureGuestLogin();

    const showHandler = () => { initAnalytics(); };
    const hideHandler = () => { flushOnExit(); };

    try {
      Taro.eventCenter.on('onAppShow', showHandler);
      Taro.eventCenter.on('onAppHide', hideHandler);
    } catch { /* ignore */ }

    return () => {
      try {
        Taro.eventCenter.off('onAppShow', showHandler);
        Taro.eventCenter.off('onAppHide', hideHandler);
      } catch { /* ignore */ }
      flushOnExit();
    };
  }, []);

  const isTabPage = tabIndex >= 0;

  return (
    <View style={{ minHeight: '100vh', paddingBottom: isTabPage ? '120px' : '0', position: 'relative' }}>
      {props.children}
      {isTabPage && <CustomTabBar current={tabIndex} />}
    </View>
  );
}

export default App;
