import Taro from '@tarojs/taro';
import { UserInfo } from '@/types/user';
import { supabase, isSupabaseAvailable } from './supabase';

export interface LoginResult {
  token: string;
  userInfo: UserInfo;
}

// 默认头像
const DEFAULT_AVATAR = 'https://picsum.photos/id/64/200/200';

// 生成模拟 token
const generateMockToken = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;
};

// 生成用户ID
const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

/**
 * 微信授权登录
 * 使用 Taro.login() 获取 code + Taro.getUserProfile() 获取用户信息
 */
export const loginWithWechat = async (): Promise<LoginResult> => {
  try {
    // 1. 调用 Taro.login 获取临时登录凭证 code
    const loginResult = await Taro.login();
    console.log('[Auth] Wechat login code:', loginResult.code);

    // 2. 调用 Taro.getUserProfile 获取用户公开信息（需用户点击触发）
    const profileResult = await Taro.getUserProfile({
      desc: '用于完善用户资料',
    });

    const { userInfo: wxUserInfo } = profileResult;

    // 3. 模拟用 code 换 token（实际应调用后端接口）
    const token = generateMockToken('wx');

    const userInfo: UserInfo = {
      id: generateUserId(),
      name: wxUserInfo.nickName || '温暖小伙伴',
      avatar: wxUserInfo.avatarUrl || DEFAULT_AVATAR,
      bio: '',
      gender: wxUserInfo.gender === 1 ? 'male' : wxUserInfo.gender === 2 ? 'female' : 'unknown',
      birthYear: null,
      region: wxUserInfo.province || wxUserInfo.country || '',
      phone: '',
      blessingValue: 0,
      kindnessCount: 0,
      witnessCount: 0,
      badges: [],
      circles: [],
      createdAt: new Date().toISOString(),
    };

    console.log('[Auth] Wechat login success, userId:', userInfo.id);
    return { token, userInfo };
  } catch (error: any) {
    console.error('[Auth] Wechat login failed:', error);
    throw error;
  }
};

/**
 * 发送验证码（优先Supabase，fallback模拟）
 */
export const sendVerifyCode = async (phone: string): Promise<{ success: boolean; message: string }> => {
  // 简单校验手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, message: '手机号格式不正确' };
  }

  // 优先使用 Supabase
  if (isSupabaseAvailable()) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });
      if (error) {
        console.error('[Auth] Supabase send OTP failed:', error);
        // fallback 到模拟
      } else {
        console.log('[Auth] Supabase OTP sent to:', phone);
        return { success: true, message: '验证码已发送' };
      }
    } catch (e) {
      console.error('[Auth] Supabase OTP error:', e);
    }
  }

  // 模拟发送验证码
  console.log('[Auth] Send verify code to:', phone);
  return { success: true, message: '验证码已发送（模拟）' };
};

/**
 * 手机号+验证码登录（优先Supabase，fallback模拟）
 */
export const loginWithPhone = async (phone: string, code: string): Promise<LoginResult> => {
  // 校验验证码格式
  if (!/^\d{6}$/.test(code)) {
    throw new Error('验证码格式不正确');
  }

  // 优先使用 Supabase
  if (isSupabaseAvailable()) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: 'sms',
      });
      if (error) {
        console.error('[Auth] Supabase verify OTP failed:', error);
        throw new Error('验证码错误或已过期');
      }
      if (data.session) {
        // 查询或创建用户资料
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user?.id)
          .single();

        const userInfo: UserInfo = {
          id: data.user?.id || generateUserId(),
          name: profile?.name || `温暖用户${phone.slice(-4)}`,
          avatar: profile?.avatar || DEFAULT_AVATAR,
          bio: profile?.bio || '',
          gender: profile?.gender || 'unknown',
          birthYear: profile?.birth_year || null,
          region: profile?.region || '',
          phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
          blessingValue: profile?.blessing_value || 0,
          kindnessCount: profile?.kindness_count || 0,
          witnessCount: profile?.witness_count || 0,
          badges: profile?.badges || [],
          circles: profile?.circles || [],
          createdAt: data.user?.created_at || new Date().toISOString(),
        };

        console.log('[Auth] Supabase phone login success, userId:', userInfo.id);
        return { token: data.session.access_token, userInfo };
      }
    } catch (e: any) {
      console.error('[Auth] Supabase phone login error:', e);
      if (e.message?.includes('验证码')) throw e;
      // 其他错误 fallback 到模拟
    }
  }

  // 模拟手机号登录
  console.log('[Auth] Phone login (mock):', phone);

  const token = generateMockToken('phone');
  const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

  const userInfo: UserInfo = {
    id: generateUserId(),
    name: `温暖用户${phone.slice(-4)}`,
    avatar: DEFAULT_AVATAR,
    bio: '',
    gender: 'unknown',
    birthYear: null,
    region: '',
    phone: maskedPhone,
    blessingValue: 0,
    kindnessCount: 0,
    witnessCount: 0,
    badges: [],
    circles: [],
    createdAt: new Date().toISOString(),
  };

  console.log('[Auth] Phone login success, userId:', userInfo.id);
  return { token, userInfo };
};

/**
 * Supabase 登出
 */
export const logoutFromSupabase = async (): Promise<void> => {
  if (isSupabaseAvailable()) {
    try {
      await supabase.auth.signOut();
      console.log('[Auth] Supabase logout success');
    } catch (e) {
      console.error('[Auth] Supabase logout error:', e);
    }
  }
};

/**
 * 检查登录状态
 */
export const checkLoginStatus = (): boolean => {
  try {
    const data = Taro.getStorageSync('haoshi_user_store');
    if (data) {
      const parsed = JSON.parse(data);
      return !!(parsed.isLoggedIn && parsed.token);
    }
  } catch (e) {
    console.error('[Auth] Check login status failed:', e);
  }
  return false;
};

/**
 * 需要登录的页面跳转守卫
 * 未登录时跳转登录页，登录后可继续访问
 */
export const requireLogin = (redirectUrl?: string): boolean => {
  if (checkLoginStatus()) {
    return true;
  }
  const url = redirectUrl
    ? `/pages/login/index?redirect=${encodeURIComponent(redirectUrl)}`
    : '/pages/login/index';
  Taro.navigateTo({ url });
  return false;
};
