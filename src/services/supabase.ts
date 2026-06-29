import { createClient } from '@supabase/supabase-js';

// Supabase 配置 —— 从环境变量注入
// 在 Taro 项目中通过 defineConstants 注入
// eslint-disable-next-line no-undef
declare const SUPABASE_URL: string;
// eslint-disable-next-line no-undef
declare const SUPABASE_ANON_KEY: string;

const supabaseUrl = (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) ? SUPABASE_URL : '';
const supabaseKey = (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) ? SUPABASE_ANON_KEY : '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] 环境变量未配置，Supabase 功能将不可用。请在 .env 或 Taro defineConstants 中配置 SUPABASE_URL 和 SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseAvailable = (): boolean => {
  return !!supabaseUrl && !!supabaseKey;
};
