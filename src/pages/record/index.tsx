import React, { useLayoutEffect } from 'react';
import Taro from '@tarojs/taro';

const RecordPage: React.FC = () => {
  useLayoutEffect(() => {
    // 使用 redirectTo 替换当前页面，避免回退时回到此空白代理页
    Taro.redirectTo({ url: '/pages/evidence-history/index' });
  }, []);

  return null;
};

export default RecordPage;
