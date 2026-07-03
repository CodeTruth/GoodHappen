import { supabase } from '../supabase';
import { DbCheckin } from './schema';
import { CheckinRecord, CheckinTask } from '@/store/checkin';

/**
 * 创建打卡记录
 */
export const addCheckin = async (record: CheckinRecord): Promise<DbCheckin | null> => {
  try {
    const { data, error } = await supabase
      .from('checkin_records')
      .insert({
        id: record.id,
        user_id: record.userId,
        user_name: record.userName,
        user_avatar: record.userAvatar,
        circle_id: record.circleId || null,
        category: record.category,
        subcategory: record.subcategory,
        content_type: record.contentType,
        content: record.content,
        images: record.images || [],
        video: record.video || null,
        visibility: record.visibility,
        streak_days: record.streakDays,
        date: record.date,
        created_at: record.createdAt,
      })
      .select()
      .single();
    if (error) {
      console.error('[DB_ERROR] addCheckin | table=checkin_records | msg=', error.message);
      return null;
    }
    return data as DbCheckin;
  } catch (e) {
    console.error('[DB_ERROR] addCheckin | table=checkin_records | msg=', e);
    return null;
  }
};

/**
 * 获取打卡记录列表
 */
export const getCheckins = async (userId?: string): Promise<CheckinRecord[]> => {
  try {
    let query = supabase.from('checkin_records').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) {
      console.error('[DB_ERROR] getCheckins | table=checkin_records | msg=', error.message);
      return [];
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      userName: d.user_name,
      userAvatar: d.user_avatar,
      circleId: d.circle_id,
      category: d.category,
      subcategory: d.subcategory,
      contentType: d.content_type,
      content: d.content,
      images: d.images || [],
      video: d.video,
      visibility: d.visibility,
      streakDays: d.streak_days,
      createdAt: d.created_at,
      date: d.date,
    })) as CheckinRecord[];
  } catch (e) {
    console.error('[DB_ERROR] getCheckins | table=checkin_records | msg=', e);
    return [];
  }
};

/**
 * 保存打卡任务
 */
export const saveTasks = async (tasks: CheckinTask[]): Promise<boolean> => {
  try {
    const { error } = await supabase.from('checkin_tasks').upsert(
      tasks.map((t) => ({
        id: t.id,
        circle_id: t.circleId,
        title: t.title,
        description: t.description || null,
        category: t.category,
        subcategory: t.subcategory || null,
        frequency: t.frequency,
        custom_days: t.customDays || null,
        start_date: t.startDate,
        end_date: t.endDate || null,
        is_active: t.isActive,
        created_by: t.createdBy,
        total_completions: t.totalCompletions,
        participant_count: t.participantCount,
        created_at: t.createdAt,
      }))
    );
    if (error) {
      console.error('[DB_ERROR] saveTasks | table=checkin_tasks | msg=', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[DB_ERROR] saveTasks | table=checkin_tasks | msg=', e);
    return false;
  }
};

/**
 * 获取打卡任务
 */
export const getTasks = async (circleId?: string): Promise<CheckinTask[]> => {
  try {
    let query = supabase.from('checkin_tasks').select('*').eq('is_active', true);
    if (circleId) query = query.eq('circle_id', circleId);
    const { data, error } = await query;
    if (error) {
      console.error('[DB_ERROR] getTasks | table=checkin_tasks | msg=', error.message);
      return [];
    }
    return (data || []).map((d: any) => ({
      id: d.id,
      circleId: d.circle_id,
      title: d.title,
      description: d.description,
      category: d.category,
      subcategory: d.subcategory,
      frequency: d.frequency,
      customDays: d.custom_days,
      startDate: d.start_date,
      endDate: d.end_date,
      isActive: d.is_active,
      createdBy: d.created_by,
      totalCompletions: d.total_completions,
      participantCount: d.participant_count,
      createdAt: d.created_at,
    })) as CheckinTask[];
  } catch (e) {
    console.error('[DB_ERROR] getTasks | table=checkin_tasks | msg=', e);
    return [];
  }
};
