import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';
import { useKindnessStore } from '@/store/kindness';
import { useInteractionStore } from '@/store/interaction';
import { useCircleStore } from '@/store/circle';
import {
  calculateCreditScore,
  getImprovementSuggestions,
  CREDIT_LEVELS,
  DIMENSION_MAX,
  DIMENSION_LABELS,
  DIMENSION_DESCRIPTIONS,
} from '@/utils/credit-score';
import type { CreditScoreDimensions } from '@/utils/credit-score';

import styles from './index.module.scss';

/** \u7ef4\u5ea6\u56fe\u6807\u5b57\u7b26\u5e8f\u5217\uff0c\u987a\u5e8f\u4e0e\u96f7\u8fbe\u56fe\u4e00\u81f4 */
const DIMENSION_KEYS: (keyof CreditScoreDimensions)[] = [
  'fortune',
  'consistency',
  'diversity',
  'witness',
  'challenge',
  'social',
];

/** \u7ef4\u5ea6\u56fe\u6807 emoji */
const DIMENSION_ICONS: Record<keyof CreditScoreDimensions, string> = {
  fortune: '\ud83c\udf1f',
  consistency: '\ud83d\udd25',
  diversity: '\ud83c\udf0d',
  witness: '\ud83d\udc41',
  challenge: '\ud83c\udfc6',
  social: '\ud83e\udd1d',
};

/** \u8d8b\u52bf\u56fe\u6807\u548c\u6587\u5b57 */
const TREND_MAP = {
  up: { icon: '\u2191', text: '\u4e0a\u5347\u4e2d' },
  stable: { icon: '\u2192', text: '\u4fdd\u6301\u7a33\u5b9a' },
  down: { icon: '\u2193', text: '\u9700\u52a0\u6cb9' },
} as const;

/** \u751f\u6210 SVG \u96f7\u8fbe\u56fe\u7684\u8def\u5f84\u70b9\u5b57\u7b26\u4e32 */
function buildRadarPoints(
  values: number[],
  maxValues: number[],
  cx: number,
  cy: number,
  maxR: number,
  n: number
): string {
  const points: string[] = [];
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2; // \u4ece\u9876\u90e8\u5f00\u59cb

  for (let i = 0; i < n; i++) {
    const ratio = Math.min(1, values[i] / maxValues[i]);
    const angle = startAngle + i * angleStep;
    const r = maxR * ratio;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

/** \u751f\u6210\u96f7\u8fbe\u56fe\u80cc\u666f\u7f51\u683c\u8def\u5f84 */
function buildGridPaths(
  levels: number[],
  cx: number,
  cy: number,
  maxR: number,
  n: number
): string[] {
  const paths: string[] = [];
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  for (const level of levels) {
    const r = maxR * level;
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    paths.push(pts.join(' '));
  }
  return paths;
}

/** \u751f\u6210\u8f74\u7ebf\u8def\u5f84 */
function buildAxisLines(
  cx: number,
  cy: number,
  maxR: number,
  n: number
): string[] {
  const lines: string[] = [];
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const x = cx + maxR * Math.cos(angle);
    const y = cy + maxR * Math.sin(angle);
    lines.push(`${cx},${cy} ${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return lines;
}

/** \u83b7\u53d6\u6807\u7b7e\u4f4d\u7f6e */
function getLabelPositions(
  cx: number,
  cy: number,
  maxR: number,
  n: number,
  labelR: number
): { x: number; y: number; anchor: string }[] {
  const positions: { x: number; y: number; anchor: string }[] = [];
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const x = cx + labelR * Math.cos(angle);
    const y = cy + labelR * Math.sin(angle);
    // \u6839\u636e\u89d2\u5ea6\u51b3\u5b9a\u6587\u672c\u951a\u70b9
    let anchor = 'middle';
    if (Math.abs(Math.cos(angle)) > 0.3) {
      anchor = Math.cos(angle) > 0 ? 'start' : 'end';
    }
    positions.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)), anchor });
  }
  return positions;
}

const CreditScorePage: React.FC = () => {
  const { totalFortune, streak, loadFromStorage } = useFortuneStore();
  const { publishedList, loadFromStorage: loadKindnessFromStorage } = useKindnessStore();
  const { comments, likes, loadFromStorage: loadInteractionFromStorage } = useInteractionStore();
  const { circles, loadFromStorage: loadCircleFromStorage } = useCircleStore();

  React.useEffect(() => {
    loadFromStorage();
    loadKindnessFromStorage();
    loadInteractionFromStorage();
    loadCircleFromStorage();
  }, []);

  const creditScore = useMemo(() => {
    // \u8ba1\u7b97\u4e0d\u540c\u6807\u7b7e\u6570
    const allTags = new Set<string>();
    publishedList.forEach((k) => {
      if (k.tags) {
        k.tags.forEach((t) => allTags.add(t));
      }
    });

    // \u89c1\u8bc1/\u88ab\u611f\u8c22\u6b21\u6570 (demo\u9636\u6bb5\u7528\u6a21\u62df\u6570\u636e)
    const witnessCount = publishedList.reduce((sum, k) => sum + (k.likes || 0), 0);

    // \u793e\u4ea4\u4e92\u52a8\u6b21\u6570 (demo\u9636\u6bb5\u7528\u6a21\u62df\u6570\u636e)
    let socialCount = 0;
    Object.values(comments).forEach((clist) => {
      socialCount += clist.length;
    });
    socialCount += circles.length * 3; // \u5708\u5b50\u53c2\u4e0e

    return calculateCreditScore({
      totalFortune,
      currentStreak: streak.currentStreak,
      uniqueTagCount: allTags.size,
      witnessCount,
      challengeCount: 0, // demo\u9636\u6bb5\u65e0\u6311\u6218\u6570\u636e
      socialCount,
    });
  }, [totalFortune, streak.currentStreak, publishedList, comments, circles]);

  const suggestions = useMemo(() => getImprovementSuggestions(creditScore), [creditScore]);

  // \u5706\u73af\u8fdb\u5ea6
  const ringRadius = 160;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - creditScore.total / 1000);

  // \u7b49\u7ea7\u914d\u7f6e
  const levelConfig = CREDIT_LEVELS.find((l) => l.level === creditScore.level) || CREDIT_LEVELS[4];

  // \u8d8b\u52bf
  const trendInfo = TREND_MAP[creditScore.trend];

  // \u96f7\u8fbe\u56fe\u53c2\u6570
  const svgSize = 520;
  const svgCx = svgSize / 2;
  const svgCy = svgSize / 2;
  const radarMaxR = 180;
  const labelR = radarMaxR + 36;
  const dimCount = DIMENSION_KEYS.length;
  const dimValues = DIMENSION_KEYS.map((k) => creditScore.dimensions[k]);
  const dimMaxValues = DIMENSION_KEYS.map((k) => DIMENSION_MAX[k]);

  const radarDataPoints = buildRadarPoints(dimValues, dimMaxValues, svgCx, svgCy, radarMaxR, dimCount);
  const gridPaths = buildGridPaths([0.25, 0.5, 0.75, 1], svgCx, svgCy, radarMaxR, dimCount);
  const axisLines = buildAxisLines(svgCx, svgCy, radarMaxR, dimCount);
  const labelPositions = getLabelPositions(svgCx, svgCy, radarMaxR, dimCount, labelR);

  // \u96f7\u8fbe\u56fe\u591a\u8fb9\u5f62\u9876\u70b9\u5750\u6807\uff08\u7528\u4e8e\u7ed8\u5236\u5706\u70b9\uff09
  const radarDots = useMemo(() => {
    const dots: { cx: number; cy: number }[] = [];
    const angleStep = (2 * Math.PI) / dimCount;
    const startAngle = -Math.PI / 2;
    for (let i = 0; i < dimCount; i++) {
      const ratio = Math.min(1, dimValues[i] / dimMaxValues[i]);
      const angle = startAngle + i * angleStep;
      const r = radarMaxR * ratio;
      dots.push({
        cx: parseFloat((svgCx + r * Math.cos(angle)).toFixed(2)),
        cy: parseFloat((svgCy + r * Math.sin(angle)).toFixed(2)),
      });
    }
    return dots;
  }, [dimValues, dimMaxValues]);

  return (
    <View className={styles.container}>
      {/* SVG \u6e10\u53d8\u5b9a\u4e49 */}
      <View style={{ height: 0, overflow: 'hidden' }}>
        <svg width="0" height="0">
          <defs>
            <linearGradient id="creditRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C4956A" />
              <stop offset="100%" stopColor="#E8C9A0" />
            </linearGradient>
            <linearGradient id="radarFillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C4956A" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#E8C9A0" stopOpacity="0.15" />
            </linearGradient>
          </defs>
        </svg>
      </View>

      {/* \u5706\u73af\u5206\u6570 */}
      <View className={styles.scoreSection}>
        <View className={styles.ringWrap}>
          <svg
            className={styles.scoreRing}
            width="400"
            height="400"
            viewBox="0 0 400 400"
          >
            <defs>
              <linearGradient id="creditRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C4956A" />
                <stop offset="100%" stopColor="#E8C9A0" />
              </linearGradient>
            </defs>
            <circle
              className={styles.ringBg}
              cx="200"
              cy="200"
              r={ringRadius}
            />
            <circle
              className={styles.ringProgress}
              cx="200"
              cy="200"
              r={ringRadius}
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
            />
          </svg>
          <View className={styles.scoreCenter}>
            <Text className={styles.scoreNumber}>{creditScore.total}</Text>
            <Text className={styles.scoreLevel}>{creditScore.level}</Text>
          </View>
        </View>

        {/* \u7b49\u7ea7\u4fe1\u606f */}
        <View className={styles.levelInfo}>
          <Text className={styles.levelIcon}>{creditScore.levelIcon}</Text>
          <Text className={styles.levelName}>{creditScore.levelName}</Text>
        </View>
        <Text className={styles.levelTitle}>{levelConfig.title}</Text>
        <View className={`${styles.trendTag} ${styles[creditScore.trend]}`}>
          <Text className={styles.trendIcon}>{trendInfo.icon}</Text>
          <Text>{trendInfo.text}</Text>
        </View>
      </View>

      {/* \u96f7\u8fbe\u56fe */}
      <View className={styles.radarSection}>
        <View className={styles.sectionTitle}>
          <Text className={styles.sectionTitleIcon}>{'\ud83c\udfaf'}</Text>
          <Text>{'\u7ef4\u5ea6\u5206\u6790'}</Text>
        </View>
        <View className={styles.radarWrap}>
          <svg
            className={styles.radarSvg}
            width={svgSize}
            height={svgSize}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
          >
            <defs>
              <linearGradient id="radarFillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C4956A" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#E8C9A0" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* \u80cc\u666f\u7f51\u683c */}
            {gridPaths.map((d, i) => (
              <polygon
                key={`grid-${i}`}
                points={d}
                fill="none"
                stroke="rgba(196,149,106,0.15)"
                strokeWidth="1"
              />
            ))}

            {/* \u8f74\u7ebf */}
            {axisLines.map((d, i) => (
              <line
                key={`axis-${i}`}
                x1={parseFloat(d.split(' ')[0])}
                y1={parseFloat(d.split(' ')[1])}
                x2={parseFloat(d.split(' ')[2])}
                y2={parseFloat(d.split(' ')[3])}
                stroke="rgba(196,149,106,0.2)"
                strokeWidth="1"
              />
            ))}

            {/* \u6570\u636e\u533a\u57df */}
            <polygon
              points={radarDataPoints}
              fill="url(#radarFillGradient)"
              stroke="#C4956A"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* \u6570\u636e\u70b9 */}
            {radarDots.map((dot, i) => (
              <circle
                key={`dot-${i}`}
                cx={dot.cx}
                cy={dot.cy}
                r="4"
                fill="#C4956A"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            ))}

            {/* \u6807\u7b7e */}
            {labelPositions.map((pos, i) => (
              <text
                key={`label-${i}`}
                x={pos.x}
                y={pos.y}
                textAnchor={pos.anchor}
                dominantBaseline="middle"
                fill="#5D4E37"
                fontSize="22"
                fontWeight="500"
              >
                {DIMENSION_LABELS[DIMENSION_KEYS[i]]}
              </text>
            ))}
          </svg>
        </View>
      </View>

      {/* \u7ef4\u5ea6\u8be6\u60c5\u5361\u7247 */}
      <View className={styles.dimensionsSection}>
        <View className={styles.sectionTitle}>
          <Text className={styles.sectionTitleIcon}>{'\ud83d\udcca'}</Text>
          <Text>{'\u5206\u9879\u8be6\u60c5'}</Text>
        </View>
        {DIMENSION_KEYS.map((key) => {
          const score = creditScore.dimensions[key];
          const max = DIMENSION_MAX[key];
          const percent = Math.round((score / max) * 100);
          return (
            <View key={key} className={styles.dimCard}>
              <View className={styles.dimIcon}>
                <Text>{DIMENSION_ICONS[key]}</Text>
              </View>
              <View className={styles.dimContent}>
                <View className={styles.dimHeader}>
                  <Text className={styles.dimLabel}>{DIMENSION_LABELS[key]}</Text>
                  <View style={{ display: 'flex', alignItems: 'baseline', gap: '4rpx' }}>
                    <Text className={styles.dimScore}>{score}</Text>
                    <Text className={styles.dimMax}>{`/${max}`}</Text>
                  </View>
                </View>
                <View className={styles.dimProgressBar}>
                  <View
                    className={styles.dimProgressFill}
                    style={{ width: `${percent}%` }}
                  />
                </View>
                <Text className={styles.dimDesc}>{DIMENSION_DESCRIPTIONS[key]}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* \u63d0\u5347\u5efa\u8bae */}
      <View className={styles.suggestionSection}>
        <View className={styles.suggestionHeader}>
          <Text className={styles.suggestionIcon}>{'\ud83d\udca1'}</Text>
          <Text className={styles.suggestionTitle}>{'\u63d0\u5347\u5efa\u8bae'}</Text>
        </View>
        {suggestions.map((text, i) => (
          <View key={i} className={styles.suggestionItem}>
            <View className={styles.suggestionDot} />
            <Text className={styles.suggestionText}>{text}</Text>
          </View>
        ))}
      </View>

      <View className={styles.bottomSpacer} />
    </View>
  );
};

export default CreditScorePage;