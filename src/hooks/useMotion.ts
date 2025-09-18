import { useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

export interface MotionConfig {
  duration?: number;
  ease?: string | number[];
  delay?: number;
  scale?: {
    start?: number;
    end?: number;
    rest?: number;
  };
}

/**
 * 접근성을 고려한 모션 설정 훅
 */
export function useMotion(config: MotionConfig = {}) {
  const shouldReduceMotion = useReducedMotion();
  
  return useMemo(() => {
    if (shouldReduceMotion) {
      return {
        duration: 0,
        ease: 'linear',
        delay: 0,
        scale: { start: 1, end: 1, rest: 1 },
      };
    }
    
    return {
      duration: config.duration ?? 220,
      ease: config.ease ?? 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
      delay: config.delay ?? 0,
      scale: {
        start: config.scale?.start ?? 0.95,
        end: config.scale?.end ?? 1.02,
        rest: config.scale?.rest ?? 1,
        ...config.scale,
      },
    };
  }, [shouldReduceMotion, config]);
}

export const SPRING_CONFIGS = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  smooth: { type: 'spring', stiffness: 300, damping: 25 },
  bouncy: { type: 'spring', stiffness: 200, damping: 15 },
  gentle: { type: 'spring', stiffness: 100, damping: 20 },
} as const;