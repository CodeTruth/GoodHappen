import { useEffect } from 'react';
// 全局样式
import './app.scss';

function App(props) {
  // 可以使用所有的 React Hooks
  useEffect(() => {});

  return props.children;
}

export default App;
