import React from 'react';
import { motion } from 'framer-motion';

interface Goal {
  id: number;
  goal_type: string;
  current_value: number;
  target_value: number;
  percentage: number;
  period: string;
  is_completed: boolean;
}

interface GoalsWidgetProps {
  goals: Goal[];
  onCreateGoal?: () => void;
}

const GoalsWidget: React.FC<GoalsWidgetProps> = ({ goals, onCreateGoal }) => {
  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'weekly_hours': return '⏰';
      case 'lessons_count': return '📚';
      case 'assignments': return '📝';
      case 'streak': return '🔥';
      default: return '🎯';
    }
  };

  const getGoalLabel = (goalType: string) => {
    switch (goalType) {
      case 'weekly_hours': return 'Ore di Studio';
      case 'lessons_count': return 'Lezioni';
      case 'assignments': return 'Compiti';
      case 'streak': return 'Giorni Consecutivi';
      default: return goalType;
    }
  };

  const getGoalColor = (percentage: number) => {
    if (percentage >= 100) return 'from-green-500 to-emerald-500';
    if (percentage >= 75) return 'from-blue-500 to-cyan-500';
    if (percentage >= 50) return 'from-yellow-500 to-orange-500';
    return 'from-gray-500 to-gray-600';
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">🎯</span>
          I Tuoi Obiettivi
        </h3>
        {onCreateGoal && (
          <button
            onClick={onCreateGoal}
            className="text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105"
          >
            + Nuovo
          </button>
        )}
      </div>

      <div className="space-y-4">
        {goals.map((goal, idx) => (
          <motion.div
            key={goal.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/30 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getGoalIcon(goal.goal_type)}</span>
                <div>
                  <p className="text-white font-medium">{getGoalLabel(goal.goal_type)}</p>
                  <p className="text-white/60 text-xs capitalize">{goal.period}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">
                  {goal.current_value} / {goal.target_value}
                </p>
                {goal.is_completed && (
                  <span className="text-green-400 text-xs">✓ Completato!</span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${getGoalColor(goal.percentage)} relative`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(goal.percentage, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
              >
                {/* Animated shine */}
                {goal.percentage < 100 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                )}
              </motion.div>
              
              {/* Celebration effect when completed */}
              {goal.percentage >= 100 && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-green-400/50 to-emerald-400/50"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>

            {/* Percentage text */}
            <div className="mt-2 text-right">
              <span className={`text-xs font-bold ${
                goal.percentage >= 100 ? 'text-green-400' :
                goal.percentage >= 75 ? 'text-cyan-400' :
                goal.percentage >= 50 ? 'text-yellow-400' :
                'text-white/60'
              }`}>
                {goal.percentage}%
              </span>
            </div>
          </motion.div>
        ))}

        {goals.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4 opacity-50">🎯</div>
            <p className="text-white/50 mb-2">Nessun obiettivo attivo</p>
            <p className="text-white/40 text-sm">Imposta un obiettivo per monitorare i tuoi progressi!</p>
            {onCreateGoal && (
              <button
                onClick={onCreateGoal}
                className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105"
              >
                Crea il tuo primo obiettivo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsWidget;

