import React, { useState, useEffect } from 'react';
import { View, Text, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

// ============================================
// Phase 10 - I2 温暖海报分享组件
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
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [posterPath, setPosterPath] = useState('');
  const canvasId = 'sharePosterCanvas';

  // 生成海报
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setPosterPath('');
    // 延迟一帧确保 Canvas 已渲染
    setTimeout(() => {
      drawPoster();
    }, 100);
  }, [visible]);

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

        // 1. 绘制背景渐变
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, '#FFF5F5');
        bgGradient.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // 2. 绘制顶部装饰条
        const topGradient = ctx.createLinearGradient(0, 0, width, 0);
        topGradient.addColorStop(0, '#FF6B6B');
        topGradient.addColorStop(1, '#FFA07A');
        ctx.fillStyle = topGradient;
        ctx.fillRect(0, 0, width, 12);

        // 3. 绘制平台 Logo 区域
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('🌟 好事发生', 24, 50);
        ctx.fillStyle = '#999999';
        ctx.font = '12px sans-serif';
        ctx.fillText('记录生活中的温暖瞬间', 24, 72);

        // 4. 绘制善行内容摘要
        ctx.fillStyle = '#1A1A1A';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('今日善行', 24, 120);

        // 内容文字（自动换行）
        ctx.fillStyle = '#333333';
        ctx.font = '15px sans-serif';
        const contentLines = wrapText(ctx, content, width - 48);
        let y = 150;
        const maxContentLines = 4;
        for (let i = 0; i < Math.min(contentLines.length, maxContentLines); i++) {
          ctx.fillText(contentLines[i], 24, y);
          y += 24;
        }
        if (contentLines.length > maxContentLines) {
          ctx.fillStyle = '#999999';
          ctx.fillText('...', 24, y);
          y += 24;
        }

        // 5. 绘制标签
        if (tag) {
          ctx.fillStyle = '#FFE8E8';
          const tagWidth = ctx.measureText(tag).width + 24;
          roundRect(ctx, 24, y + 8, tagWidth, 28, 14);
          ctx.fill();
          ctx.fillStyle = '#FF6B6B';
          ctx.font = '12px sans-serif';
          ctx.fillText(tag, 36, y + 27);
          y += 50;
        } else {
          y += 20;
        }

        // 6. 绘制分割线
        ctx.strokeStyle = '#FFE8E8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(24, y);
        ctx.lineTo(width - 24, y);
        ctx.stroke();
        y += 30;

        // 7. 绘制 AI 共鸣金句
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('✨ AI 共鸣', 24, y);
        y += 28;

        // 金句背景
        const quoteHeight = 80;
        const quoteGradient = ctx.createLinearGradient(0, y, width, y);
        quoteGradient.addColorStop(0, 'rgba(255, 107, 107, 0.08)');
        quoteGradient.addColorStop(1, 'rgba(255, 160, 122, 0.08)');
        ctx.fillStyle = quoteGradient;
        roundRect(ctx, 24, y, width - 48, quoteHeight, 12);
        ctx.fill();

        // 左侧装饰条
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(24, y, 4, quoteHeight);

        // 金句文字
        ctx.fillStyle = '#666666';
        ctx.font = 'italic 14px sans-serif';
        const quoteLines = wrapText(ctx, aiQuote, width - 72);
        let quoteY = y + 28;
        const maxQuoteLines = 3;
        for (let i = 0; i < Math.min(quoteLines.length, maxQuoteLines); i++) {
          ctx.fillText(quoteLines[i], 40, quoteY);
          quoteY += 22;
        }
        y += quoteHeight + 30;

        // 8. 绘制底部文案
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('这个温暖，也想分享给你 ✨', 24, y);
        y += 30;

        // 9. 绘制作者信息
        ctx.fillStyle = '#999999';
        ctx.font = '12px sans-serif';
        ctx.fillText(`来自：${authorName}`, 24, y);
        y += 24;

        // 10. 绘制底部 Logo 和扫码提示
        const footerY = height - 60;
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('好事发生', 24, footerY);

        ctx.fillStyle = '#999999';
        ctx.font = '11px sans-serif';
        ctx.fillText('扫码查看完整善行', width - 130, footerY);

        // 绘制简易二维码占位（实际场景应调用接口生成）
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(width - 60, footerY - 30, 40, 40);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(width - 56, footerY - 26, 8, 8);
        ctx.fillRect(width - 44, footerY - 26, 8, 8);
        ctx.fillRect(width - 32, footerY - 26, 8, 8);
        ctx.fillRect(width - 56, footerY - 14, 8, 8);
        ctx.fillRect(width - 32, footerY - 14, 8, 8);
        ctx.fillRect(width - 56, footerY - 2, 8, 8);
        ctx.fillRect(width - 44, footerY - 2, 8, 8);
        ctx.fillRect(width - 32, footerY - 2, 8, 8);

        // 11. 导出图片
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
