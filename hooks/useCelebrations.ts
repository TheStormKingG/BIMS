import { useState, useEffect, useCallback } from 'react';
import { getPendingCelebrations, markCelebrationShown, Celebration } from '../services/celebrationService';
import confetti from 'canvas-confetti';

export const useCelebrations = () => {
  const [pendingCelebration, setPendingCelebration] = useState<Celebration | null>(null);
  const [isShowingCelebration, setIsShowingCelebration] = useState(false);
  const [hasShownCurrent, setHasShownCurrent] = useState(false);

  // Check for pending celebrations
  const checkCelebrations = useCallback(async () => {
    try {
      const celebrations = await getPendingCelebrations();
      if (celebrations.length > 0 && !isShowingCelebration && !hasShownCurrent) {
        setPendingCelebration(celebrations[0]);
        setHasShownCurrent(true);
      }
    } catch (error) {
      console.error('Error checking celebrations:', error);
    }
  }, [isShowingCelebration, hasShownCurrent]);

  // Show celebration with confetti
  const showCelebration = useCallback(async (celebration: Celebration) => {
    setIsShowingCelebration(true);

    // Trigger confetti animation
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Wait for confetti to finish, then mark as shown
    setTimeout(async () => {
      try {
        await markCelebrationShown(celebration.id);
        setPendingCelebration(null);
        setIsShowingCelebration(false);
        setHasShownCurrent(false);
      } catch (error) {
        console.error('Error marking celebration as shown:', error);
        setIsShowingCelebration(false);
        setHasShownCurrent(false);
      }
    }, duration);
  }, []);

  // Check for celebrations on mount and periodically
  useEffect(() => {
    checkCelebrations();
    
    // Check every 5 seconds for new celebrations
    const interval = setInterval(checkCelebrations, 5000);
    
    return () => clearInterval(interval);
  }, [checkCelebrations]);

  // Auto-show celebration when one becomes available
  useEffect(() => {
    if (pendingCelebration && !isShowingCelebration) {
      showCelebration(pendingCelebration);
    }
  }, [pendingCelebration, isShowingCelebration, showCelebration]);

  return {
    pendingCelebration,
    isShowingCelebration,
    checkCelebrations,
  };
};

