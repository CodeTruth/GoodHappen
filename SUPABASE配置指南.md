# Supabase 配置指南

## 环境变量配置

在 Taro 项目中，环境变量通过 `defineConstants` 注入。

### 步骤1：修改 `config/index.js`

```javascript
const config = {
  // ...其他配置
  defineConstants: {
    SUPABASE_URL: JSON.stringify(process.env.SUPABASE_URL || ''),
    SUPABASE_ANON_KEY: JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
  },
};
```

### 步骤2：创建 `.env` 文件（项目根目录）

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

> ⚠️ `.env` 文件已加入 `.gitignore`，请勿提交到仓库。

### 步骤3：Supabase 数据库表结构

创建 `profiles` 表：

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  avatar TEXT,
  bio TEXT,
  gender TEXT,
  birth_year INTEGER,
  region TEXT,
  phone TEXT,
  blessing_value INTEGER DEFAULT 0,
  kindness_count INTEGER DEFAULT 0,
  witness_count INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]',
  circles JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 开启 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的资料
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 步骤4：启用手机号认证

在 Supabase Dashboard → Authentication → Providers → Phone 中启用：
- Provider: Phone
- SMS Provider: 选择 Twilio 或 MessageBird
- 配置对应的 API Key 和 Sender Phone

### 步骤5：验证配置

运行项目后，在控制台查看是否有 `[Supabase] 环境变量未配置` 的警告。
- 无警告 = 配置成功
- 有警告 = 检查环境变量是否正确注入

## 当前状态

- ✅ Supabase 客户端已集成
- ✅ Auth 服务已支持 Supabase OTP 登录
- ✅ 登出时已调用 Supabase signOut
- ✅ 无配置时自动 fallback 到 mock 登录
- ⏳ 需要用户自行配置环境变量和数据库表
