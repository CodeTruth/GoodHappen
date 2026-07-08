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

/** 需要隐藏 Tab 栏的页面（善行顾问等全屏页面） */
const HIDDEN_TAB_PAGES = ['pages/ai-advisor/index'];

function App(props: { children: React.ReactNode }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [hideTab, setHideTab] = useState(false);

  // 路由变化时更新选中 Tab 和 Tab 栏显示状态
  const updateRoute = () => {
    setTabIndex(getTabIndexFromPath());
    // 优先用 Taro.getCurrentPages() 判断路由，更可靠
    try {
      const curPages = Taro.getCurrentPages();
      if (curPages.length > 0) {
        const route = curPages[curPages.length - 1].route || '';
        const shouldHide = HIDDEN_TAB_PAGES.some(p => route.includes(p));
        setHideTab(shouldHide);
        return;
      }
    } catch { /* ignore */ }
    // fallback：H5 hash
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const shouldHide = HIDDEN_TAB_PAGES.some(p => hash.includes(p));
      setHideTab(shouldHide);
    }
  };

  useEffect(() => {
    updateRoute();
    if (typeof window !== 'undefined') {
      const onHashChange = () => updateRoute();
      const onPopState = () => updateRoute();
      window.addEventListener('hashchange', onHashChange);
      window.addEventListener('popstate', onPopState);
      // Taro H5 用 pushState 也会触发 DOM 变化，用 MutationObserver 监听 hash 变化
      const observer = new MutationObserver(onHashChange);
      // 直接轮询检测：Taro H5 的 navigateTo 不一定触发 popstate/hashchange
      const pollId = setInterval(updateRoute, 300);
      return () => {
        window.removeEventListener('hashchange', onHashChange);
        window.removeEventListener('popstate', onPopState);
        observer.disconnect();
        clearInterval(pollId);
      };
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

  return (
    <View style={{ minHeight: '100vh', paddingBottom: hideTab ? '0' : '120px', position: 'relative' }}>
      {props.children}
      {!hideTab && <CustomTabBar current={tabIndex >= 0 ? tabIndex : 0} />}
    </View>
  );
}

export default App;
