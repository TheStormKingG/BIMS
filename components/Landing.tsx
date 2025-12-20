import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Smartphone, Monitor, ChevronLeft, ChevronRight, Mail, Lock, LogIn } from 'lucide-react';
import { getSupabase } from '../services/supabaseClient';

// Define the structure for mockup images
// Users should add their screenshots to public/mockups/ folder
// Mobile: mobile-1.png, mobile-2.png, mobile-3.png, etc.
// Desktop: desktop-1.png, desktop-2.png, desktop-3.png, etc.
const MOBILE_IMAGES = [
  '/mockups/mobile-1.jpg',
  '/mockups/mobile-2.jpg',
  '/mockups/mobile-3.jpg',
  '/mockups/mobile-4.jpg',
  '/mockups/mobile-5.jpg',
  '/mockups/mobile-6.jpg',
  '/mockups/mobile-7.jpg',
  '/mockups/mobile-8.jpg',
  '/mockups/mobile-9.jpg',
  '/mockups/mobile-10.jpg',
];

const DESKTOP_IMAGES = [
  '/mockups/desktop-1.png',
  '/mockups/desktop-2.png',
  '/mockups/desktop-3.png',
  '/mockups/desktop-4.png',
  '/mockups/desktop-5.png',
  '/mockups/desktop-6.png',
  '/mockups/desktop-7.png',
  '/mockups/desktop-8.png',
  '/mockups/desktop-9.png',
];

// Mobile USPs mapped explicitly to image filenames for better maintainability
const MOBILE_USP_MAP: Record<string, string> = {
  'mobile-1.jpg': 'Mobile-first design — Built for your phone with an intuitive interface that makes finance tracking effortless.',
  'mobile-2.jpg': 'Touch-optimized interface — Swipe, tap, and navigate your finances with ease on any mobile device.',
  'mobile-3.jpg': 'Mobile wallet tracking — Manage your physical cash wallet with denomination tracking right from your phone.',
  'mobile-4.jpg': 'Quick balance check — See all your account balances at a glance, anytime, anywhere.',
  'mobile-5.jpg': 'Track spending anywhere — Log purchases immediately from your phone, whether you\'re shopping or dining out.',
  'mobile-6.jpg': 'Scan receipts on the go — Take a photo of any receipt and instantly digitize your purchase with AI-powered OCR.',
  'mobile-7.jpg': 'Set goals — Build a habit of tracking and knowing where your money goes.',
  'mobile-8.jpg': 'Create realistic Targets — Stay on track by having specific limits that work.',
  'mobile-9.jpg': 'Chat with your Stash — Stashway analyses all your data with super intelligence.',
  'mobile-10.jpg': 'Smart Chat Suggestions — Get instant updates on your spending and goal progress.',
};

// Helper function to get USP for an image
const getMobileUSP = (imagePath: string): string | undefined => {
  const filename = imagePath.split('/').pop() || '';
  return MOBILE_USP_MAP[filename];
};

// Login Form Preview Component (without wrapper)
const LoginFormPreview: React.FC = () => {
  const [isSignUp] = useState(false);

  return (
    <>
      <div className="text-center">
        <div className="flex flex-col items-center gap-2 mb-2">
          <img src="/stashway-logo.png" alt="Stashway Logo" className="w-36 h-36" />
          <h1 className="text-3xl font-bold text-slate-900">
            Stashway<sup className="text-sm">™</sup>
          </h1>
        </div>
        <p className="text-slate-600">
          {isSignUp ? 'Create your account' : 'Grow your stash'}
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              disabled
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-black"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              disabled
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-black"
            />
          </div>
        </div>

        <button
          type="button"
          disabled
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-emerald-600 disabled:cursor-default flex items-center justify-center gap-2"
        >
          <LogIn className="w-5 h-5" />
          <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-transparent text-slate-500">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="w-full border border-slate-200 text-slate-700 py-3 rounded-lg font-semibold transition-colors disabled:bg-white disabled:cursor-default flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      <div className="text-center text-sm">
        <button
          type="button"
          disabled
          className="text-emerald-600 font-medium cursor-default"
        >
          {isSignUp
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </>
  );
};

export const Landing: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Detect mobile devices and set default view mode
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      if (mobile) {
        setViewMode('mobile'); // Force mobile view on mobile devices
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const images = viewMode === 'mobile' ? MOBILE_IMAGES : DESKTOP_IMAGES;

  // Reset index when view mode changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [viewMode]);

  // Total slides including login form
  const totalSlides = images.length + 1;

  // Handle next slide
  const nextSlide = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => {
      const next = prev + 1;
      return next >= totalSlides ? 0 : next;
    });
  }, [totalSlides]);

  // Handle previous slide
  const prevSlide = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => {
      const prevIndex = prev - 1;
      return prevIndex < 0 ? totalSlides - 1 : prevIndex;
    });
  }, [totalSlides]);

  // Touch events for swiping
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let touchStartX = 0;
    let touchStartTime = 0;
    let isDraggingLocal = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
      isDraggingLocal = true;
      setIsDragging(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingLocal) return;
      const diff = touchStartX - e.touches[0].clientX;
      const timeDiff = Date.now() - touchStartTime;
      
      // Only trigger if swipe is significant and fast enough
      const totalSlides = images.length + 1;
      if (Math.abs(diff) > 50 && timeDiff < 300 && totalSlides > 0) {
        if (diff > 0) {
          setCurrentIndex((prev) => {
            const next = prev + 1;
            return next >= totalSlides ? 0 : next;
          });
        } else {
          setCurrentIndex((prev) => {
            const prevIndex = prev - 1;
            return prevIndex < 0 ? totalSlides - 1 : prevIndex;
          });
        }
        isDraggingLocal = false;
        setIsDragging(false);
      }
    };

    const handleTouchEnd = () => {
      isDraggingLocal = false;
      setIsDragging(false);
    };

    carousel.addEventListener('touchstart', handleTouchStart, { passive: true });
    carousel.addEventListener('touchmove', handleTouchMove, { passive: true });
    carousel.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      carousel.removeEventListener('touchstart', handleTouchStart);
      carousel.removeEventListener('touchmove', handleTouchMove);
      carousel.removeEventListener('touchend', handleTouchEnd);
    };
  }, [images.length]);

  // Mouse events for desktop dragging
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let mouseStartX = 0;
    let mouseStartTime = 0;
    let isMouseDown = false;

    const handleMouseDown = (e: MouseEvent) => {
      mouseStartX = e.clientX;
      mouseStartTime = Date.now();
      isMouseDown = true;
      setIsDragging(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const diff = mouseStartX - e.clientX;
      const timeDiff = Date.now() - mouseStartTime;
      
      // Only trigger if drag is significant and fast enough
      if (Math.abs(diff) > 50 && timeDiff < 300) {
        if (diff > 0) {
          setCurrentIndex((prev) => (prev + 1) % images.length);
        } else {
          setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        }
        isMouseDown = false;
        setIsDragging(false);
      }
    };

    const handleMouseUp = () => {
      isMouseDown = false;
      setIsDragging(false);
    };

    carousel.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      carousel.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [images.length]);

  // Reset to first slide when view mode changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [viewMode]);

  return (
    <div className="min-h-screen overflow-hidden relative bg-white">
      {/* Animated Light Trails Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Main flowing light trail */}
        <div className="absolute inset-0 animate-light-flow-1">
          <div className="light-trail-1"></div>
        </div>
        <div className="absolute inset-0 animate-light-flow-2">
          <div className="light-trail-2"></div>
        </div>
        <div className="absolute inset-0 animate-light-flow-3">
          <div className="light-trail-3"></div>
        </div>
        
        {/* Sparkles/particles */}
        {[...Array(15)].map((_, i) => {
          const delay = i * 0.4;
          const duration = 4 + (i % 3);
          return (
            <div
              key={i}
              className="absolute inset-0"
              style={{
                animation: `sparkle ${duration}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            >
              <div
                className="sparkle"
                style={{
                  left: `${10 + (i * 6) % 85}%`,
                  top: `${10 + (i * 8) % 75}%`,
                }}
              ></div>
            </div>
          );
        })}
      </div>
      
      {/* Content Container */}
      <div className="relative z-10">
      {/* Toggle Button - Top Right (Hidden on mobile) */}
      {!isMobile && (
        <div className="absolute top-4 right-4 z-50">
          <div className="flex flex-col items-center gap-2">
            {/* Labels */}
            <div className="flex items-center gap-6 text-xs font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              <span className={viewMode === 'desktop' ? 'text-slate-900' : 'text-slate-400'}>DESKTOP</span>
              <span className={viewMode === 'mobile' ? 'text-slate-900' : 'text-slate-400'}>MOBILE</span>
            </div>
            
            {/* Toggle Switch */}
            <button
              onClick={() => setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')}
              className="relative w-16 h-8 bg-black rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 transition-all duration-300"
              aria-label={`Switch to ${viewMode === 'mobile' ? 'desktop' : 'mobile'} view`}
            >
              {/* Sliding Circle */}
              <div
                className={`absolute top-0.5 w-7 h-7 bg-white rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out shadow-sm ${
                  viewMode === 'desktop' ? 'translate-x-0.5' : 'translate-x-9'
                }`}
                style={{ border: '1px solid rgba(0, 0, 0, 0.1)' }}
              >
                {/* Power Symbol - Circle with vertical line */}
                <svg
                  className="w-3 h-3 text-black"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" />
                  <line x1="12" y1="3" x2="12" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Carousel Container */}
      <div className={`flex items-center justify-center min-h-screen ${currentIndex === images.length ? 'p-0' : 'p-8'}`}>
        <div className={`relative w-full ${currentIndex === images.length ? 'max-w-md' : 'max-w-7xl'} ${viewMode === 'mobile' && currentIndex !== images.length ? `flex flex-col md:flex-row items-center ${isMobile ? 'gap-0' : 'gap-8'}` : ''}`}>
          {/* USP Display for Mobile Mockups */}
          {viewMode === 'mobile' && currentIndex < MOBILE_IMAGES.length && (
            <div className={`w-full ${isMobile ? 'order-1 -mb-[6px] pb-0' : 'order-1 md:w-1/2'} flex items-center justify-center`}>
              <div className={`text-center ${isMobile ? 'px-4 pb-0' : 'text-left px-8'}`}>
                {(() => {
                  const currentImage = MOBILE_IMAGES[currentIndex];
                  const usp = getMobileUSP(currentImage);
                  if (!usp) {
                    return null; // No USP found for this image
                  }
                  const dashIndex = usp.indexOf(' — ');
                  if (dashIndex === -1) {
                    // No dash found, show as is
                    return (
                      <p className={`text-2xl md:text-3xl font-bold text-slate-900 leading-tight ${isMobile ? 'mb-0' : ''}`}>
                        {usp}
                      </p>
                    );
                  }
                  const beforeDash = usp.substring(0, dashIndex);
                  const afterDash = usp.substring(dashIndex + 3); // +3 to skip ' — '
                  return (
                    <div className={`text-2xl md:text-3xl text-slate-900 leading-tight ${isMobile ? 'mb-0' : ''}`}>
                      <p className={`font-bold ${isMobile ? 'mb-1' : 'mb-2'}`}>{beforeDash}</p>
                      <p className="font-normal mb-0">{afterDash}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          
          {/* Carousel */}
          <div
            ref={carouselRef}
            className={`relative overflow-hidden ${viewMode === 'mobile' && !isMobile && currentIndex !== images.length ? 'order-2 md:w-1/2' : viewMode === 'mobile' && currentIndex !== images.length ? `order-2 w-full ${isMobile ? 'pt-0 -mt-[6px]' : ''}` : 'w-full'} ${currentIndex === images.length ? 'rounded-none' : 'rounded-3xl'}`}
            style={{ cursor: isDragging ? 'grabbing' : 'grab', minHeight: currentIndex === images.length ? '100vh' : 'auto' }}
          >
            {/* Slides Container */}
            <div
              className="flex transition-transform duration-500 ease-out h-full"
              style={{
                transform: `translateX(-${currentIndex * (100 / (images.length + 1))}%)`,
                width: `${(images.length + 1) * 100}%`,
              }}
            >
              {images.map((image, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: `${100 / (images.length + 1)}%` }}
                >
                  <div
                    className={`relative ${
                      viewMode === 'mobile'
                        ? 'w-[90vw] max-w-sm sm:w-96 md:w-[28rem]'
                        : 'w-full max-w-[80%]'
                    }`}
                    style={viewMode === 'desktop' ? { transform: 'scale(0.8)', transformOrigin: 'center' } : {}}
                  >
                    {/* Mockup Frame */}
                    {viewMode === 'mobile' ? (
                      // Mobile Mockup Frame
                      <div 
                        className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-[3rem] p-2 shadow-2xl border-[10px] border-slate-700"
                        style={{ aspectRatio: '9/17' }}
                      >
                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-inner h-full">
                          {failedImages.has(image) ? (
                            <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center text-slate-400">
                              <div className="text-center">
                                <div className="text-4xl mb-2">📱</div>
                                <div className="text-sm">Mobile {index + 1}</div>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={image}
                              alt={`Stashway ${viewMode} view ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={() => {
                                setFailedImages((prev) => new Set(prev).add(image));
                              }}
                            />
                          )}
                        </div>
                        {/* Notch */}
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl"></div>
                      </div>
                    ) : (
                      // Desktop Mockup Frame - Laptop Design
                      <div className="relative">
                        {/* Screen Section */}
                        <div className="relative bg-gradient-to-b from-slate-900 to-slate-800 rounded-t-2xl rounded-b-lg p-3 shadow-2xl">
                          {/* Top Bezel with Webcam */}
                          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-20 h-3 bg-slate-900 rounded-full flex items-center justify-center">
                            <div className="w-2 h-1.5 bg-slate-700 rounded-sm"></div>
                            <div className="absolute right-0.5 w-1 h-1 bg-red-500 rounded-full"></div>
                          </div>
                          
                          {/* Screen */}
                          <div className="bg-white rounded-lg overflow-hidden shadow-inner mt-4">
                          {failedImages.has(image) ? (
                            <div className="w-full aspect-video bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center text-slate-400">
                              <div className="text-center">
                                <div className="text-4xl mb-2">💻</div>
                                <div className="text-sm">Desktop {index + 1}</div>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={image}
                              alt={`Stashway ${viewMode} view ${index + 1}`}
                              className="w-full h-auto object-cover"
                              onError={() => {
                                setFailedImages((prev) => new Set(prev).add(image));
                              }}
                            />
                          )}
                          </div>
                          
                          {/* Bottom Bezel */}
                          <div className="h-3 bg-slate-900 mt-2 rounded-b-lg"></div>
                        </div>
                        
                        {/* Keyboard Section */}
                        <div className="bg-gradient-to-b from-slate-200 to-slate-300 rounded-b-2xl pt-2 pb-4 px-8 shadow-xl -mt-1">
                          <div className="flex flex-col items-center gap-1">
                            {/* Top Row Keys */}
                            <div className="flex gap-1 w-full justify-center">
                              {[...Array(12)].map((_, i) => (
                                <div key={i} className="w-6 h-4 bg-slate-700 rounded-sm"></div>
                              ))}
                            </div>
                            {/* Middle Row Keys */}
                            <div className="flex gap-1 w-full justify-center">
                              {[...Array(12)].map((_, i) => (
                                <div key={i} className="w-6 h-4 bg-slate-700 rounded-sm"></div>
                              ))}
                            </div>
                            {/* Bottom Row Keys */}
                            <div className="flex gap-1 w-full justify-center">
                              {[...Array(10)].map((_, i) => (
                                <div key={i} className="w-6 h-4 bg-slate-700 rounded-sm"></div>
                              ))}
                            </div>
                            {/* Touchpad Area */}
                            <div className="w-24 h-12 bg-slate-600 rounded-lg mt-2"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Login Form as Last Slide */}
              <div
                className="flex-shrink-0 flex items-center justify-center h-screen"
                style={{ width: `${100 / (images.length + 1)}%`, background: 'transparent' }}
              >
                <div className="w-full max-w-md px-4">
                  <LoginFormPreview />
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className={`${currentIndex === images.length ? 'fixed' : 'absolute'} top-1/2 -translate-y-1/2 backdrop-blur-md transition-all duration-200 rounded-full p-3 shadow-lg border text-slate-700 z-10 ${
                viewMode === 'mobile'
                  ? 'bg-black/5 hover:bg-black/10 border-black/5'
                  : 'bg-black/10 hover:bg-black/20 border-black/10'
              }`}
              style={currentIndex === images.length 
                ? { left: 'clamp(1rem, 10vw, 4rem)' } // Use viewport units for wider spacing on login slide
                : { left: '2rem' }
              }
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className={`${currentIndex === images.length ? 'fixed' : 'absolute'} top-1/2 -translate-y-1/2 backdrop-blur-md transition-all duration-200 rounded-full p-3 shadow-lg border text-slate-700 z-10 ${
                viewMode === 'mobile'
                  ? 'bg-black/5 hover:bg-black/10 border-black/5'
                  : 'bg-black/10 hover:bg-black/20 border-black/10'
              }`}
              style={currentIndex === images.length 
                ? { right: 'clamp(1rem, 10vw, 4rem)' } // Use viewport units for wider spacing on login slide
                : { right: '2rem' }
              }
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {[...images, null].map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`transition-all duration-200 rounded-full ${
                    index === currentIndex
                      ? 'bg-white w-8 h-2'
                      : 'bg-white/40 w-2 h-2 hover:bg-white/60'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

