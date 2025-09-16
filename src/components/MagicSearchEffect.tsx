import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from './ui/utils';

interface MagicSearchEffectProps {
  isActive: boolean;
  onComplete: () => void;
  query: string;
  className?: string;
}

export function MagicSearchEffect({ 
  isActive, 
  onComplete, 
  query,
  className 
}: MagicSearchEffectProps) {
  const [phase, setPhase] = useState<'initial' | 'searching' | 'portal' | 'complete'>('initial');

  useEffect(() => {
    if (!isActive) {
      setPhase('initial');
      return;
    }

    const timeline = [
      { phase: 'searching', delay: 100 },
      { phase: 'portal', delay: 2000 },
      { phase: 'complete', delay: 3500 }
    ] as const;

    timeline.forEach(({ phase: nextPhase, delay }) => {
      setTimeout(() => {
        setPhase(nextPhase);
        if (nextPhase === 'complete') {
          setTimeout(onComplete, 500);
        }
      }, delay);
    });
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <motion.div
      className={cn(
        "fixed inset-0 z-50 pointer-events-none",
        "bg-gradient-to-br from-primary/20 via-accent/10 to-primary/30",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background Magic Glow */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
            'radial-gradient(circle at 30% 70%, rgba(99, 102, 241, 0.4) 0%, transparent 70%)',
            'radial-gradient(circle at 70% 30%, rgba(139, 92, 246, 0.5) 0%, transparent 70%)',
            'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.3) 0%, transparent 70%)'
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-primary to-accent rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0.3, 1, 0.3],
              scale: [0.5, 1.2, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Central Magic Circle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          {/* Outer Ring */}
          <motion.div
            className="w-32 h-32 border-4 border-primary/30 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Middle Ring */}
          <motion.div
            className="absolute inset-4 border-2 border-accent/50 rounded-full"
            animate={{ 
              rotate: -360,
              scale: [0.8, 1.1, 0.8] 
            }}
            transition={{ 
              rotate: { duration: 3, repeat: Infinity, ease: "linear" },
              scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
            }}
          />
          
          {/* Inner Glow */}
          <motion.div
            className="absolute inset-8 bg-gradient-to-r from-primary to-accent rounded-full"
            animate={{ 
              opacity: [0.4, 1, 0.4],
              scale: [0.9, 1.1, 0.9]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      {/* Mystical Text Display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="text-center mt-48"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          {phase === 'searching' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <motion.h3 
                className="font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
                animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ backgroundSize: '200% 100%' }}
              >
                "{query}" 탐색 중...
              </motion.h3>
              <motion.div className="flex justify-center space-x-1">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {phase === 'portal' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <h3 className="font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                길을 찾았습니다!
              </h3>
              <motion.div
                className="w-16 h-1 bg-gradient-to-r from-primary to-accent mx-auto rounded-full"
                animate={{ scaleX: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
          )}

          {phase === 'complete' && (
            <motion.div
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="space-y-4"
            >
              <motion.h3 
                className="font-bold text-primary"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5 }}
              >
                여행을 시작합니다 ✨
              </motion.h3>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Sparkle Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute text-xl"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          >
            ✨
          </motion.div>
        ))}
      </div>

      {/* Portal Vortex Effect (during portal phase) */}
      {phase === 'portal' && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`vortex-${i}`}
              className="absolute border-2 border-primary/20 rounded-full"
              style={{
                width: `${(i + 1) * 40}px`,
                height: `${(i + 1) * 40}px`,
              }}
              animate={{
                rotate: i % 2 === 0 ? 360 : -360,
                scale: [1, 0.8, 1],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                rotate: { duration: 2 - i * 0.2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}