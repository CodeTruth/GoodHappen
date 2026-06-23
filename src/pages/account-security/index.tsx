import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import { requireLogin, sendVerifyCode } from '@/services/auth';
import styles from './index.module.scss';

type BindStep = 'verifyOld' | 'verifyNew' | 'success';

const AccountSecurityPage: React.FC = () => {
  const { userInfo, updateUserInfo, logout, loadFromStorage } = useUserStore();

  // 换绑手机号相关状态
  const [showBindModal, setShowBindModal] = useState(false);
  const [bindStep, setBindStep] = useState<BindStep>('verifyOld');
  const [oldPhone, setOldPhone] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCode, setNewCode] = useState('');
  const [oldCountdown, setOldCountdown] = useState(0);
  const [newCountdown, setNewCountdown] = useState(0);
  const oldTimerRef = useRef<any>(null);
  const newTimerRef = useRef<any>(null);

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 未登录跳转登录页
  useEffect(() => {
    if (!useUserStore.getState().isLoggedIn) {
      requireLogin('/pages/account-security/index');
    }
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (oldTimerRef.current) clearInterval(oldTimerRef.current);
      if (newTimerRef.current) clearInterval(newTimerRef.current);
    };
  }, []);

  // 打开换绑弹窗
  const handleOpenBindModal = () => {
    setBindStep('verifyOld');
    setOldPhone('');
    setOldCode('');
    setNewPhone('');
    setNewCode('');
    setOldCountdown(0);
    setNewCountdown(0);
    setShowBindModal(true);
  };

  // 发送旧手机验证码
  const handleSendOldCode = async () => {
    if (oldCountdown > 0) return;
    if (!oldPhone) {
      Taro.showToast({ title: '请输入原手机号', icon: 'none' });
      return;
    }
    const result = await sendVerifyCode(oldPhone);
    if (result.success) {
      Taro.showToast({ title: result.message, icon: 'none' });
      setOldCountdown(60);
      oldTimerRef.current = setInterval(() => {
        setOldCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(oldTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      Taro.showToast({ title: result.message, icon: 'none' });
    }
  };

  // 发送新手机验证码
  const handleSendNewCode = async () => {
    if (newCountdown > 0) return;
    if (!newPhone) {
      Taro.showToast({ title: '请输入新手机号', icon: 'none' });
      return;
    }
    if (newPhone === oldPhone) {
      Taro.showToast({ title: '新手机号不能与原手机号相同', icon: 'none' });
      return;
    }
    const result = await sendVerifyCode(newPhone);
    if (result.success) {
      Taro.showToast({ title: result.message, icon: 'none' });
      setNewCountdown(60);
      newTimerRef.current = setInterval(() => {
        setNewCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(newTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      Taro.showToast({ title: result.message, icon: 'none' });
    }
  };

  // 验证原手机号
  const handleVerifyOld = () => {
    if (!oldPhone) {
      Taro.showToast({ title: '请输入原手机号', icon: 'none' });
      return;
    }
    if (!/^\d{6}$/.test(oldCode)) {
      Taro.showToast({ title: '请输入6位验证码', icon: 'none' });
      return;
    }
    // 模拟校验原手机号验证码
    console.log('[AccountSecurity] Verify old phone:', oldPhone);
    setBindStep('verifyNew');
  };

  // 验证新手机号并完成换绑
  const handleVerifyNew = () => {
    if (!newPhone) {
      Taro.showToast({ title: '请输入新手机号', icon: 'none' });
      return;
    }
    if (!/^\d{6}$/.test(newCode)) {
      Taro.showToast({ title: '请输入6位验证码', icon: 'none' });
      return;
    }
    // 模拟换绑成功
    const maskedPhone = newPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    updateUserInfo({ phone: maskedPhone });
    console.log('[AccountSecurity] Phone changed to:', maskedPhone);
    setBindStep('success');
    setTimeout(() => {
      setShowBindModal(false);
      Taro.showToast({ title: '换绑成功', icon: 'success' });
    }, 1500);
  };

  // 账号注销（二次确认）
  const handleDeleteAccount = () => {
    // 第一次确认
    Taro.showModal({
      title: '账号注销',
      content: '注销后账号将被软删除，数据将脱敏处理，合规保留期为30天。30天内可联系客服恢复账号，逾期将永久删除。确定要继续吗？',
      confirmText: '继续注销',
      confirmColor: '#FF4D4F',
      cancelText: '再想想',
      success: (res) => {
        if (res.confirm) {
          // 第二次确认
          handleSecondConfirm();
        }
      }
    });
  };

  // 第二次确认
  const handleSecondConfirm = () => {
    Taro.showModal({
      title: '最终确认',
      content: '此操作不可撤销！注销后你将无法登录，所有善行记录、福气值、称号等数据将被脱敏处理。确定要注销账号吗？',
      confirmText: '确认注销',
      confirmColor: '#FF4D4F',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          handleActualDelete();
        }
      }
    });
  };

  // 执行注销（软删除 + 数据脱敏）
  const handleActualDelete = () => {
    console.log('[AccountSecurity] Account deletion (soft delete + data masking)');
    // 模拟数据脱敏：清除用户信息但保留 ID（合规保留期30天）
    // 实际应调用后端接口进行软删除
    Taro.showLoading({ title: '处理中...' });
    setTimeout(() => {
      Taro.hideLoading();
      // 登出并清除本地数据
      logout();
      Taro.showModal({
        title: '注销已提交',
        content: '你的账号已进入注销流程，数据已脱敏处理。30天合规保留期内可联系客服恢复，逾期将永久删除。',
        showCancel: false,
        confirmText: '我知道了',
        success: () => {
          // 跳转登录页
          Taro.reLaunch({ url: '/pages/login/index' });
        }
      });
    }, 1500);
  };

  // 渲染换绑弹窗内容
  const renderBindModalContent = () => {
    if (bindStep === 'verifyOld') {
      return (
        <View className={styles.modalContent}>
          <Text className={styles.modalStepText}>步骤 1/2：验证原手机号</Text>
          <View className={styles.modalFormItem}>
            <Text className={styles.modalLabel}>原手机号</Text>
            <Input
              className={styles.modalInput}
              type="number"
              maxlength={11}
              placeholder="请输入原手机号"
              value={oldPhone}
              onInput={(e) => setOldPhone(e.detail.value)}
            />
          </View>
          <View className={styles.modalFormItem}>
            <Text className={styles.modalLabel}>验证码</Text>
            <View className={styles.modalCodeRow}>
              <Input
                className={styles.modalCodeInput}
                type="number"
                maxlength={6}
                placeholder="请输入验证码"
                value={oldCode}
                onInput={(e) => setOldCode(e.detail.value)}
              />
              <View
                className={`${styles.modalCodeBtn} ${oldCountdown > 0 ? styles.disabled : ''}`}
                onClick={handleSendOldCode}
              >
                <Text className={styles.modalCodeBtnText}>
                  {oldCountdown > 0 ? `${oldCountdown}s` : '获取验证码'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }
    if (bindStep === 'verifyNew') {
      return (
        <View className={styles.modalContent}>
          <Text className={styles.modalStepText}>步骤 2/2：绑定新手机号</Text>
          <View className={styles.modalFormItem}>
            <Text className={styles.modalLabel}>新手机号</Text>
            <Input
              className={styles.modalInput}
              type="number"
              maxlength={11}
              placeholder="请输入新手机号"
              value={newPhone}
              onInput={(e) => setNewPhone(e.detail.value)}
            />
          </View>
          <View className={styles.modalFormItem}>
            <Text className={styles.modalLabel}>验证码</Text>
            <View className={styles.modalCodeRow}>
              <Input
                className={styles.modalCodeInput}
                type="number"
                maxlength={6}
                placeholder="请输入验证码"
                value={newCode}
                onInput={(e) => setNewCode(e.detail.value)}
              />
              <View
                className={`${styles.modalCodeBtn} ${newCountdown > 0 ? styles.disabled : ''}`}
                onClick={handleSendNewCode}
              >
                <Text className={styles.modalCodeBtnText}>
                  {newCountdown > 0 ? `${newCountdown}s` : '获取验证码'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View className={styles.modalContent}>
        <Text className={styles.modalStepText}>✅ 换绑成功！</Text>
      </View>
    );
  };

  // 弹窗按钮文案
  const modalConfirmText = bindStep === 'verifyOld' ? '下一步' : bindStep === 'verifyNew' ? '确认换绑' : '完成';
  const modalTitle = bindStep === 'success' ? '换绑成功' : '更换手机号';

  // 弹窗确认
  const handleModalConfirm = () => {
    if (bindStep === 'verifyOld') {
      handleVerifyOld();
    } else if (bindStep === 'verifyNew') {
      handleVerifyNew();
    } else {
      setShowBindModal(false);
    }
  };

  // 弹窗取消
  const handleModalCancel = () => {
    if (bindStep !== 'success') {
      setShowBindModal(false);
    }
  };

  return (
    <View className={styles.container}>
      {/* 安全提示 */}
      <View className={styles.infoCard}>
        <Text className={styles.infoIcon}>🔒</Text>
        <Text className={styles.infoText}>
          保护好你的账号信息，不要将验证码泄露给他人。
        </Text>
      </View>

      {/* 账号信息 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>账号信息</Text>
        <View className={styles.card}>
          {/* 手机号 */}
          <View className={styles.item} onClick={handleOpenBindModal}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>手机号</Text>
              <Text className={styles.itemDesc}>用于登录和账号找回</Text>
            </View>
            <Text className={styles.itemValue}>
              {userInfo?.phone || '未绑定'}
            </Text>
            <Text className={styles.arrow}>›</Text>
          </View>

          {/* 微信授权 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>微信账号</Text>
              <Text className={styles.itemDesc}>已授权的微信账号</Text>
            </View>
            <Text className={styles.itemValue}>
              {userInfo?.name ? '已绑定' : '未绑定'}
            </Text>
          </View>

          {/* 注册时间 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>注册时间</Text>
              <Text className={styles.itemDesc}>账号创建时间</Text>
            </View>
            <Text className={styles.itemValue}>
              {userInfo?.createdAt
                ? new Date(userInfo.createdAt).toLocaleDateString()
                : '-'}
            </Text>
          </View>
        </View>
      </View>

      {/* 危险操作区 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>危险操作</Text>
        <View className={styles.dangerCard}>
          <View className={styles.dangerItem} onClick={handleDeleteAccount}>
            <View className={styles.dangerLeft}>
              <Text className={styles.dangerLabel}>注销账号</Text>
              <Text className={styles.dangerDesc}>
                软删除账号并脱敏数据，30天合规保留期后永久删除
              </Text>
            </View>
            <Text className={styles.dangerArrow}>›</Text>
          </View>
        </View>
      </View>

      {/* 换绑手机号自定义弹窗 */}
      {showBindModal && (
        <View className={styles.modalMask} onClick={handleModalCancel}>
          <View className={styles.modalBody} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>{modalTitle}</Text>
              {bindStep !== 'success' && (
                <Text className={styles.modalClose} onClick={handleModalCancel}>✕</Text>
              )}
            </View>
            {renderBindModalContent()}
            <View className={styles.modalFooter}>
              {bindStep !== 'success' && (
                <View className={styles.modalCancelBtn} onClick={handleModalCancel}>
                  <Text className={styles.modalCancelBtnText}>取消</Text>
                </View>
              )}
              <View className={styles.modalConfirmBtn} onClick={handleModalConfirm}>
                <Text className={styles.modalConfirmBtnText}>{modalConfirmText}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default AccountSecurityPage;
