import React from 'react';
import { motion } from 'framer-motion';

interface Badge {
  name: string;
  description: string;
  icon: string;
  rarity: string;
  earned: boolean;
}

interface BadgeDisplayProps {
  badges: string[];
  allBadges?: any[];
  compact?: boolean;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badges, allBadges, compact = false }) => {
  const getBadgeInfo = (badgeName: string) => {
    const badgeData = allBadges?.find(b => b.name === badgeName);
    return badgeData || { icon: '🏅', description: badgeName, rarity: 'common' };
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-500 via-orange-500 to-red-500';
      case 'epic': return 'from-purple-500 to-pink-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'shadow-2xl shadow-yellow-500/50';
      case 'epic': return 'shadow-xl shadow-purple-500/50';
      case 'rare': return 'shadow-lg shadow-blue-500/50';
      default: return 'shadow-md shadow-gray-500/30';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {badges.slice(0, 5).map((badgeName, idx) => {
          const badge = getBadgeInfo(badgeName);
          return (
            <motion.div
              key={badgeName}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: idx * 0.1, type: "spring" }}
              className="relative group"
            >
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRarityColor(badge.rarity)} flex items-center justify-center ${getRarityGlow(badge.rarity)} transform group-hover:scale-110 transition-all duration-300`}>
                <span className="text-xl">{badge.icon}</span>
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                  {badge.description}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {badges.length > 5 && (
          <div className="text-sm text-white/60 font-medium">
            +{badges.length - 5}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <span className="mr-2">🏆</span>
        Badge Ottenuti ({badges.length})
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {badges.map((badgeName, idx) => {
          const badge = getBadgeInfo(badgeName);
          return (
            <motion.div
              key={badgeName}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: idx * 0.1, type: "spring" }}
              className="group relative"
            >
              <div className={`bg-gradient-to-br ${getRarityColor(badge.rarity)} rounded-xl p-4 ${getRarityGlow(badge.rarity)} transform group-hover:scale-105 transition-all duration-300 cursor-pointer`}>
                <div className="text-center">
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <p className="text-white text-xs font-medium">{badge.description}</p>
                  <p className="text-white/60 text-xs mt-1 capitalize">{badge.rarity}</p>
                </div>
                
                {/* Sparkle effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute top-2 right-2 text-yellow-300 animate-pulse">✨</div>
                  <div className="absolute bottom-2 left-2 text-yellow-300 animate-pulse" style={{ animationDelay: '0.2s' }}>✨</div>
                </div>
              </div>
            </motion.div>
          );
        })}
        
        {badges.length === 0 && (
          <div className="col-span-full text-center py-8">
            <div className="text-6xl mb-4 opacity-50">🏅</div>
            <p className="text-white/50">Nessun badge ancora...</p>
            <p className="text-white/40 text-sm mt-2">Completa lezioni per guadagnare badge!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeDisplay;

