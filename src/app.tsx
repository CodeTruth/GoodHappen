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
        let shouldHide = HIDDEN_TAB_PAGES.some(p => route.includes(p));
        // 首次进入的欢迎引导页：全屏显示，隐藏 Tab 栏
        if (!shouldHide && route.includes('pages/home/index')) {
          try {
            const welcomeShown = Taro.getStorageSync('haoshi_welcome_shown');
            if (!welcomeShown) shouldHide = true;
          } catch { /* ignore */ }
        }
        setHideTab(shouldHide);
        return;
      }
    } catch { /* ignore */ }
    // fallback：H5 hash
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      let shouldHide = HIDDEN_TAB_PAGES.some(p => hash.includes(p));
      if (!shouldHide && hash.includes('pages/home/index')) {
        try {
          const welcomeShown = Taro.getStorageSync('haoshi_welcome_shown');
          if (!welcomeShown) shouldHide = true;
        } catch { /* ignore */ }
      }
      setHideTab(shouldHide);
    }
  };

  useEffect(() => {
    updateRoute();
    if (typeof window !== 'undefined') {
      const onHashChange = () => updateRoute();
      const onPopState = (e: PopStateEvent) => {
        // H5\u7AEF\u62E6\u622A\u539F\u751F\u8FD4\u56DE\uFF1A\u5982\u679C\u9875\u9762\u6808\u53EA\u5269\u5F53\u524D\u9875\uFF0C\u4E0D\u8BA9\u5B83\u9000\u51FA\u7CFB\u7EDF
        const pages = Taro.getCurrentPages();
        if (pages.length <= 1) {
          // pushState\u586B\u5145\u5386\u53F2\uFF0C\u9632\u6B62\u9000\u51FA
          window.history.pushState(null, '', window.location.href);
        }
        updateRoute();
      };
      // \u521D\u59CB\u5316\u65F6push\u4E00\u4E2A\u72B6\u6001\uFF0C\u4FDD\u8BC1\u7B2C\u4E00\u6B21\u8FD4\u56DE\u4E0D\u4F1A\u9000\u51FA
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('hashchange', onHashChange);
      window.addEventListener('popstate', onPopState);
      // Taro H5 \u7528 pushState \u4E5F\u4F1A\u89E6\u53D1 DOM \u53D8\u5316\uFF0C\u7528 MutationObserver \u76D1\u542C hash \u53D8\u5316
      const observer = new MutationObserver(onHashChange);
      // \u76F4\u63A5\u8F6E\u8BE2\u68C0\u6D4B\uFF1ATaro H5 \u7684 navigateTo \u4E0D\u4E00\u5B9A\u89E6\u53D1 popstate/hashchange
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
