import { useState, useCallback, useRef } from 'react';
import { useMotion } from './useMotion';

export interface RippleEffect {
  id: string;
  x: number;
  y: number;
  size: number;
}

/**
 * 클릭 리플 효과 훅
 * 성능 최적화: transform 기반, GPU 가속
 */
export function useRipple() {
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const motion = useMotion({ duration: 600 });
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple: RippleEffect = {
      id: `ripple_${Date.now()}_${Math.random()}`,
      x,
      y,
      size,
    };

    setRipples(prev => [...prev, ripple]);

    // 성능 최적화: 애니메이션 완료 후 DOM에서 제거
    const timeoutId = setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id));
      timeoutRefs.current.delete(ripple.id);
    }, motion.duration + 100);
    
    timeoutRefs.current.set(ripple.id, timeoutId);
  }, [motion.duration]);

  const clearRipples = useCallback(() => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
    setRipples([]);
  }, []);

  return {
    ripples,
    createRipple,
    clearRipples,
    motionConfig: motion,
  };
}