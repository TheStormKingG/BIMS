import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Smartphone, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';

// Define the structure for mockup images
// Users should add their screenshots to public/mockups/ folder
// Mobile: mobile-1.png, mobile-2.png, mobile-3.png, etc.
// Desktop: desktop-1.png, desktop-2.png, desktop-3.png, etc.
const MOBILE_IMAGES = [
  '/mockups/mobile-1.png',
  '/mockups/mobile-2.png',
  '/mockups/mobile-3.png',
  '/mockups/mobile-4.png',
  '/mockups/mobile-5.png',
];

const DESKTOP_IMAGES = [
  '/mockups/desktop-1.png',
  '/mockups/desktop-2.png',
  '/mockups/desktop-3.png',
  '/mockups/desktop-4.png',
  '/mockups/desktop-5.png',
];

export const Landing: React.FC = () => {
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const images = viewMode === 'mobile' ? MOBILE_IMAGES : DESKTOP_IMAGES;

  // Handle next slide
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  // Handle previous slide
  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

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
      if (Math.abs(diff) > 50 && timeDiff < 300) {
        if (diff > 0) {
          setCurrentIndex((prev) => (prev + 1) % images.length);
        } else {
          setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
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
      {/* Toggle Button - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex flex-col items-center gap-2">
          {/* Labels */}
          <div className="flex items-center gap-8 text-sm font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <span className={viewMode === 'desktop' ? 'text-slate-900' : 'text-slate-400'}>DESKTOP</span>
            <span className={viewMode === 'mobile' ? 'text-slate-900' : 'text-slate-400'}>MOBILE</span>
          </div>
          
          {/* Toggle Switch */}
          <button
            onClick={() => setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')}
            className="relative w-20 h-10 bg-black rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 transition-all duration-300"
            aria-label={`Switch to ${viewMode === 'mobile' ? 'desktop' : 'mobile'} view`}
          >
            {/* Sliding Circle */}
            <div
              className={`absolute top-1 w-8 h-8 bg-white rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out shadow-sm ${
                viewMode === 'desktop' ? 'translate-x-1' : 'translate-x-11'
              }`}
              style={{ border: '1px solid rgba(0, 0, 0, 0.1)' }}
            >
              {/* Power Symbol - Circle with vertical line */}
              <svg
                className="w-3.5 h-3.5 text-black"
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

      {/* Main Carousel Container */}
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="relative w-full max-w-7xl">
          {/* Carousel */}
          <div
            ref={carouselRef}
            className="relative overflow-hidden rounded-3xl"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {/* Slides Container */}
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {images.map((image, index) => (
                <div
                  key={index}
                  className="w-full flex-shrink-0 flex items-center justify-center"
                >
                  <div
                    className={`relative ${
                      viewMode === 'mobile'
                        ? 'w-72 sm:w-80 md:w-96'
                        : 'w-full max-w-5xl'
                    }`}
                  >
                    {/* Mockup Frame */}
                    {viewMode === 'mobile' ? (
                      // Mobile Mockup Frame
                      <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-[3rem] p-4 shadow-2xl border-8 border-slate-700">
                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-inner">
                          <img
                            src={image}
                            alt={`Stashway ${viewMode} view ${index + 1}`}
                            className="w-full h-auto object-cover"
                            onError={(e) => {
                              // Fallback if image doesn't exist
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              if (target.parentElement) {
                                target.parentElement.innerHTML = `
                                  <div class="w-full aspect-[9/16] bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center text-slate-400">
                                    <div class="text-center">
                                      <div class="text-4xl mb-2">📱</div>
                                      <div class="text-sm">Mobile ${index + 1}</div>
                                    </div>
                                  </div>
                                `;
                              }
                            }}
                          />
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
                            <img
                              src={image}
                              alt={`Stashway ${viewMode} view ${index + 1}`}
                              className="w-full h-auto object-cover"
                              onError={(e) => {
                                // Fallback if image doesn't exist
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                if (target.parentElement) {
                                  target.parentElement.innerHTML = `
                                    <div class="w-full aspect-video bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center text-slate-400">
                                      <div class="text-center">
                                        <div class="text-4xl mb-2">💻</div>
                                        <div class="text-sm">Desktop ${index + 1}</div>
                                      </div>
                                    </div>
                                  `;
                                }
                              }}
                            />
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
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/10 backdrop-blur-md hover:bg-black/20 transition-all duration-200 rounded-full p-3 shadow-lg border border-black/10 text-slate-700 z-10"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/10 backdrop-blur-md hover:bg-black/20 transition-all duration-200 rounded-full p-3 shadow-lg border border-black/10 text-slate-700 z-10"
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {images.map((_, index) => (
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

