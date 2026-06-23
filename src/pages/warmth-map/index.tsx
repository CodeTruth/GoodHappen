import React, { useState, useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import {
  getProvinceWarmthList,
  getWarmthLevelColor,
  ProvinceWarmth,
} from '@/data/warmthMap';
import { formatParticipantCount } from '@/data/warmthStats';
import styles from './index.module.scss';

const WarmthMapPage: React.FC = () => {
  const provinceList = useState(getProvinceWarmthList())[0];
  const [selectedProvince, setSelectedProvince] = useState<ProvinceWarmth | null>(null);

  // 构建地图网格（6列 x 5行）
  const mapGrid = useMemo(() => {
    // 创建 5x6 的网格
    const grid: (ProvinceWarmth | null)[][] = [];
    for (let row = 1; row <= 5; row++) {
      const rowData: (ProvinceWarmth | null)[] = [];
      for (let col = 1; col <= 6; col++) {
        const province = provinceList.find(
          (p) => p.gridArea.row === row && p.gridArea.col === col
        );
        rowData.push(province || null);
      }
      grid.push(rowData);
    }
    return grid;
  }, [provinceList]);

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString('zh-CN');
  };

  // 点击省份
  const handleProvinceClick = (province: ProvinceWarmth) => {
    setSelectedProvince(province);
  };

  // 关闭详情
  const handleCloseDetail = () => {
    setSelectedProvince(null);
  };

  // 判断文字颜色（浅色背景用深色文字）
  const isLightLevel = (level: number): boolean => {
    return level <= 2;
  };

  return (
    <View className={styles.container}>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>温暖地图</Text>
        <Text className={styles.headerGuide}>
          看看你的城市，今天谁在被温暖？
        </Text>
      </View>

      {/* 图例 */}
      <View className={styles.legend}>
        <Text className={styles.legendLabel}>温暖程度</Text>
        <View className={styles.legendBar}>
          <View
            className={styles.legendBlock}
            style={{ background: getWarmthLevelColor(1) }}
          />
          <View
            className={styles.legendBlock}
            style={{ background: getWarmthLevelColor(2) }}
          />
          <View
            className={styles.legendBlock}
            style={{ background: getWarmthLevelColor(3) }}
          />
          <View
            className={styles.legendBlock}
            style={{ background: getWarmthLevelColor(4) }}
          />
          <View
            className={styles.legendBlock}
            style={{ background: getWarmthLevelColor(5) }}
          />
        </View>
        <Text className={styles.legendLabel}>由浅到深</Text>
      </View>

      {/* 地图网格 */}
      <View className={styles.mapSection}>
        <View className={styles.mapGrid}>
          {mapGrid.map((row, rowIndex) =>
            row.map((province, colIndex) => {
              if (!province) {
                return (
                  <View
                    key={`${rowIndex}-${colIndex}`}
                    className={styles.emptyBlock}
                  />
                );
              }
              const isLight = isLightLevel(province.warmthLevel);
              return (
                <View
                  key={`${rowIndex}-${colIndex}`}
                  className={classnames(
                    styles.provinceBlock,
                    styles[`level${province.warmthLevel}`]
                  )}
                  onClick={() => handleProvinceClick(province)}
                >
                  <Text
                    className={classnames(
                      styles.provinceShort,
                      isLight && styles.textDark
                    )}
                  >
                    {province.shortName}
                  </Text>
                  <Text
                    className={classnames(
                      styles.provinceFortune,
                      isLight && styles.textDarkSmall
                    )}
                  >
                    {formatNumber(province.monthlyFortune)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* 地图说明 */}
      <View className={styles.mapNote}>
        <Text className={styles.mapNoteText}>
          点击省份查看温暖详情{'\n'}
          颜色越深，代表该区域本月温暖值越高
        </Text>
      </View>

      {/* 省份详情弹窗 */}
      {selectedProvince && (
        <View className={styles.detailMask} onClick={handleCloseDetail}>
          <View
            className={styles.detailPanel}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 详情头部 */}
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>{selectedProvince.name}</Text>
              <Text className={styles.detailClose} onClick={handleCloseDetail}>
                ✕
              </Text>
            </View>

            {/* 统计数据 */}
            <View className={styles.detailStats}>
              <View className={styles.detailStat}>
                <Text className={styles.detailStatValue}>
                  {formatParticipantCount(selectedProvince.participantCount)}
                </Text>
                <Text className={styles.detailStatLabel}>参与人数</Text>
              </View>
              <View className={styles.detailStat}>
                <Text className={styles.detailStatValue}>
                  {selectedProvince.kindnessCount}
                </Text>
                <Text className={styles.detailStatLabel}>善行数量</Text>
              </View>
              <View className={styles.detailStat}>
                <Text className={styles.detailStatValue}>
                  {formatNumber(selectedProvince.monthlyFortune)}
                </Text>
                <Text className={styles.detailStatLabel}>本月温暖值</Text>
              </View>
            </View>

            {/* 善行类型分布 */}
            <View className={styles.detailSection}>
              <Text className={styles.detailSectionTitle}>善行类型分布</Text>
              {selectedProvince.typeDistribution.map((item) => (
                <View key={item.type} className={styles.typeItem}>
                  <Text className={styles.typeName}>{item.type}</Text>
                  <View className={styles.typeBarWrap}>
                    <View
                      className={styles.typeBar}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </View>
                  <Text className={styles.typePercent}>{item.percentage}%</Text>
                </View>
              ))}
            </View>

            {/* 本区域温暖故事 */}
            <View className={styles.detailSection}>
              <Text className={styles.detailSectionTitle}>本区域温暖故事</Text>
              {selectedProvince.stories.length > 0 ? (
                selectedProvince.stories.map((story) => (
                  <View key={story.id} className={styles.storyItem}>
                    <Text className={styles.storyItemTitle}>{story.title}</Text>
                    <Text className={styles.storyItemSummary}>
                      {story.summary}
                    </Text>
                  </View>
                ))
              ) : (
                <View className={styles.noStory}>
                  <Text className={styles.noStoryText}>
                    这个区域的故事正在收集
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default WarmthMapPage;
