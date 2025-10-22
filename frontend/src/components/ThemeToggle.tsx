import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, colorScheme, setTheme, setColorScheme, isDark } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const themes = [
    { value: 'light' as const, icon: '☀️', label: 'Chiaro' },
    { value: 'dark' as const, icon: '🌙', label: 'Scuro' },
    { value: 'auto' as const, icon: '🌓', label: 'Auto' }
  ];

  const colorSchemes = [
    { value: 'blue' as const, color: 'from-blue-500 to-cyan-500', label: 'Blu' },
    { value: 'purple' as const, color: 'from-purple-500 to-pink-500', label: 'Viola' },
    { value: 'green' as const, color: 'from-green-500 to-emerald-500', label: 'Verde' },
    { value: 'orange' as const, color: 'from-orange-500 to-red-500', label: 'Arancione' }
  ];

  return (
    <div className="relative z-[9999]">
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowMenu(!showMenu)}
        className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300 relative z-[9999]"
      >
        <span className="text-2xl">{isDark ? '🌙' : '☀️'}</span>
      </motion.button>

      {/* Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 z-[9998] bg-black/20"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl z-[9999] overflow-hidden"
            >
              {/* Theme Selection */}
              <div className="p-4 border-b border-white/10">
                <p className="text-white/70 text-xs font-medium mb-3">TEMA</p>
                <div className="grid grid-cols-3 gap-2">
                  {themes.map((t) => (
                    <motion.button
                      key={t.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setTheme(t.value);
                        setShowMenu(false);
                      }}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        theme === t.value
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-1">{t.icon}</div>
                      <div className="text-xs font-medium">{t.label}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Color Scheme Selection */}
              <div className="p-4">
                <p className="text-white/70 text-xs font-medium mb-3">COLORE</p>
                <div className="grid grid-cols-2 gap-2">
                  {colorSchemes.map((cs) => (
                    <motion.button
                      key={cs.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setColorScheme(cs.value);
                        setShowMenu(false);
                      }}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        colorScheme === cs.value
                          ? 'ring-2 ring-white/50 shadow-lg'
                          : 'hover:ring-2 hover:ring-white/30'
                      }`}
                    >
                      <div className={`h-8 rounded-lg bg-gradient-to-r ${cs.color} mb-2`} />
                      <div className="text-xs font-medium text-white">{cs.label}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 bg-white/5 border-t border-white/10">
                <p className="text-white/50 text-xs text-center">
                  🎨 Personalizza la tua esperienza
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeToggle;

