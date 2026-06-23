import React, { useState, useEffect } from 'react';
import { View, Text, Input, Textarea, Image, Picker, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore, checkIsMinor } from '@/store/user';
import { requireLogin } from '@/services/auth';
import { regions, getProvinceNames, getCitiesByProvinceIndex } from '@/data/regions';
import { Gender } from '@/types/user';
import styles from './index.module.scss';

const ProfileEditPage: React.FC = () => {
  const { userInfo, updateUserInfo, loadFromStorage } = useUserStore();

  // 表单状态
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<Gender>('unknown');
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [regionValue, setRegionValue] = useState<string[]>(['北京市', '东城区']);
  const [regionText, setRegionText] = useState('');
  const [saving, setSaving] = useState(false);

  // 出生年份选项（1920 ~ 当前年份）
  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear; y >= 1920; y--) {
    yearOptions.push(y);
  }

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 初始化表单数据
  useEffect(() => {
    if (userInfo) {
      setName(userInfo.name || '');
      setAvatar(userInfo.avatar || '');
      setBio(userInfo.bio || '');
      setGender(userInfo.gender || 'unknown');
      setBirthYear(userInfo.birthYear ?? null);
      if (userInfo.region) {
        setRegionText(userInfo.region);
        // 尝试匹配省市区数据
        const parts = userInfo.region.split(' ');
        if (parts.length >= 2) {
          const provinceIdx = regions.findIndex(r => r.name === parts[0]);
          if (provinceIdx >= 0) {
            setRegionValue([parts[0], parts[1]]);
          }
        }
      }
    }
  }, [userInfo]);

  // 未登录跳转登录页
  useEffect(() => {
    if (!useUserStore.getState().isLoggedIn) {
      requireLogin('/pages/profile-edit/index');
    }
  }, []);

  // 头像上传
  const handleChooseAvatar = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFilePaths[0];
        setAvatar(tempPath);
        console.log('[ProfileEdit] Avatar chosen:', tempPath);
      },
      fail: (err) => {
        console.error('[ProfileEdit] Choose avatar failed:', err);
      }
    });
  };

  // 地区选择变化
  const handleRegionChange = (e: any) => {
    const indexes = e.detail.value as number[];
    const province = regions[indexes[0]];
    const city = province?.cities[indexes[1]] || '';
    const provinceName = province?.name || '';
    setRegionValue([provinceName, city]);
    setRegionText(`${provinceName} ${city}`);
  };

  // 地区列变化（第一列变化时更新第二列）
  const handleRegionColumnChange = (e: any) => {
    if (e.detail.column === 0) {
      // 第一列变化，重置第二列
      const newCities = getCitiesByProvinceIndex(e.detail.value);
      setRegionValue([regions[e.detail.value].name, newCities[0] || '']);
    }
  };

  // 出生年份变化
  const handleYearChange = (e: any) => {
    const idx = e.detail.value as number;
    setBirthYear(yearOptions[idx]);
  };

  // 保存资料
  const handleSave = () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (bio.length > 100) {
      Taro.showToast({ title: '个人简介不能超过100字', icon: 'none' });
      return;
    }

    setSaving(true);
    try {
      updateUserInfo({
        name: name.trim(),
        avatar: avatar || userInfo?.avatar || '',
        bio: bio.trim(),
        gender,
        birthYear,
        region: regionText,
      });

      // 判定是否未成年
      const minor = checkIsMinor(birthYear);
      if (minor) {
        Taro.showModal({
          title: '未成年保护已开启',
          content: '系统已为您开启未成年人保护模式，部分功能将受到限制。',
          showCancel: false,
        });
      } else {
        Taro.showToast({ title: '保存成功', icon: 'success' });
      }

      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('[ProfileEdit] Save failed:', error);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  // 多列选择器的数据源
  const multiSelectorRange = [
    getProvinceNames(),
    getCitiesByProvinceIndex(regions.findIndex(r => r.name === regionValue[0]))
  ];

  // 当前选中的索引
  const regionIndexes = [
    Math.max(0, regions.findIndex(r => r.name === regionValue[0])),
    Math.max(0, getCitiesByProvinceIndex(regions.findIndex(r => r.name === regionValue[0])).indexOf(regionValue[1]))
  ];

  const yearIndex = birthYear ? yearOptions.indexOf(birthYear) : -1;
  const isMinor = checkIsMinor(birthYear);

  return (
    <View className={styles.container}>
      {/* 未成年保护提示 */}
      {isMinor && (
        <View className={styles.minorTip}>
          <Text className={styles.minorTipIcon}>🛡️</Text>
          <Text className={styles.minorTipText}>
            检测到您是未成年用户，已自动开启未成年人保护模式：不进入匿名统计、内容默认私密、不参与公益接单与温暖商城兑换。
          </Text>
        </View>
      )}

      {/* 头像 */}
      <View className={styles.card}>
        <View className={styles.avatarSection}>
          <View className={styles.avatarWrap} onClick={handleChooseAvatar}>
            <Image
              src={avatar || 'https://picsum.photos/id/64/200/200'}
              className={styles.avatar}
              mode="aspectFill"
            />
            <View className={styles.avatarMask}>
              <Text className={styles.avatarMaskIcon}>📷</Text>
            </View>
          </View>
          <Text className={styles.avatarTip}>点击更换头像（可选）</Text>
        </View>
      </View>

      {/* 基本信息 */}
      <View className={styles.card}>
        {/* 昵称 */}
        <View className={styles.formItem}>
          <Text className={styles.label}>
            昵称<Text className={styles.required}>*</Text>
          </Text>
          <Input
            className={styles.input}
            type="text"
            maxlength={20}
            placeholder="请输入昵称"
            value={name}
            onInput={(e) => setName(e.detail.value)}
          />
        </View>

        {/* 个人简介 */}
        <View className={styles.formItem}>
          <Text className={styles.label}>个人简介</Text>
          <View className={styles.bioWrap}>
            <Textarea
              className={styles.textarea}
              placeholder="介绍一下自己吧（≤100字）"
              value={bio}
              onInput={(e) => setBio(e.detail.value)}
              maxlength={100}
              showConfirmBar={false}
            />
            <Text className={styles.bioCount}>{bio.length}/100</Text>
          </View>
        </View>
      </View>

      {/* 详细信息 */}
      <View className={styles.card}>
        {/* 性别 */}
        <View className={styles.formItem}>
          <Text className={styles.label}>性别</Text>
          <View className={styles.genderSelector}>
            <View
              className={`${styles.genderOption} ${gender === 'male' ? styles.active : ''}`}
              onClick={() => setGender('male')}
            >
              <Text className={styles.genderText}>男</Text>
            </View>
            <View
              className={`${styles.genderOption} ${gender === 'female' ? styles.active : ''}`}
              onClick={() => setGender('female')}
            >
              <Text className={styles.genderText}>女</Text>
            </View>
            <View
              className={`${styles.genderOption} ${gender === 'unknown' ? styles.active : ''}`}
              onClick={() => setGender('unknown')}
            >
              <Text className={styles.genderText}>保密</Text>
            </View>
          </View>
        </View>

        {/* 出生年份 */}
        <View className={styles.formItem}>
          <Text className={styles.label}>出生年份</Text>
          <Picker
            mode="selector"
            range={yearOptions.map(y => `${y}年`)}
            value={yearIndex >= 0 ? yearIndex : 0}
            onChange={handleYearChange}
          >
            <View className={styles.pickerValue}>
              {yearIndex >= 0 ? (
                <Text>{yearOptions[yearIndex]}年</Text>
              ) : (
                <Text className={styles.pickerPlaceholder}>请选择出生年份</Text>
              )}
            </View>
          </Picker>
        </View>

        {/* 地区 */}
        <View className={styles.formItem}>
          <Text className={styles.label}>地区</Text>
          <Picker
            mode="multiSelector"
            range={multiSelectorRange}
            value={regionIndexes}
            onChange={handleRegionChange}
            onColumnChange={handleRegionColumnChange}
          >
            <View className={styles.pickerValue}>
              {regionText ? (
                <Text>{regionText}</Text>
              ) : (
                <Text className={styles.pickerPlaceholder}>请选择地区</Text>
              )}
            </View>
          </Picker>
        </View>
      </View>

      {/* 底部保存按钮 */}
      <View className={styles.footer}>
        <Button
          className={styles.saveBtn}
          onClick={handleSave}
          loading={saving}
          disabled={saving || !name.trim()}
        >
          <Text className={styles.saveBtnText}>{saving ? '保存中...' : '保存资料'}</Text>
        </Button>
      </View>
    </View>
  );
};

export default ProfileEditPage;
