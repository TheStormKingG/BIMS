import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingCelebrations, markCelebrationShown, Celebration } from '../services/celebrationService';
import confetti from 'canvas-confetti';

export const useCelebrations = () => {
  const [pendingCelebration, setPendingCelebration] = useState<Celebration | null>(null);
  const [isShowingCelebration, setIsShowingCelebration] = useState(false);
  const processedIdsRef = useRef<Set<number>>(new Set());
  const checkingRef = useRef(false);

  // Check for pending celebrations
  const checkCelebrations = useCallback(async () => {
    // Prevent concurrent checks
    if (checkingRef.current || isShowingCelebration) return;
    
    checkingRef.current = true;
    try {
      const celebrations = await getPendingCelebrations();
      if (celebrations.length > 0) {
        const celebration = celebrations[0];
        // Only set if we haven't already processed this celebration
        if (!processedIdsRef.current.has(celebration.id)) {
          processedIdsRef.current.add(celebration.id);
          setPendingCelebration(celebration);
        }
      }
    } catch (error) {
      console.error('Error checking celebrations:', error);
    } finally {
      checkingRef.current = false;
    }
  }, [isShowingCelebration]);

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
      } catch (error) {
        console.error('Error marking celebration as shown:', error);
        setIsShowingCelebration(false);
      }
    }, duration);
  }, []);

  // Check for celebrations on mount and periodically
  useEffect(() => {
    checkCelebrations();
    
    // Check every 5 seconds for new celebrations
    const interval = setInterval(() => {
      checkCelebrations();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [checkCelebrations]);

  // Auto-show celebration when one becomes available
  useEffect(() => {
    if (pendingCelebration && !isShowingCelebration) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        showCelebration(pendingCelebration);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingCelebration, isShowingCelebration, showCelebration]);

  return {
    pendingCelebration,
    isShowingCelebration,
    checkCelebrations,
  };
};
