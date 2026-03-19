import React, { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [atTop, setAtTop] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const maxPullDistance = 80;
  const refreshThreshold = 60;

  useEffect(() => {
    const checkScroll = () => {
      // Check if window is at the very top
      setAtTop(window.scrollY <= 0);
    };

    window.addEventListener("scroll", checkScroll);
    return () => window.removeEventListener("scroll", checkScroll);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const isAtTop = window.scrollY <= 0;
    if (!isAtTop || refreshing) {
      setPulling(false);
      return;
    }
    setStartY(e.touches[0].clientY);
    setPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const isAtTop = window.scrollY <= 0;
    if (!pulling || !isAtTop || refreshing) return;
    
    const y = e.touches[0].clientY;
    const diff = y - startY;
    
    // Only track if pulling downwards
    if (diff > 0) {
      // Apply some resistance
      const pullDistance = Math.min(diff * 0.4, maxPullDistance);
      setCurrentY(pullDistance);
      
      if (pullDistance > 0 && e.cancelable) {
        e.preventDefault(); // Prevent native scroll while pulling
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling || refreshing) return;
    
    setPulling(false);
    
    if (currentY >= refreshThreshold) {
      setRefreshing(true);
      setCurrentY(refreshThreshold); // Hold at threshold
      
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setCurrentY(0);
      }
    } else {
      setCurrentY(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative min-h-full", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center items-center overflow-hidden transition-all duration-200 z-50 pointer-events-none"
        style={{ 
          top: 0,
          height: `${currentY}px`,
          opacity: currentY / refreshThreshold
        }}
      >
        <div className={cn(
          "bg-background/80 backdrop-blur shadow-sm rounded-full p-2 flex items-center justify-center border border-border mt-4",
          refreshing && "animate-spin"
        )}>
          <RefreshCw 
            className="w-5 h-5 text-primary" 
            style={{ 
              transform: `rotate(${currentY * 3}deg)`,
              transition: refreshing ? "none" : "transform 0.1s" 
            }}
          />
        </div>
      </div>

      {/* Content wrapper */}
      <div 
        className="transition-transform duration-200"
        style={{ transform: `translateY(${currentY}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
