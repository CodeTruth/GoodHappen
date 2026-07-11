import React from 'react';
import { View, Text } from '@tarojs/components';

interface MdProps {
  content: string;
  className?: string;
}

/**
 * Lightweight Markdown renderer for chat messages.
 * Supports: **bold**, \n line breaks, · bullet points, numbered lists, ━━ dividers
 */
export default function MdText({ content, className }: MdProps) {
  const nodes = parseMd(content);
  return <View className={className}>{nodes}</View>;
}

function parseMd(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // divider
    if (/^━{3,}$/.test(line.trim())) {
      result.push(
        <View key={i} style={{ height: 1, backgroundColor: '#E5E7EB', margin: '16rpx 0' }} />
      );
      i++;
      continue;
    }

    // empty line → spacer
    if (line.trim() === '') {
      result.push(<View key={i} style={{ height: '12rpx' }} />);
      i++;
      continue;
    }

    // bullet point: · xxx or - xxx
    if (/^[\s]*[·\-\*]\s+/.test(line)) {
      const text = line.replace(/^[\s]*[·\-\*]\s+/, '');
      result.push(
        <View key={i} style={{ flexDirection: 'row', marginVertical: '4rpx' }}>
          <Text style={{ marginRight: '8rpx' }}>·</Text>
          <InlineText text={text} />
        </View>
      );
      i++;
      continue;
    }

    // numbered list: 1. xxx
    const numMatch = line.match(/^[\s]*(\d+)\.\s+(.*)/);
    if (numMatch) {
      result.push(
        <View key={i} style={{ flexDirection: 'row', marginVertical: '4rpx' }}>
          <Text style={{ marginRight: '8rpx' }}>{numMatch[1]}.</Text>
          <InlineText text={numMatch[2]} />
        </View>
      );
      i++;
      continue;
    }

    // heading: ### xxx or ## xxx (rendered as bold with top margin)
    const headMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headMatch) {
      result.push(
        <Text key={i} style={{ fontWeight: '600', fontSize: '30rpx', marginTop: '12rpx', marginBottom: '8rpx' }}>
          {headMatch[2]}
        </Text>
      );
      i++;
      continue;
    }

    // normal paragraph
    result.push(
      <InlineText key={i} text={line} isParagraph />
    );
    i++;
  }

  return result;
}

/** Renders inline text with **bold** support */
function InlineText({ text, isParagraph }: { text: string; isParagraph?: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const nodes: React.ReactNode[] = parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={idx} style={{ fontWeight: '600' }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={idx}>{part}</Text>;
  });

  if (isParagraph) {
    return <Text style={{ lineHeight: 1.7 }}>{nodes}</Text>;
  }
  return <>{nodes}</>;
}