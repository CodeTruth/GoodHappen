import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { safeNavigateBack } from '@/utils/navigate-back';
import styles from './index.module.scss';

const LETTER_KEY = 'haoshi_future_letters';

interface FutureLetter {
  id: string;
  content: string;
  sendDate: string;    // 写信日期
  deliverDate: string; // 投递日期
  status: 'pending' | 'delivered';
}

function loadLetters(): FutureLetter[] {
  try { const r = Taro.getStorageSync(LETTER_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}

function saveLetters(letters: FutureLetter[]) {
  Taro.setStorageSync(LETTER_KEY, JSON.stringify(letters));
}

export default function FutureLetterPage() {
  const [letters, setLetters] = useState<FutureLetter[]>([]);
  const [showWrite, setShowWrite] = useState(false);
  const [letterText, setLetterText] = useState('');
  const [selectedDelay, setSelectedDelay] = useState('1year');

  useEffect(() => {
    const saved = loadLetters();
    const today = new Date().toISOString().slice(0, 10);
    const updated = saved.map(l => {
      if (l.status === 'pending' && l.deliverDate <= today) {
        return { ...l, status: 'delivered' };
      }
      return l;
    });
    if (updated.some((l, i) => l.status !== saved[i].status)) {
      saveLetters(updated);
    }
    setLetters(updated);
  }, []);

  const handleSend = () => {
    if (!letterText.trim()) return;
    const now = new Date();
    const delayMonths: Record<string, number> = { '1month': 1, '6months': 6, '1year': 12 };
    const deliver = new Date(now);
    const day = Math.min(now.getDate(), 28);
    deliver.setDate(day);
    deliver.setMonth(deliver.getMonth() + (delayMonths[selectedDelay] || 12));

    const letter: FutureLetter = {
      id: `fl_${Date.now()}`,
      content: letterText.trim(),
      sendDate: now.toISOString().slice(0, 10),
      deliverDate: deliver.toISOString().slice(0, 10),
      status: 'pending',
    };

    const updated = [letter, ...loadLetters()];
    saveLetters(updated);
    setLetters(updated);
    setLetterText('');
    setShowWrite(false);
    Taro.showToast({ title: '信已封存，到了时间会自动投递给你', icon: 'none' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.backBtn} onClick={() => safeNavigateBack()}><Text>←</Text></View>
        <Text className={styles.headerTitle}>给未来的信</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView className={styles.body} scrollY enhanced showScrollbar={false}>
        <View className={styles.intro}>
          <Text className={styles.introEmoji}>💌</Text>
          <Text className={styles.introText}>给未来的自己写一封信。选择投递时间，到那天平台会推送给你。</Text>
          <Text className={styles.introSub}>也许一年后的你，已经变成了更好的人。</Text>
        </View>

        {/* 写信 */}
        {!showWrite ? (
          <View className={styles.writeBtn} onClick={() => setShowWrite(true)}>
            <Text className={styles.writeBtnText}>✍️ 写一封信</Text>
          </View>
        ) : (
          <View className={styles.writeBox}>
            <Textarea
              className={styles.writeInput}
              value={letterText}
              placeholder="亲爱的未来的自己…"
              onInput={e => setLetterText(e.detail.value)}
              maxlength={500}
              autoHeight
            />
            <Text className={styles.writeHint}>选择投递时间：</Text>
            <View className={styles.delayRow}>
              {([['1month', '1个月后'], ['6months', '6个月后'], ['1year', '1年后']] as const).map(([k, label]) => (
                <View key={k} className={`${styles.delayBtn} ${selectedDelay === k ? styles.delayBtnActive : ''}`} onClick={() => setSelectedDelay(k)}>
                  <Text className={styles.delayBtnText}>{label}</Text>
                </View>
              ))}
            </View>
            <View className={styles.writeActions}>
              <View className={styles.writeCancel} onClick={() => { setShowWrite(false); setLetterText(''); }}>
                <Text className={styles.writeCancelText}>取消</Text>
              </View>
              <View className={styles.writeSubmit} onClick={handleSend}>
                <Text className={styles.writeSubmitText}>封存这封信</Text>
              </View>
            </View>
          </View>
        )}

        {/* 信件列表 */}
        {letters.length > 0 && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>我的信件</Text>
            {letters.map(letter => (
              <View key={letter.id} className={styles.letterCard}>
                <View className={styles.letterStatus}>
                  {letter.status === 'delivered'
                    ? <Text className={styles.letterDelivered}>📬 已投递</Text>
                    : <Text className={styles.letterPending}>封存中 · {letter.deliverDate} 投递</Text>}
                </View>
                <Text className={styles.letterContent}>{letter.content}</Text>
                <Text className={styles.letterDate}>写于 {letter.sendDate}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}