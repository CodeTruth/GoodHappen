import React, { useState, useEffect, useRef } from 'react';
import { Text } from '@tarojs/components';

interface AnimatedNumberProps {
  value: number;
  duration?: number;   // 动画持续毫秒
  suffix?: string;     // 后缀（如 "次"、"人"、"kg"）
  className?: string;
  formatter?: (v: number) => string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1200,
  suffix = '',
  className,
  formatter,
}) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // 取消之前的动画
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    fromRef.current = display;
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(fromRef.current + (value - fromRef.current) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const text = formatter ? formatter(display) : String(display);
  return (
    <Text className={className}>
      {text}{suffix}
    </Text>
  );
};

export default AnimatedNumber;