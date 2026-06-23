import React, { useState, useEffect } from 'react';
import { View, Text, Image, Input, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useChallengeStore, personalChallengeTemplates } from '@/store/challenge';
import { ChallengeType } from '@/data/challenges';
import styles from './index.module.scss';

const ChallengesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ChallengeType>('theme');
  // 创建个人挑战弹窗
  const [showCreatePersonal, setShowCreatePersonal] = useState(false);
  // 创建组队挑战弹窗
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  // 加入队伍弹窗
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  // 选中的模板
  const [selectedTemplate, setSelectedTemplate] = useState<number>(-1);
  // 自定义挑战表单
  const [form, setForm] = useState({
    title: '',
    description: '',
    icon: '🌟',
    targetDays: 7,
    targetCount: 7,
  });
  // 组队挑战表单
  const [teamForm, setTeamForm] = useState({
    title: '',
    description: '',
    targetCount: 50,
    maxMembers: 5,
  });
  // 邀请码输入
  const [inviteCode, setInviteCode] = useState('');

  const {
    themeChallenges,
    personalChallenges,
    teamChallenges,
    joinThemeChallenge,
    createPersonalChallenge,
    deletePersonalChallenge,
    createTeamChallenge,
    joinTeamByInviteCode,
    getTeamChallenge,
    loadFromStorage,
  } = useChallengeStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 切换 Tab
  const handleTabChange = (tab: ChallengeType) => {
    setActiveTab(tab);
  };

  // 加入主题挑战
  const handleJoinTheme = (challengeId: string) => {
    joinThemeChallenge(challengeId);
  };

  // 打开创建个人挑战弹窗
  const handleOpenCreatePersonal = () => {
    setForm({ title: '', description: '', icon: '🌟', targetDays: 7, targetCount: 7 });
    setSelectedTemplate(-1);
    setShowCreatePersonal(true);
  };

  // 选择模板
  const handleSelectTemplate = (index: number) => {
    setSelectedTemplate(index);
    const tpl = personalChallengeTemplates[index];
    setForm({
      title: tpl.title,
      description: tpl.description || '',
      icon: tpl.icon,
      targetDays: tpl.targetDays,
      targetCount: tpl.targetCount,
    });
  };

  // 提交创建个人挑战
  const handleSubmitPersonal = () => {
    if (!form.title.trim()) {
      Taro.showToast({ title: '请输入挑战标题', icon: 'none' });
      return;
    }
    if (form.targetDays <= 0 || form.targetCount <= 0) {
      Taro.showToast({ title: '目标需大于0', icon: 'none' });
      return;
    }
    const isCustom = selectedTemplate === -1;
    createPersonalChallenge({
      title: form.title.trim(),
      description: form.description.trim(),
      icon: form.icon,
      targetDays: form.targetDays,
      targetCount: form.targetCount,
      isCustom,
      badge: isCustom ? '自定义达人' : personalChallengeTemplates[selectedTemplate]?.badge,
    });
    Taro.showToast({ title: '挑战已创建', icon: 'success' });
    setShowCreatePersonal(false);
  };

  // 删除个人挑战
  const handleDeletePersonal = (challengeId: string) => {
    Taro.showModal({
      title: '提示',
      content: '确定要放弃这个挑战吗？',
      success: (res) => {
        if (res.confirm) {
          deletePersonalChallenge(challengeId);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  };

  // 提交创建组队挑战
  const handleSubmitTeam = () => {
    if (!teamForm.title.trim()) {
      Taro.showToast({ title: '请输入队伍名称', icon: 'none' });
      return;
    }
    const id = createTeamChallenge({
      title: teamForm.title.trim(),
      description: teamForm.description.trim() || '一起完成温暖挑战',
      icon: '👥',
      coverColor: '#FF6B6B',
      coverColorEnd: '#FFA07A',
      targetCount: teamForm.targetCount,
      maxMembers: teamForm.maxMembers,
      badge: '温暖小队',
    });
    const team = getTeamChallenge(id);
    if (team) {
      Taro.showToast({ title: `队伍创建成功！邀请码：${team.inviteCode}`, icon: 'none', duration: 2500 });
    }
    setShowCreateTeam(false);
    setTeamForm({ title: '', description: '', targetCount: 50, maxMembers: 5 });
  };

  // 通过邀请码加入队伍
  const handleJoinByCode = () => {
    if (!inviteCode.trim()) {
      Taro.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    const ok = joinTeamByInviteCode(inviteCode.trim());
    if (ok) {
      setShowJoinTeam(false);
      setInviteCode('');
    }
  };

  // 复制邀请码
  const handleCopyCode = (code: string) => {
    Taro.setClipboardData({
      data: code,
      success: () => {
        Taro.showToast({ title: '邀请码已复制', icon: 'success' });
      },
    });
  };

  // 分享邀请
  const handleShareInvite = (teamId: string) => {
    const team = getTeamChallenge(teamId);
    if (!team) return;
    Taro.setClipboardData({
      data: `我在「好事发生」发起了「${team.title}」挑战，邀请码：${team.inviteCode}，一起来完成温暖挑战吧！`,
      success: () => {
        Taro.showToast({ title: '邀请文案已复制', icon: 'success' });
      },
    });
  };

  // 渲染主题挑战
  const renderThemeChallenges = () => (
    <View className={styles.section}>
      <Text className={styles.sectionTitle}>
        🎯 主题挑战
        <Text className={styles.sectionCount}>{themeChallenges.length}个进行中</Text>
      </Text>
      {themeChallenges.map(challenge => (
        <View
          key={challenge.id}
          className={styles.themeCard}
          style={{
            background: `linear-gradient(135deg, ${challenge.coverColor} 0%, ${challenge.coverColorEnd} 100%)`,
          }}
        >
          <View className={styles.themeHeader}>
            <View className={styles.themeIcon}>
              <Text>{challenge.icon}</Text>
            </View>
            <View className={styles.themeInfo}>
              <Text className={styles.themeTitle}>{challenge.title}</Text>
              <Text className={styles.themeDesc}>{challenge.description}</Text>
            </View>
          </View>
          <View className={styles.themeMeta}>
            <Text className={styles.themeMetaText}>
              📅 {challenge.targetDays}天 · 👥 {challenge.participantCount}人参与
            </Text>
            <Text className={styles.themeBadge}>🏅 {challenge.badge}</Text>
          </View>
          <View className={styles.joinBtn} onClick={() => handleJoinTheme(challenge.id)}>
            <Text className={styles.joinBtnText}>加入挑战</Text>
          </View>
        </View>
      ))}
    </View>
  );

  // 渲染个人挑战
  const renderPersonalChallenges = () => (
    <View className={styles.section}>
      <Text className={styles.sectionTitle}>
        🌟 我的个人挑战
        <Text className={styles.sectionCount}>{personalChallenges.length}个</Text>
      </Text>
      {personalChallenges.length === 0 ? (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🌱</Text>
          <Text className={styles.emptyText}>还没有个人挑战，创建一个吧！</Text>
        </View>
      ) : (
        personalChallenges.map(challenge => {
          const progress = Math.min(100, (challenge.completedDays / challenge.targetDays) * 100);
          const isCompleted = challenge.status === 'completed';
          return (
            <View key={challenge.id} className={styles.personalCard}>
              <View className={styles.personalHeader}>
                <View className={styles.personalIcon}>
                  <Text>{challenge.icon}</Text>
                </View>
                <View className={styles.personalInfo}>
                  <Text className={styles.personalTitle}>
                    {challenge.title}
                    {challenge.isCustom && <Text style={{ fontSize: '20rpx', color: '#999', marginLeft: '8rpx' }}>·自定义</Text>}
                  </Text>
                  <Text className={styles.personalDesc}>{challenge.description || '坚持就是胜利'}</Text>
                </View>
                <Text className={styles.deleteIcon} onClick={() => handleDeletePersonal(challenge.id)}>✕</Text>
              </View>
              <View className={styles.progressWrap}>
                <View className={styles.progressMeta}>
                  <Text className={styles.progressText}>
                    已完成 {challenge.completedDays}/{challenge.targetDays} 天
                  </Text>
                  <Text className={styles.progressNumber}>{progress.toFixed(0)}%</Text>
                </View>
                <View className={styles.progressBar}>
                  <View className={styles.progressFill} style={{ width: `${progress}%` }} />
                </View>
              </View>
              {isCompleted && (
                <Text className={styles.completedBadge}>✓ 已完成 · 获得「{challenge.badge || '善行使者'}」徽章</Text>
              )}
            </View>
          );
        })
      )}
      <View className={styles.createBtn} onClick={handleOpenCreatePersonal}>
        <Text className={styles.createBtnText}>+ 创建个人挑战</Text>
      </View>
    </View>
  );

  // 渲染组队挑战
  const renderTeamChallenges = () => (
    <View className={styles.section}>
      <Text className={styles.sectionTitle}>
        👥 组队挑战
        <Text className={styles.sectionCount}>{teamChallenges.length}个</Text>
      </Text>
      {teamChallenges.length === 0 ? (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🤝</Text>
          <Text className={styles.emptyText}>还没有组队挑战，创建或加入一个吧！</Text>
        </View>
      ) : (
        teamChallenges.map(team => {
          const progress = Math.min(100, (team.teamTotalCount / team.targetCount) * 100);
          return (
            <View key={team.id} className={styles.teamCard}>
              <View className={styles.teamHeader}>
                <View
                  className={styles.teamIcon}
                  style={{
                    background: `linear-gradient(135deg, ${team.coverColor} 0%, ${team.coverColorEnd} 100%)`,
                  }}
                >
                  <Text>{team.icon}</Text>
                </View>
                <View className={styles.teamInfo}>
                  <Text className={styles.teamTitle}>{team.title}</Text>
                  <Text className={styles.teamDesc}>{team.description}</Text>
                </View>
              </View>

              {/* 队伍总进度 */}
              <View className={styles.teamTotalCard}>
                <Text className={styles.teamTotalText}>
                  {team.members.length}人队伍共完成 {team.teamTotalCount} 件
                </Text>
                <Text className={styles.teamTotalSub}>
                  目标 {team.targetCount} 件 · 还差 {Math.max(0, team.targetCount - team.teamTotalCount)} 件
                </Text>
                <View className={styles.progressBar} style={{ marginTop: '12rpx' }}>
                  <View className={styles.progressFill} style={{ width: `${progress}%` }} />
                </View>
              </View>

              {/* 队员列表 */}
              <View className={styles.memberList}>
                {team.members.map(member => (
                  <View key={member.userId} className={styles.memberItem}>
                    <Image src={member.avatar} className={styles.memberAvatar} mode="aspectFill" />
                    <View className={styles.memberInfo}>
                      <Text className={styles.memberName}>
                        {member.name}
                        {member.userId === team.captainId && <Text className={styles.captainTag}>队长</Text>}
                      </Text>
                      <Text className={styles.memberContribution}>贡献 {member.contribution} 件</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* 邀请码 */}
              <View className={styles.inviteSection}>
                <View>
                  <Text className={styles.inviteCodeLabel}>邀请码</Text>
                  <Text className={styles.inviteCode}>{team.inviteCode}</Text>
                </View>
                <Text className={styles.copyBtn} onClick={() => handleCopyCode(team.inviteCode)}>复制</Text>
              </View>

              {/* 分享邀请 */}
              <View className={styles.createBtn} style={{ background: '#FFA07A' }} onClick={() => handleShareInvite(team.id)}>
                <Text className={styles.createBtnText}>邀请好友加入</Text>
              </View>
            </View>
          );
        })
      )}

      {/* 创建/加入队伍按钮 */}
      <View className={styles.createBtn} onClick={() => setShowCreateTeam(true)}>
        <Text className={styles.createBtnText}>+ 创建队伍</Text>
      </View>
      <View
        className={styles.createBtn}
        style={{ background: '#fff', color: '#FF6B6B', border: '2rpx solid #FF6B6B' }}
        onClick={() => setShowJoinTeam(true)}
      >
        <Text className={styles.createBtnText} style={{ color: '#FF6B6B' }}>通过邀请码加入</Text>
      </View>
    </View>
  );

  return (
    <View className={styles.container}>
      {/* 页面头部 */}
      <View className={styles.header}>
        <Text className={styles.title}>温暖挑战</Text>
        <Text className={styles.subtitle}>不排名、不对抗，只为更好的自己</Text>
      </View>

      {/* Tab 切换 */}
      <View className={styles.tabBar}>
        <Text
          className={`${styles.tabItem} ${activeTab === 'theme' ? styles.active : ''}`}
          onClick={() => handleTabChange('theme')}
        >
          主题挑战
        </Text>
        <Text
          className={`${styles.tabItem} ${activeTab === 'personal' ? styles.active : ''}`}
          onClick={() => handleTabChange('personal')}
        >
          个人挑战
        </Text>
        <Text
          className={`${styles.tabItem} ${activeTab === 'team' ? styles.active : ''}`}
          onClick={() => handleTabChange('team')}
        >
          组队挑战
        </Text>
      </View>

      {/* 内容区 */}
      {activeTab === 'theme' && renderThemeChallenges()}
      {activeTab === 'personal' && renderPersonalChallenges()}
      {activeTab === 'team' && renderTeamChallenges()}

      {/* 创建个人挑战弹窗 */}
      {showCreatePersonal && (
        <View className={styles.modalMask} onClick={() => setShowCreatePersonal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>创建个人挑战</Text>
              <Text className={styles.modalClose} onClick={() => setShowCreatePersonal(false)}>✕</Text>
            </View>

            <Text className={styles.rowLabel}>选择模板（可选）</Text>
            <View className={styles.templateList}>
              {personalChallengeTemplates.map((tpl, idx) => (
                <View
                  key={idx}
                  className={`${styles.templateTag} ${selectedTemplate === idx ? styles.active : ''}`}
                  onClick={() => handleSelectTemplate(idx)}
                >
                  <Text className={styles.templateText}>{tpl.icon} {tpl.title}</Text>
                </View>
              ))}
            </View>

            <Text className={styles.rowLabel}>挑战标题</Text>
            <Input
              className={styles.input}
              placeholder="如：每日一善"
              value={form.title}
              onInput={(e) => setForm({ ...form, title: e.detail.value })}
              maxlength={20}
            />

            <Text className={styles.rowLabel}>挑战描述（可选）</Text>
            <Textarea
              className={styles.textarea}
              placeholder="描述你的挑战目标..."
              value={form.description}
              onInput={(e) => setForm({ ...form, description: e.detail.value })}
              maxlength={100}
            />

            <View className={styles.row}>
              <View className={styles.rowItem}>
                <Text className={styles.rowLabel}>目标天数</Text>
                <Input
                  className={styles.input}
                  type="number"
                  placeholder="如 7"
                  value={String(form.targetDays)}
                  onInput={(e) => setForm({ ...form, targetDays: Number(e.detail.value) || 0 })}
                />
              </View>
              <View className={styles.rowItem}>
                <Text className={styles.rowLabel}>目标次数</Text>
                <Input
                  className={styles.input}
                  type="number"
                  placeholder="如 7"
                  value={String(form.targetCount)}
                  onInput={(e) => setForm({ ...form, targetCount: Number(e.detail.value) || 0 })}
                />
              </View>
            </View>

            <View className={styles.createBtn} onClick={handleSubmitPersonal}>
              <Text className={styles.createBtnText}>开始挑战</Text>
            </View>
          </View>
        </View>
      )}

      {/* 创建组队挑战弹窗 */}
      {showCreateTeam && (
        <View className={styles.modalMask} onClick={() => setShowCreateTeam(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>创建温暖小队</Text>
              <Text className={styles.modalClose} onClick={() => setShowCreateTeam(false)}>✕</Text>
            </View>

            <Text className={styles.rowLabel}>队伍名称</Text>
            <Input
              className={styles.input}
              placeholder="如：5人温暖小队"
              value={teamForm.title}
              onInput={(e) => setTeamForm({ ...teamForm, title: e.detail.value })}
              maxlength={20}
            />

            <Text className={styles.rowLabel}>队伍口号（可选）</Text>
            <Textarea
              className={styles.textarea}
              placeholder="如：一起完成50件善行"
              value={teamForm.description}
              onInput={(e) => setTeamForm({ ...teamForm, description: e.detail.value })}
              maxlength={100}
            />

            <View className={styles.row}>
              <View className={styles.rowItem}>
                <Text className={styles.rowLabel}>队伍目标数</Text>
                <Input
                  className={styles.input}
                  type="number"
                  placeholder="如 50"
                  value={String(teamForm.targetCount)}
                  onInput={(e) => setTeamForm({ ...teamForm, targetCount: Number(e.detail.value) || 0 })}
                />
              </View>
              <View className={styles.rowItem}>
                <Text className={styles.rowLabel}>最大人数</Text>
                <Input
                  className={styles.input}
                  type="number"
                  placeholder="如 5"
                  value={String(teamForm.maxMembers)}
                  onInput={(e) => setTeamForm({ ...teamForm, maxMembers: Number(e.detail.value) || 0 })}
                />
              </View>
            </View>

            <View className={styles.createBtn} onClick={handleSubmitTeam}>
              <Text className={styles.createBtnText}>创建队伍</Text>
            </View>
          </View>
        </View>
      )}

      {/* 加入队伍弹窗 */}
      {showJoinTeam && (
        <View className={styles.modalMask} onClick={() => setShowJoinTeam(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>输入邀请码</Text>
              <Text className={styles.modalClose} onClick={() => setShowJoinTeam(false)}>✕</Text>
            </View>
            <Input
              className={styles.input}
              placeholder="如 WARM28AB"
              value={inviteCode}
              onInput={(e) => setInviteCode(e.detail.value)}
              maxlength={8}
              style={{ textAlign: 'center', letterSpacing: '8rpx', fontSize: '40rpx', fontWeight: '600' }}
            />
            <View className={styles.createBtn} onClick={handleJoinByCode}>
              <Text className={styles.createBtnText}>加入队伍</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default ChallengesPage;
