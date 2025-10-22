import React from 'react';
import { motion } from 'framer-motion';

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  compact?: boolean;
}

const StreakCounter: React.FC<StreakCounterProps> = ({ 
  currentStreak, 
  longestStreak,
  compact = false 
}) => {
  const getFlameSize = (streak: number) => {
    if (streak >= 30) return 'text-6xl';
    if (streak >= 14) return 'text-5xl';
    if (streak >= 7) return 'text-4xl';
    return 'text-3xl';
  };

  const getFlameColor = (streak: number) => {
    if (streak >= 30) return 'from-orange-500 via-red-500 to-pink-500';
    if (streak >= 14) return 'from-yellow-500 via-orange-500 to-red-500';
    if (streak >= 7) return 'from-yellow-400 to-orange-500';
    return 'from-orange-400 to-red-400';
  };

  const getMotivationalMessage = (streak: number) => {
    if (streak === 0) return "Inizia oggi la tua streak! 💪";
    if (streak < 3) return "Ottimo inizio! Continua così! 🌟";
    if (streak < 7) return "Stai andando alla grande! 🚀";
    if (streak < 14) return "Incredibile! Una settimana di fila! 🔥";
    if (streak < 30) return "Sei inarrestabile! 💪";
    return "LEGGENDARIO! Sei un campione! 👑";
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3 bg-white/5 rounded-xl p-3 border border-white/10">
        <motion.div
          animate={{ 
            scale: currentStreak > 0 ? [1, 1.2, 1] : 1,
          }}
          transition={{ 
            duration: 0.5,
            repeat: currentStreak > 0 ? Infinity : 0,
            repeatDelay: 2
          }}
          className="text-3xl"
        >
          🔥
        </motion.div>
        <div>
          <p className="text-white font-bold text-lg">{currentStreak} giorni</p>
          <p className="text-white/60 text-xs">Streak attuale</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 overflow-hidden relative">
      {/* Background animated gradient */}
      {currentStreak > 0 && (
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${getFlameColor(currentStreak)} opacity-10`}
          animate={{ 
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      <div className="relative z-10">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <span className="mr-2">🔥</span>
          Streak di Studio
        </h3>

        <div className="flex items-center justify-between mb-6">
          {/* Current Streak */}
          <div className="text-center">
            <motion.div
              animate={{ 
                scale: currentStreak > 0 ? [1, 1.1, 1] : 1,
                rotate: currentStreak > 0 ? [0, 5, -5, 0] : 0
              }}
              transition={{ 
                duration: 0.8,
                repeat: currentStreak > 0 ? Infinity : 0,
                repeatDelay: 2
              }}
              className={getFlameSize(currentStreak)}
            >
              🔥
            </motion.div>
            <motion.p
              className="text-5xl font-bold text-white mt-2"
              key={currentStreak}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring" }}
            >
              {currentStreak}
            </motion.p>
            <p className="text-white/70 text-sm mt-1">Giorni Consecutivi</p>
          </div>

          {/* Longest Streak */}
          <div className="text-center">
            <div className="text-3xl">👑</div>
            <p className="text-3xl font-bold text-white mt-2">{longestStreak}</p>
            <p className="text-white/70 text-sm mt-1">Record Personale</p>
          </div>
        </div>

        {/* Motivational Message */}
        <motion.div
          className={`bg-gradient-to-r ${getFlameColor(currentStreak)} rounded-xl p-4 text-center`}
          animate={{ 
            boxShadow: currentStreak > 0 ? [
              '0 0 20px rgba(251, 146, 60, 0.3)',
              '0 0 40px rgba(251, 146, 60, 0.5)',
              '0 0 20px rgba(251, 146, 60, 0.3)'
            ] : 'none'
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-white font-bold text-sm">
            {getMotivationalMessage(currentStreak)}
          </p>
        </motion.div>

        {/* Streak Milestones */}
        <div className="mt-4 flex justify-around text-center">
          {[7, 14, 30].map((milestone) => (
            <div key={milestone} className="relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentStreak >= milestone 
                  ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-orange-500/50' 
                  : 'bg-white/10'
              }`}>
                <span className="text-xl">{currentStreak >= milestone ? '✓' : '🔒'}</span>
              </div>
              <p className="text-white/60 text-xs mt-1">{milestone}d</p>
              
              {/* Achievement indicator */}
              {currentStreak >= milestone && (
                <motion.div
                  className="absolute -top-1 -right-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-sm">⭐</span>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StreakCounter;

