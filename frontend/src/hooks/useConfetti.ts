import confetti from 'canvas-confetti';

export const useConfetti = () => {
  const celebrate = (type: 'levelUp' | 'badge' | 'goal' | 'streak' = 'levelUp') => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    switch (type) {
      case 'levelUp':
        // Esplosione centrale per level up
        confetti({
          ...defaults,
          particleCount: 100,
          origin: { x: 0.5, y: 0.5 },
          colors: ['#00D9FF', '#0099FF', '#FFD700', '#FFA500']
        });
        break;

      case 'badge':
        // Pioggia di stelle per badge
        const interval = setInterval(() => {
          if (Date.now() > animationEnd) {
            clearInterval(interval);
            return;
          }

          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF6B6B']
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF6B6B']
          });
        }, 150);
        break;

      case 'goal':
        // Fuochi d'artificio per obiettivo completato
        const colors = ['#00D9FF', '#0099FF', '#00FF88', '#FFD700'];
        (function frame() {
          confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
          });
          confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
          });

          if (Date.now() < animationEnd) {
            requestAnimationFrame(frame);
          }
        })();
        break;

      case 'streak':
        // Esplosione di fuoco per streak
        confetti({
          ...defaults,
          particleCount: 150,
          spread: 120,
          origin: { y: 0.6 },
          colors: ['#FF6B6B', '#FFA500', '#FFD700', '#FF4500']
        });
        
        setTimeout(() => {
          confetti({
            ...defaults,
            particleCount: 100,
            spread: 80,
            origin: { y: 0.7 },
            colors: ['#FF6B6B', '#FFA500', '#FFD700']
          });
        }, 250);
        break;
    }
  };

  const celebrateLevelUp = () => celebrate('levelUp');
  const celebrateBadge = () => celebrate('badge');
  const celebrateGoal = () => celebrate('goal');
  const celebrateStreak = () => celebrate('streak');

  return {
    celebrate,
    celebrateLevelUp,
    celebrateBadge,
    celebrateGoal,
    celebrateStreak
  };
};

