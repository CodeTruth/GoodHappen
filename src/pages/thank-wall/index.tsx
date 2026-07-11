import React, { useState } from 'react';
import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { safeNavigateBack } from '@/utils/navigate-back';
import { THANK_NOTES, type ThankNote } from '@/data/thank-wall-data';
import styles from './index.module.scss';

const LIKED_IDS_KEY = 'haoshi_thank_wall_liked_ids';
const TXT_TITLE = '\u533F\u540D\u611F\u8C22\u5899';
const TXT_INTRO = '\u6709\u4E9B\u611F\u8C22\u6765\u4E0D\u53CA\u8BF4\u51FA\u53E3\u3002\u5728\u8FD9\u91CC\uFF0C\u4F60\u53EF\u4EE5\u533F\u540D\u611F\u8C22\u90A3\u4E2A\u5E2E\u8FC7\u4F60\u7684\u4EBA\u3002\u5982\u679C\u5BF9\u65B9\u4E5F\u5728\u5E73\u53F0\uFF0C\u4ED6/\u5979\u4F1A\u770B\u5230\u7684\u3002';
const TXT_WRITE = '\u270D\uFE0F \u5199\u4E00\u5C01\u611F\u8C22\u4FE1';
const TXT_PH = '\u60F3\u611F\u8C22\u8C01\uFF1F\u53D1\u751F\u4E86\u4EC0\u4E48\uFF1F\u533F\u540D\u5199\u4E0B\u6765...';
const TXT_CANCEL = '\u53D6\u6D88';
const TXT_SUBMIT = '\u9001\u51FA\u611F\u8C22';
const TXT_TOAST = '\u611F\u8C22\u5DF2\u9001\u51FA\uFF0C\u4E5F\u8BB8\u4ED6/\u5979\u80FD\u770B\u5230';
const TXT_REPLIED = '\uD83D\uDC8C \u8FD9\u6761\u611F\u8C22\u5DF2\u88AB\u63A5\u6536';

function loadLikedIds(): Set<string> {
  try {
    const raw = Taro.getStorageSync(LIKED_IDS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveLikedIds(ids: Set<string>) {
  Taro.setStorageSync(LIKED_IDS_KEY, JSON.stringify([...ids]));
}

export default function ThankWallPage() {
  const [likedIds, setLikedIds] = useState<Set<string>>(loadLikedIds);
  const [notes, setNotes] = useState(() => {
    const ids = loadLikedIds();
    return THANK_NOTES.map(n => ids.has(n.id) ? { ...n, likes: n.likes + 1 } : n);
  });
  const [showInput, setShowInput] = useState(false);
  const [inputText, setInputText] = useState('');

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    const newNote: ThankNote = {
      id: `tn_new_${Date.now()}`,
      content: inputText.trim(),
      from: '\u533F\u540D',
      time: '\u521A\u521A',
      likes: 0,
      replied: false,
    };
    setNotes(prev => [newNote, ...prev]);
    setInputText('');
    setShowInput(false);
    Taro.showToast({ title: TXT_TOAST, icon: 'none' });
  };

  const handleLike = (id: string) => {
    if (likedIds.has(id)) return;
    const next = new Set(likedIds);
    next.add(id);
    setLikedIds(next);
    saveLikedIds(next);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, likes: n.likes + 1 } : n));
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.backBtn} onClick={() => safeNavigateBack()}><Text>{'\u2190'}</Text></View>
        <Text className={styles.headerTitle}>{TXT_TITLE}</Text>
        <View style={{ width: 30 }} />
      </View>

      <View className={styles.intro}>
        <Text className={styles.introText}>{TXT_INTRO}</Text>
      </View>

      <View className={styles.writeSection}>
        {!showInput ? (
          <View className={styles.writeBtn} onClick={() => setShowInput(true)}>
            <Text className={styles.writeBtnText}>{TXT_WRITE}</Text>
          </View>
        ) : (
          <View className={styles.writeBox}>
            <Textarea
              className={styles.writeInput}
              value={inputText}
              placeholder={TXT_PH}
              onInput={e => setInputText(e.detail.value)}
              maxlength={200}
              autoHeight
            />
            <View className={styles.writeActions}>
              <View className={styles.writeCancel} onClick={() => { setShowInput(false); setInputText(''); }}>
                <Text className={styles.writeCancelText}>{TXT_CANCEL}</Text>
              </View>
              <View className={styles.writeSubmit} onClick={handleSubmit}>
                <Text className={styles.writeSubmitText}>{TXT_SUBMIT}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <ScrollView className={styles.list} scrollY enhanced showScrollbar={false}>
        {notes.map((note) => (
          <View key={note.id} className={styles.card}>
            <Text className={styles.cardContent}>{note.content}</Text>
            <View className={styles.cardFooter}>
              <View className={styles.cardMeta}>
                <Text className={styles.cardFrom}>{'\uD83D\uDC8C'} {note.from}</Text>
                {note.location && <Text className={styles.cardLoc}>{'\uD83D\uDCCD'} {note.location}</Text>}
                <Text className={styles.cardTime}>{note.time}</Text>
              </View>
              <View className={styles.cardLike} onClick={() => handleLike(note.id)}>
                <Text className={styles.cardLikeIcon}>{'\uD83E\uDD0D'}</Text>
                <Text className={styles.cardLikeCount}>{note.likes}</Text>
              </View>
            </View>
            {note.replied && (
              <View className={styles.cardReplied}>
                <Text className={styles.cardRepliedText}>{TXT_REPLIED}</Text>
              </View>
            )}
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}