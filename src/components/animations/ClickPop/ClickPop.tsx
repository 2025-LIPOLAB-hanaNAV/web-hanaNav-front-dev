import React from 'react';
import { motion } from 'framer-motion';
import { useRipple } from '../../../hooks/useRipple';
import { useMotion, SPRING_CONFIGS } from '../../../hooks/useMotion';
import { cn } from '../../ui/utils';

export interface ClickPopProps {
  children: React.ReactNode;
  variant?: 'scale' | 'blur' | 'sparkle';
  intensity?: 'subtle' | 'normal' | 'strong';
  disabled?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
}

/**
 * 클릭 시 팝 효과를 제공하는 래퍼 컴포넌트
 * GPU 가속 및 성능 최적화 적용
 */
export function ClickPop({
  children,
  variant = 'scale',
  intensity = 'normal',
  disabled = false,
  className,
  onClick,
}: ClickPopProps) {
  const motion = useMotion({
    duration: 150,
    ease: SPRING_CONFIGS.snappy,
  });
  const { ripples, createRipple } = useRipple();

  const getIntensityConfig = () => {
    switch (intensity) {
      case 'subtle':
        return { scale: 0.98, blur: 0.2, shadow: 0.15 };
      case 'strong':
        return { scale: 0.92, blur: 0.8, shadow: 0.5 };
      default:
        return { scale: 0.95, blur: 0.5, shadow: 0.3 };
    }
  };

  const config = getIntensityConfig();

  const handleInteraction = (event: React.MouseEvent) => {
    if (disabled) return;
    
    if (variant === 'sparkle') {
      createRipple(event);
    }
    
    onClick?.(event);
  };

  const getVariantStyles = () => {
    if (motion.duration === 0 || disabled) return {};
    
    switch (variant) {
      case 'blur':
        return {
          filter: 'blur(var(--click-pop-blur-active))',
        };
      case 'sparkle':
        return {
          boxShadow: `var(--click-pop-shadow-active)`,
        };
      default:
        return {};
    }
  };

  return (
    <motion.div
      className={cn('motion-optimized cursor-pointer', className)}
      whileTap={
        motion.duration > 0 && !disabled
          ? {
              scale: config.scale,
              transition: { duration: motion.duration / 1000, ease: motion.ease },
              ...getVariantStyles(),
            }
          : undefined
      }
      onClick={handleInteraction}
      style={{
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
      
      {/* 스파클 리플 효과 */}
      {variant === 'sparkle' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-inherit">
          {ripples.map(ripple => (
            <motion.div
              key={ripple.id}
              className="absolute rounded-full bg-white/60"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: ripple.size,
                height: ripple.size,
              }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 0 }}
              transition={{
                duration: motion.duration / 1000 * 4,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}