import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface XPProgressBarProps {
  level: number;
  levelName: string;
  xpInCurrentLevel: number;
  xpToNextLevel: number;
  xpPercentage: number;
  showDetails?: boolean;
  compact?: boolean;
}

const XPProgressBar: React.FC<XPProgressBarProps> = ({
  level,
  levelName,
  xpInCurrentLevel,
  xpToNextLevel,
  xpPercentage,
  showDetails = true,
  compact = false
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    // Animazione progressiva della barra
    const timer = setTimeout(() => {
      setAnimatedPercentage(xpPercentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [xpPercentage]);

  // Colori basati sul livello
  const getLevelColor = () => {
    if (level < 5) return 'from-blue-500 to-cyan-500';
    if (level < 10) return 'from-green-500 to-emerald-500';
    if (level < 20) return 'from-purple-500 to-pink-500';
    if (level < 30) return 'from-orange-500 to-red-500';
    if (level < 50) return 'from-yellow-500 to-orange-500';
    return 'from-pink-500 to-purple-500';
  };

  const getLevelIcon = () => {
    if (level < 5) return '🌱';
    if (level < 10) return '📚';
    if (level < 20) return '🎓';
    if (level < 30) return '🏆';
    if (level < 50) return '👑';
    return '⚡';
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getLevelIcon()}</span>
          <div>
            <div className="text-sm font-bold text-white">Livello {level}</div>
            <div className="text-xs text-white/60">{levelName}</div>
          </div>
        </div>
        <div className="flex-1 min-w-[100px]">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${getLevelColor()}`}
              initial={{ width: 0 }}
              animate={{ width: `${animatedPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
        <span className="text-xs text-white/60 font-medium">{xpPercentage}%</span>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`text-4xl transform hover:scale-110 transition-transform duration-300`}>
            {getLevelIcon()}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Livello {level}</h3>
            <p className="text-white/70">{levelName}</p>
          </div>
        </div>
        
        {showDetails && (
          <div className="text-right">
            <p className="text-sm text-white/60">Prossimo livello</p>
            <p className="text-lg font-bold text-white">
              {xpInCurrentLevel} / {xpToNextLevel} XP
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${getLevelColor()} relative`}
            initial={{ width: 0 }}
            animate={{ width: `${animatedPercentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </motion.div>
        </div>
        
        {/* Percentage label */}
        <div className="absolute -top-1 right-0 transform translate-x-1/2">
          <motion.div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            {xpPercentage}%
          </motion.div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 flex justify-between text-sm text-white/60">
          <span>Continua così! 💪</span>
          <span>{xpToNextLevel - xpInCurrentLevel} XP al prossimo livello</span>
        </div>
      )}
    </div>
  );
};

export default XPProgressBar;

