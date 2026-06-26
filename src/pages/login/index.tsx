import React, { useState, useRef } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import { loginWithWechat, loginWithPhone, sendVerifyCode } from '@/services/auth';
import styles from './index.module.scss';

type LoginMode = 'wechat' | 'phone';

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<LoginMode>('wechat');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<any>(null);

  const { login } = useUserStore();

  // 处理登录成功后的跳转
  const handleLoginSuccess = () => {
    const pages = Taro.getCurrentPages();
    const currentPage = pages[pages.length - 1] as any;
    const redirect = currentPage?.options?.redirect;

    Taro.showToast({ title: '登录成功', icon: 'success' });

    setTimeout(() => {
      if (redirect) {
        // 登录后跳回原页面
        Taro.redirectTo({ url: decodeURIComponent(redirect) });
      } else {
        // 默认跳转首页
        Taro.switchTab({ url: '/pages/home/index' });
      }
    }, 1000);
  };

  // 微信授权登录
  const handleWechatLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await loginWithWechat();
      login(result.token, result.userInfo);
      handleLoginSuccess();
    } catch (error: any) {
      console.error('[Login] Wechat login failed:', error);
      const errMsg = error?.errMsg || '';
      if (errMsg.includes('deny') || errMsg.includes('cancel') || errMsg.includes('auth deny')) {
        Taro.showToast({ title: '已取消授权', icon: 'none' });
      } else {
        Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
      }
    } finally {
      setLoading(false);
    }
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (countdown > 0) return;
    if (!phone) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    try {
      const result = await sendVerifyCode(phone);
      if (result.success) {
        Taro.showToast({ title: result.message, icon: 'none' });
        setCountdown(60);
        timerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        Taro.showToast({ title: result.message, icon: 'none' });
      }
    } catch {
      Taro.showToast({ title: '验证码发送失败，请重试', icon: 'none' });
    }
  };

  // 手机号登录
  const handlePhoneLogin = async () => {
    if (loading) return;
    if (!phone) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    if (!code) {
      Taro.showToast({ title: '请输入验证码', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      const result = await loginWithPhone(phone, code);
      login(result.token, result.userInfo);
      handleLoginSuccess();
    } catch (error: any) {
      console.error('[Login] Phone login failed:', error);
      Taro.showToast({ title: error.message || '登录失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.logo}>好事发生</Text>
        <Text className={styles.slogan}>记录温暖，传递善意</Text>
      </View>

      <View className={styles.card}>
        <View className={styles.tabs}>
          <View
            className={`${styles.tab} ${mode === 'wechat' ? styles.active : ''}`}
            onClick={() => setMode('wechat')}
          >
            <Text className={styles.tabText}>微信登录</Text>
          </View>
          <View
            className={`${styles.tab} ${mode === 'phone' ? styles.active : ''}`}
            onClick={() => setMode('phone')}
          >
            <Text className={styles.tabText}>手机号登录</Text>
          </View>
        </View>

        {mode === 'wechat' && (
          <View className={styles.wechatSection}>
            <Text className={styles.desc}>使用微信账号快速登录，体验温暖善行</Text>
            <Button
              className={styles.wechatBtn}
              onClick={handleWechatLogin}
              loading={loading}
              disabled={loading}
            >
              <Text className={styles.wechatBtnText}>
                {loading ? '登录中...' : '微信授权登录'}
              </Text>
            </Button>
          </View>
        )}

        {mode === 'phone' && (
          <View className={styles.phoneSection}>
            <View className={styles.inputGroup}>
              <Text className={styles.inputLabel}>手机号</Text>
              <Input
                className={styles.input}
                type="number"
                maxlength={11}
                placeholder="请输入手机号"
                value={phone}
                onInput={(e) => setPhone(e.detail.value)}
              />
            </View>
            <View className={styles.inputGroup}>
              <Text className={styles.inputLabel}>验证码</Text>
              <View className={styles.codeRow}>
                <Input
                  className={styles.codeInput}
                  type="number"
                  maxlength={6}
                  placeholder="请输入验证码"
                  value={code}
                  onInput={(e) => setCode(e.detail.value)}
                />
                <View
                  className={`${styles.codeBtn} ${countdown > 0 ? styles.disabled : ''}`}
                  onClick={handleSendCode}
                >
                  <Text className={styles.codeBtnText}>
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </Text>
                </View>
              </View>
            </View>
            <Button
              className={styles.loginBtn}
              onClick={handlePhoneLogin}
              loading={loading}
              disabled={loading}
            >
              <Text className={styles.loginBtnText}>
                {loading ? '登录中...' : '登录 / 注册'}
              </Text>
            </Button>
          </View>
        )}
      </View>

      <View className={styles.footer}>
        <Text className={styles.agreement}>
          登录即代表同意《用户协议》和《隐私政策》
        </Text>
      </View>
    </View>
  );
};

export default LoginPage;
