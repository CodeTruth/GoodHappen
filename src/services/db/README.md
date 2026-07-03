# 后端 API 服务层（Supabase）

## 概述

本目录封装了所有与 Supabase 数据库交互的 API 方法，提供统一的错误处理和 fallback 机制。

- **核心设计**：每个 API 方法都有 fallback，Supabase 不可用时返回 `null` 或空数组，不抛错
- **Mock 数据保留**：API 层不删除任何 mock 数据，只是提供额外的后端通道
- **类型安全**：所有方法都有完整的 TypeScript 类型注解

## 文件结构

| 文件 | 说明 |
|------|------|
| `client.ts` | Supabase 客户端封装，通用 CRUD 方法 |
| `schema.ts` | 数据库表结构对应的 TypeScript 类型 |
| `userApi.ts` | 用户资料 CRUD（profiles 表） |
| `kindnessApi.ts` | 善行记录 CRUD（kindness_records 表） |
| `fortuneApi.ts` | 福气值交易 CRUD（fortune_records 表） |
| `interactionApi.ts` | 点赞/评论 CRUD（interactions 表） |
| `index.ts` | 统一导出 |

## Supabase 表创建 SQL

### 1. profiles（用户资料）

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '温暖用户',
  avatar TEXT NOT NULL DEFAULT 'https://picsum.photos/id/64/200/200',
  bio TEXT,
  gender TEXT NOT NULL DEFAULT 'unknown' CHECK (gender IN ('male', 'female', 'unknown')),
  birth_year INTEGER,
  region TEXT,
  phone TEXT,
  blessing_value INTEGER NOT NULL DEFAULT 0,
  kindness_count INTEGER NOT NULL DEFAULT 0,
  witness_count INTEGER NOT NULL DEFAULT 0,
  badges JSONB NOT NULL DEFAULT '[]',
  circles JSONB NOT NULL DEFAULT '[]',
  emergency_contacts JSONB,
  privacy_settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- RLS 策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

### 2. kindness_records（善行记录）

```sql
CREATE TABLE kindness_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'self' CHECK (type IN ('self', 'witness')),
  tags JSONB NOT NULL DEFAULT '[]',
  images JSONB,
  video TEXT,
  location TEXT,
  visible_scope TEXT NOT NULL DEFAULT 'private' CHECK (visible_scope IN ('public', 'followers', 'private', 'circle')),
  circle_id TEXT,
  ai_response JSONB,
  credibility_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  blessing_value INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kindness_user_id ON kindness_records(user_id);
CREATE INDEX idx_kindness_type ON kindness_records(type);
CREATE INDEX idx_kindness_circle_id ON kindness_records(circle_id);
CREATE INDEX idx_kindness_visible_scope ON kindness_records(visible_scope);
CREATE INDEX idx_kindness_created_at ON kindness_records(created_at DESC);

ALTER TABLE kindness_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kindness records are viewable by everyone"
  ON kindness_records FOR SELECT USING (true);

CREATE POLICY "Users can insert their own kindness"
  ON kindness_records FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own kindness"
  ON kindness_records FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own kindness"
  ON kindness_records FOR DELETE USING (auth.uid()::text = user_id);
```

### 3. fortune_records（福气值交易）

```sql
CREATE TABLE fortune_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'transfer', 'award', 'penalty')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  related_id TEXT,
  balance_after INTEGER NOT NULL,
  circle_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fortune_user_id ON fortune_records(user_id);
CREATE INDEX idx_fortune_type ON fortune_records(type);
CREATE INDEX idx_fortune_created_at ON fortune_records(created_at DESC);

ALTER TABLE fortune_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fortune records"
  ON fortune_records FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fortune records"
  ON fortune_records FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 4. interactions（点赞/评论）

```sql
CREATE TABLE interactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kindness_id TEXT NOT NULL REFERENCES kindness_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment')),
  content TEXT,
  mentions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_kindness_id ON interactions(kindness_id);
CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_type ON interactions(type);
CREATE INDEX idx_interactions_created_at ON interactions(created_at DESC);
-- 唯一索引：防止重复点赞
CREATE UNIQUE INDEX idx_interactions_unique_like 
  ON interactions(kindness_id, user_id) WHERE type = 'like';

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interactions are viewable by everyone"
  ON interactions FOR SELECT USING (true);

CREATE POLICY "Users can insert own interactions"
  ON interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions"
  ON interactions FOR DELETE USING (auth.uid() = user_id);
```

### 5. checkin_records（签到/打卡记录）

```sql
CREATE TABLE checkin_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  circle_id TEXT,
  category TEXT NOT NULL CHECK (category IN ('warm', 'growth', 'positive')),
  subcategory TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'video')),
  content TEXT NOT NULL,
  images JSONB,
  video TEXT,
  video_thumb TEXT,
  ai_summary TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'circle', 'public')),
  streak_days INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date TEXT NOT NULL
);

CREATE INDEX idx_checkin_user_id ON checkin_records(user_id);
CREATE INDEX idx_checkin_circle_id ON checkin_records(circle_id);
CREATE INDEX idx_checkin_date ON checkin_records(date DESC);
CREATE INDEX idx_checkin_category ON checkin_records(category);

ALTER TABLE checkin_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkins are viewable by everyone"
  ON checkin_records FOR SELECT USING (true);

CREATE POLICY "Users can insert own checkins"
  ON checkin_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins"
  ON checkin_records FOR UPDATE USING (auth.uid() = user_id);
```

### 6. circles（善行圈）

```sql
CREATE TABLE circles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('class', 'company', 'community', 'friends', 'public')),
  access_type TEXT NOT NULL DEFAULT 'open' CHECK (access_type IN ('open', 'closed', 'public')),
  description TEXT,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  class_code TEXT,
  require_real_name BOOLEAN NOT NULL DEFAULT false,
  member_count INTEGER NOT NULL DEFAULT 0,
  kindness_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circles_admin_id ON circles(admin_id);
CREATE INDEX idx_circles_type ON circles(type);

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circles are viewable by everyone"
  ON circles FOR SELECT USING (true);

CREATE POLICY "Admins can insert circles"
  ON circles FOR INSERT WITH CHECK (auth.uid()::text = admin_id);

CREATE POLICY "Admins can update own circles"
  ON circles FOR UPDATE USING (auth.uid()::text = admin_id);
```

### 7. circle_members（圈成员关系）

```sql
CREATE TABLE circle_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'groupLeader', 'admin')),
  member_number INTEGER NOT NULL,
  last_checkin_date TEXT,
  is_real_name BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX idx_circle_members_user_id ON circle_members(user_id);
CREATE UNIQUE INDEX idx_circle_members_unique ON circle_members(circle_id, user_id);

ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circle members are viewable by everyone"
  ON circle_members FOR SELECT USING (true);
```

### 8. sos_records（SOS 记录）

```sql
CREATE TABLE sos_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  evidence_package_id TEXT,
  record_id TEXT,
  source TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location_lat DECIMAL(10, 7),
  location_lng DECIMAL(10, 7),
  location_address TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_confirm' 
    CHECK (status IN ('pending_confirm', 'confirmed', 'false_alarm', 'expired', 'lawyer_matched', 'evidence_locked', 'resolved')),
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  deposit_status TEXT NOT NULL DEFAULT 'held' CHECK (deposit_status IN ('held', 'refunded', 'deducted')),
  confirmed_at TIMESTAMPTZ,
  ai_verdict TEXT CHECK (ai_verdict IN ('real', 'suspicious', 'unknown')),
  total_notify_cost INTEGER NOT NULL DEFAULT 0,
  notifications JSONB,
  scene_context JSONB,
  protection_evidence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sos_user_id ON sos_records(user_id);
CREATE INDEX idx_sos_status ON sos_records(status);
CREATE INDEX idx_sos_triggered_at ON sos_records(triggered_at DESC);

ALTER TABLE sos_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own SOS records"
  ON sos_records FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SOS records"
  ON sos_records FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 9. witness_records（见证记录）

```sql
CREATE TABLE witness_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  witness_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  witness_user_name TEXT NOT NULL,
  witness_user_avatar TEXT NOT NULL,
  record_id TEXT NOT NULL REFERENCES kindness_records(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location_lat DECIMAL(10, 7) NOT NULL,
  location_lng DECIMAL(10, 7) NOT NULL,
  location_address TEXT NOT NULL,
  description TEXT NOT NULL,
  matched BOOLEAN NOT NULL DEFAULT false,
  notified BOOLEAN NOT NULL DEFAULT false,
  badge_granted BOOLEAN NOT NULL DEFAULT false,
  event_timestamp TIMESTAMPTZ,
  event_location_lat DECIMAL(10, 7),
  event_location_lng DECIMAL(10, 7),
  metadata_source TEXT CHECK (metadata_source IN ('exif', 'manual', 'inferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_witness_record_id ON witness_records(record_id);
CREATE INDEX idx_witness_user_id ON witness_records(witness_user_id);
CREATE INDEX idx_witness_matched ON witness_records(matched);

ALTER TABLE witness_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Witness records are viewable by everyone"
  ON witness_records FOR SELECT USING (true);

CREATE POLICY "Users can insert own witness records"
  ON witness_records FOR INSERT WITH CHECK (auth.uid()::text = witness_user_id);
```

## 触发器：自动更新计数

```sql
-- 自动更新用户善行计数
CREATE OR REPLACE FUNCTION increment_user_kindness_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET kindness_count = kindness_count + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kindness_insert
  AFTER INSERT ON kindness_records
  FOR EACH ROW
  EXECUTE FUNCTION increment_user_kindness_count();

-- 自动更新圈子善行计数
CREATE OR REPLACE FUNCTION increment_circle_kindness_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.circle_id IS NOT NULL THEN
    UPDATE circles SET kindness_count = kindness_count + 1 WHERE id = NEW.circle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_circle_kindness_insert
  AFTER INSERT ON kindness_records
  FOR EACH ROW
  EXECUTE FUNCTION increment_circle_kindness_count();

-- 自动更新圈子成员数
CREATE OR REPLACE FUNCTION increment_circle_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE circles SET member_count = member_count + 1 WHERE id = NEW.circle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_circle_member_insert
  AFTER INSERT ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION increment_circle_member_count();

CREATE OR REPLACE FUNCTION decrement_circle_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE circles SET member_count = member_count - 1 WHERE id = OLD.circle_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_circle_member_delete
  AFTER DELETE ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION decrement_circle_member_count();
```

## 使用示例

```typescript
import { getUserProfile, createKindness, toggleLike, getUserFortune } from '@/services/db';

// 获取用户资料
const user = await getUserProfile('user_123');

// 创建善行记录
const kindness = await createKindness({
  user_id: 'user_123',
  user_name: '温暖小太阳',
  user_avatar: 'https://example.com/avatar.jpg',
  content: '今天帮助了一位老人过马路',
  type: 'self',
  tags: ['帮助老人', '正能量'],
  visible_scope: 'public',
  credibility_score: 0.95,
  blessing_value: 10,
  is_anonymous: false,
});

// 点赞
const { isLiked } = await toggleLike({
  kindnessId: 'kindness_456',
  userId: 'user_123',
  userName: '温暖小太阳',
  userAvatar: 'https://example.com/avatar.jpg',
});

// 查询福气值余额
const fortune = await getUserFortune('user_123');
```

## 注意事项

1. **RLS 策略**：生产环境务必启用 RLS（Row Level Security），防止未授权访问
2. **索引优化**：根据实际查询模式调整索引
3. **JSONB 字段**：`tags`、`badges`、`circles` 等数组字段使用 JSONB 存储
4. **fallback 机制**：所有 API 在 Supabase 不可用时静默失败，不影响前端 mock 数据展示
5. **事务处理**：复杂操作（如转账）建议在 Supabase RPC 函数中实现原子性
