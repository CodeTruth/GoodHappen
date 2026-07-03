import React, { useState, useEffect } from 'react';
import { View, Text, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getLevelByFortune, getLevelProgress, FortuneLevel } from '@/data/fortune-levels';
import styles from './index.module.scss';

// ============================================
// Phase 10 - I2 温暖海报分享组件（增强版）
// 暖金色设计 · 等级徽章 · 福气值动画
// 使用 Canvas API 生成海报图片
// ============================================

export interface SharePosterProps {
  visible: boolean;
  // 善行内容摘要
  content: string;
  // AI共鸣金句
  aiQuote: string;
  // 作者昵称
  authorName: string;
  // 善行ID（用于扫码跳转）
  kindnessId: string;
  // 善行类型标签
  tag?: string;
  // 福气值（新增）
  fortuneValue?: number;
  // 关闭回调
  onClose: () => void;
}

const SharePoster: React.FC<SharePosterProps> = ({
  visible,
  content,
  aiQuote,
  authorName,
  kindnessId: _kindnessId,
  tag,
  fortuneValue = 0,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [posterPath, setPosterPath] = useState('');
  // 福气数字滚动动画当前值
  const [animFortune, setAnimFortune] = useState(0);
  const canvasId = 'sharePosterCanvas';

  // 等级徽章信息
  const levelInfo: FortuneLevel = getLevelByFortune(fortuneValue);
  const progressInfo = getLevelProgress(fortuneValue);

  // 生成海报
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setPosterPath('');
    setAnimFortune(0);

    // 福气值增长动画
    if (fortuneValue > 0) {
      const duration = 1200;
      const steps = 40;
      const interval = duration / steps;
      let current = 0;
      const inc = fortuneValue / steps;
      const timer = setInterval(() => {
        current += inc;
        if (current >= fortuneValue) {
          setAnimFortune(fortuneValue);
          clearInterval(timer);
        } else {
          setAnimFortune(Math.floor(current));
        }
      }, interval);
    }

    // 延迟一帧确保 Canvas 已渲染
    setTimeout(() => {
      drawPoster();
    }, 100);
  }, [visible, fortuneValue]);

  // 绘制海报到 Canvas
  const drawPoster = () => {
    const query = Taro.createSelectorQuery();
    query.select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          console.error('[SharePoster] Canvas node not found');
          setLoading(false);
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('[SharePoster] Failed to get 2d context');
          setLoading(false);
          return;
        }
        const dpr = Taro.getSystemInfoSync().pixelRatio;
        const width = res[0].width;
        const height = res[0].height;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // ===== 暖金色设计风格 =====
        // 1. 绘制背景渐变（暖金色系）
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, '#FFFCF5');
        bgGradient.addColorStop(0.5, '#FFF8EE');
        bgGradient.addColorStop(1, '#FFFDF8');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // 2. 绘制顶部装饰条（暖金色渐变）
        const topGradient = ctx.createLinearGradient(0, 0, width, 0);
        topGradient.addColorStop(0, '#C4956A');
        topGradient.addColorStop(0.5, '#D4A76A');
        topGradient.addColorStop(1, '#C4956A');
        ctx.fillStyle = topGradient;
        ctx.fillRect(0, 0, width, 14);

        // 3. 绘制平台 Logo 区域
        ctx.fillStyle = '#C4956A';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('🌟 好事发生', 24, 50);
        ctx.fillStyle = '#9E8E7E';
        ctx.font = '12px sans-serif';
        ctx.fillText('记录生活中的温暖瞬间', 24, 72);

        let y = 0;

        // 4. 绘制等级徽章区域
        if (fortuneValue > 0) {
          y = 96;
          // 等级徽章背景
          const badgeX = 24;
          const badgeWidth = width - 48;
          const badgeHeight = 80;
          const badgeGradient = ctx.createLinearGradient(0, y, 0, y + badgeHeight);
          badgeGradient.addColorStop(0, 'rgba(196, 149, 106, 0.10)');
          badgeGradient.addColorStop(1, 'rgba(212, 167, 106, 0.05)');
          ctx.fillStyle = badgeGradient;
          roundRect(ctx, badgeX, y, badgeWidth, badgeHeight, 12);
          ctx.fill();

          // 左侧金色装饰条
          ctx.fillStyle = '#C4956A';
          ctx.fillRect(badgeX, y, 4, badgeHeight);

          // 等级图标
          ctx.font = '28px sans-serif';
          ctx.fillText(levelInfo.icon, badgeX + 18, y + 54);

          // 等级名称
          ctx.fillStyle = '#5D4E37';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(levelInfo.name, badgeX + 60, y + 40);

          // 等级描述
          ctx.fillStyle = '#9E8E7E';
          ctx.font = '11px sans-serif';
          ctx.fillText(levelInfo.description, badgeX + 60, y + 62);

          // 进度条（右侧）
          const progressBarX = badgeX + badgeWidth - 140;
          const progressBarY = y + 32;
          const progressBarWidth = 120;
          const progressBarHeight = 6;
          ctx.fillStyle = '#EDE8E0';
          roundRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, 3);
          ctx.fill();

          ctx.fillStyle = '#C4956A';
          const fillWidth = (progressInfo.progress / 100) * progressBarWidth;
          if (fillWidth > 0) {
            roundRect(ctx, progressBarX, progressBarY, fillWidth, progressBarHeight, 3);
            ctx.fill();
          }

          // 进度文字
          ctx.fillStyle = '#9E8E7E';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`Lv.${levelInfo.level}  ${progressInfo.progress}%`, progressBarX + progressBarWidth, progressBarY - 6);
          ctx.textAlign = 'left';

          y += badgeHeight + 20;
        } else {
          y = 96;
        }

        // 5. 绘制善行内容摘要
        ctx.fillStyle = '#5D4E37';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('今日善行', 24, y + 10);
        y += 30;

        // 内容文字（自动换行）
        ctx.fillStyle = '#2C2419';
        ctx.font = '15px sans-serif';
        const contentLines = wrapText(ctx, content, width - 48);
        let contentY = y;
        const maxContentLines = 4;
        for (let i = 0; i < Math.min(contentLines.length, maxContentLines); i++) {
          ctx.fillText(contentLines[i], 24, contentY);
          contentY += 24;
        }
        if (contentLines.length > maxContentLines) {
          ctx.fillStyle = '#9E8E7E';
          ctx.fillText('...', 24, contentY);
          contentY += 24;
        }
        y = contentY + 8;

        // 6. 绘制标签
        if (tag) {
          ctx.fillStyle = '#F0EBE3';
          const tagWidth = ctx.measureText(tag).width + 24;
          roundRect(ctx, 24, y, tagWidth, 28, 14);
          ctx.fill();
          ctx.fillStyle = '#C4956A';
          ctx.font = '12px sans-serif';
          ctx.fillText(tag, 36, y + 19);
          y += 42;
        } else {
          y += 16;
        }

        // 7. 绘制福气值区域
        if (fortuneValue > 0) {
          const fortuneGradient = ctx.createLinearGradient(24, y, width - 24, y + 44);
          fortuneGradient.addColorStop(0, 'rgba(196, 149, 106, 0.08)');
          fortuneGradient.addColorStop(1, 'rgba(212, 167, 106, 0.08)');
          ctx.fillStyle = fortuneGradient;
          roundRect(ctx, 24, y, width - 48, 44, 10);
          ctx.fill();

          ctx.fillStyle = '#C4956A';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(`✨ 福气 +${animFortune}`, 40, y + 30);
          y += 56;
        } else {
          y += 8;
        }

        // 8. 绘制分割线
        ctx.strokeStyle = '#EDE8E0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(24, y);
        ctx.lineTo(width - 24, y);
        ctx.stroke();
        y += 24;

        // 9. 绘制 AI 共鸣金句
        ctx.fillStyle = '#C4956A';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('💬 AI 共鸣', 24, y + 10);
        y += 28;

        // 金句背景
        const quoteHeight = 80;
        const quoteGradient = ctx.createLinearGradient(0, y, width, y);
        quoteGradient.addColorStop(0, 'rgba(196, 149, 106, 0.08)');
        quoteGradient.addColorStop(1, 'rgba(212, 167, 106, 0.05)');
        ctx.fillStyle = quoteGradient;
        roundRect(ctx, 24, y, width - 48, quoteHeight, 12);
        ctx.fill();

        // 左侧装饰条（暖金色）
        ctx.fillStyle = '#C4956A';
        ctx.fillRect(24, y, 4, quoteHeight);

        // 金句文字
        ctx.fillStyle = '#5C4D3C';
        ctx.font = 'italic 14px sans-serif';
        const quoteLines = wrapText(ctx, aiQuote, width - 72);
        let quoteY = y + 28;
        const maxQuoteLines = 3;
        for (let i = 0; i < Math.min(quoteLines.length, maxQuoteLines); i++) {
          ctx.fillText(quoteLines[i], 40, quoteY);
          quoteY += 22;
        }
        y += quoteHeight + 24;

        // 10. 绘制底部文案
        ctx.fillStyle = '#C4956A';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('这个温暖，也想分享给你 ✨', 24, y);
        y += 30;

        // 11. 绘制作者信息
        ctx.fillStyle = '#9E8E7E';
        ctx.font = '12px sans-serif';
        ctx.fillText(`来自：${authorName}`, 24, y + 6);

        // 12. 绘制底部 Logo 和扫码提示
        const footerY = height - 60;
        ctx.fillStyle = '#C4956A';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('好事发生', 24, footerY);

        ctx.fillStyle = '#9E8E7E';
        ctx.font = '11px sans-serif';
        ctx.fillText('扫码查看完整善行', width - 130, footerY);

        // 绘制简易二维码占位（实际场景应调用接口生成）
        ctx.fillStyle = '#2C2419';
        ctx.fillRect(width - 60, footerY - 30, 40, 40);
        ctx.fillStyle = '#FFFCF8';
        ctx.fillRect(width - 56, footerY - 26, 8, 8);
        ctx.fillRect(width - 44, footerY - 26, 8, 8);
        ctx.fillRect(width - 32, footerY - 26, 8, 8);
        ctx.fillRect(width - 56, footerY - 14, 8, 8);
        ctx.fillRect(width - 32, footerY - 14, 8, 8);
        ctx.fillRect(width - 56, footerY - 2, 8, 8);
        ctx.fillRect(width - 44, footerY - 2, 8, 8);
        ctx.fillRect(width - 32, footerY - 2, 8, 8);

        // 13. 导出图片
        Taro.canvasToTempFilePath({
          canvas: canvas,
          success: (res) => {
            setPosterPath(res.tempFilePath);
            setLoading(false);
          },
          fail: (err) => {
            console.error('[SharePoster] canvasToTempFilePath failed:', err);
            setLoading(false);
            Taro.showToast({ title: '海报生成失败', icon: 'none' });
          },
        }, { canvas: canvas });
      });
  };

  // 文字换行工具
  const wrapText = (ctx: any, text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    let current = '';
    for (const char of text) {
      const test = current + char;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = char;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  // 圆角矩形工具
  const roundRect = (ctx: any, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  // 保存到相册
  const handleSaveToAlbum = () => {
    if (!posterPath) {
      Taro.showToast({ title: '海报生成中，请稍候', icon: 'none' });
      return;
    }
    Taro.saveImageToPhotosAlbum({
      filePath: posterPath,
      success: () => {
        Taro.showToast({ title: '已保存到相册', icon: 'success' });
      },
      fail: (err) => {
        console.error('[SharePoster] Save to album failed:', err);
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          Taro.showModal({
            title: '提示',
            content: '需要相册权限才能保存图片，请在设置中开启',
            showCancel: false,
          });
        } else {
          Taro.showToast({ title: '保存失败', icon: 'none' });
        }
      },
    });
  };

  // 分享给微信好友
  const handleShareFriend = () => {
    if (!posterPath) {
      Taro.showToast({ title: '海报生成中，请稍候', icon: 'none' });
      return;
    }
    // 微信小程序：通过 showShareMenu 或直接复制图片
    Taro.setClipboardData({
      data: `${content}\n\n——来自「好事发生」\n这个温暖，也想分享给你 ✨`,
      success: () => {
        Taro.showToast({ title: '文案已复制，去微信分享吧', icon: 'none', duration: 2000 });
      },
    });
  };

  // 分享到朋友圈
  const handleShareTimeline = () => {
    if (!posterPath) {
      Taro.showToast({ title: '海报生成中，请稍候', icon: 'none' });
      return;
    }
    Taro.setClipboardData({
      data: `${content}\n\n${aiQuote}\n\n——来自「好事发生」\n这个温暖，也想分享给你 ✨`,
      success: () => {
        Taro.showToast({ title: '文案已复制，去朋友圈分享吧', icon: 'none', duration: 2000 });
      },
    });
  };

  if (!visible) return null;

  return (
    <View className={styles.mask} catchMove>
      <View className={styles.closeBtn} onClick={onClose}>
        <Text className={styles.closeIcon}>✕</Text>
      </View>
      <View className={styles.container}>
        {/* Canvas 海报 */}
        <View className={styles.canvasWrap} style={{ display: loading ? 'none' : 'block' }}>
          <Canvas
            type="2d"
            id={canvasId}
            className={styles.posterCanvas}
          />
        </View>
        {loading && (
          <View className={styles.loading}>
            <View className={styles.loadingAnimation}>
              <View className={styles.loadingDot} />
              <View className={styles.loadingDot} />
              <View className={styles.loadingDot} />
            </View>
            <Text className={styles.loadingText}>海报生成中...</Text>
          </View>
        )}

        {/* 分享渠道 */}
        <View className={styles.shareActions}>
          <View className={styles.shareBtn} onClick={handleSaveToAlbum}>
            <View className={`${styles.shareIcon} ${styles.shareIconAlbum}`}>
              <Text>💾</Text>
            </View>
            <Text className={styles.shareText}>保存相册</Text>
          </View>
          <View className={styles.shareBtn} onClick={handleShareFriend}>
            <View className={`${styles.shareIcon} ${styles.shareIconFriend}`}>
              <Text>💬</Text>
            </View>
            <Text className={styles.shareText}>微信好友</Text>
          </View>
          <View className={styles.shareBtn} onClick={handleShareTimeline}>
            <View className={`${styles.shareIcon} ${styles.shareIconTimeline}`}>
              <Text>📢</Text>
            </View>
            <Text className={styles.shareText}>朋友圈</Text>
          </View>
        </View>

        <Text className={styles.tip}>扫码可跳转到该善行的完整查看页（需登录）</Text>
      </View>
    </View>
  );
};

export default SharePoster;