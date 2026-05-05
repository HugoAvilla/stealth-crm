import React, { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

/**
 * Checks if an element or any of its ancestors (up to the boundary)
 * is a scrollable container that hasn't reached its top yet.
 * This prevents PTR from firing when touching inside scrollable tables/divs.
 */
function isTouchInsideScrollableContainer(
  target: EventTarget | null,
  boundary: HTMLElement | null
): boolean {
  let el = target as HTMLElement | null;
  while (el && el !== boundary && el !== document.body) {
    // Check if this element is scrollable vertically
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    const overflow = style.overflow;
    const isScrollable =
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflow === "auto" ||
      overflow === "scroll";

    if (isScrollable && el.scrollHeight > el.clientHeight) {
      // This container is scrollable and has content to scroll
      // If it's NOT at the very top, block PTR
      if (el.scrollTop > 0) {
        return true;
      }
    }

    // Also check for horizontally scrollable containers (like table wrappers)
    const overflowX = style.overflowX;
    const isScrollableX =
      overflowX === "auto" ||
      overflowX === "scroll";

    if (isScrollableX && el.scrollWidth > el.clientWidth) {
      // If the user is inside a horizontally scrollable area,
      // we should be more cautious about PTR
      return true;
    }

    el = el.parentElement;
  }
  return false;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [currentY, setCurrentY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const pullingRef = useRef(false);
  const activatedRef = useRef(false); // True once dead zone is passed
  const wasScrollingRef = useRef(false); // Tracks if user was scrolling before touch
  const lastScrollYRef = useRef(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHorizontalGestureRef = useRef(false); // Tracks if gesture is horizontal

  const maxPullDistance = 80;
  const refreshThreshold = 60;
  const deadZone = 12; // Minimum px before pull-to-refresh activates
  const scrollSettleTime = 150; // ms the page must be at top before allowing PTR
  const horizontalThreshold = 8; // px of horizontal movement to cancel PTR

  // Track scroll state to detect if user was scrolling
  const handleScroll = useCallback(() => {
    lastScrollYRef.current = window.scrollY;

    // Mark as "was scrolling" whenever scrollY > 0
    if (window.scrollY > 2) {
      wasScrollingRef.current = true;
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    } else {
      // When arriving at top, wait for settle time before clearing scroll flag
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        wasScrollingRef.current = false;
      }, scrollSettleTime);
    }
  }, []);

  // Attach scroll listener
  React.useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [handleScroll]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow pull-to-refresh if:
    // 1. Page is at the very top
    // 2. User was NOT scrolling (arrived at top via scroll momentum)
    // 3. Not currently refreshing
    // 4. Touch is NOT inside a scrollable sub-container
    const isAtTop = window.scrollY <= 0;
    if (!isAtTop || refreshing || wasScrollingRef.current) {
      pullingRef.current = false;
      activatedRef.current = false;
      return;
    }

    // Check if the touch originated inside a scrollable container (e.g., table wrapper)
    if (isTouchInsideScrollableContainer(e.target, containerRef.current)) {
      pullingRef.current = false;
      activatedRef.current = false;
      return;
    }

    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
    pullingRef.current = true;
    activatedRef.current = false;
    isHorizontalGestureRef.current = false;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const isAtTop = window.scrollY <= 0;
    if (!pullingRef.current || !isAtTop || refreshing) {
      // If page scrolled away from top during drag, cancel
      if (pullingRef.current && !isAtTop) {
        pullingRef.current = false;
        activatedRef.current = false;
        setCurrentY(0);
      }
      return;
    }

    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const rawDiffY = y - startYRef.current;
    const rawDiffX = Math.abs(x - startXRef.current);

    // Detect horizontal gesture — if user is swiping sideways, cancel PTR
    if (!activatedRef.current && rawDiffX > horizontalThreshold) {
      isHorizontalGestureRef.current = true;
      pullingRef.current = false;
      activatedRef.current = false;
      setCurrentY(0);
      return;
    }

    // If already detected as horizontal, ignore
    if (isHorizontalGestureRef.current) return;

    // Only track downward movement
    if (rawDiffY <= 0) {
      // User is pulling up, cancel pull-to-refresh
      if (activatedRef.current) {
        activatedRef.current = false;
        setCurrentY(0);
      }
      return;
    }

    // Dead zone: don't activate until user pulls past the dead zone
    if (!activatedRef.current) {
      if (rawDiffY < deadZone) {
        return; // Still in dead zone, ignore
      }
      // Activate and recalibrate start point
      activatedRef.current = true;
      startYRef.current = y; // Reset start so pull distance starts from 0
    }

    const diff = y - startYRef.current;
    // Simple resistance
    const pullDistance = Math.min(diff * 0.4, maxPullDistance);
    setCurrentY(pullDistance);

    if (pullDistance > 0 && e.cancelable) {
      e.preventDefault(); // Prevent native scroll while pulling
    }
  };

  const handleTouchEnd = async () => {
    if (!pullingRef.current || refreshing) return;

    pullingRef.current = false;
    activatedRef.current = false;
    isHorizontalGestureRef.current = false;
    setDragging(false);

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
        className="absolute left-0 right-0 flex justify-center items-center overflow-hidden z-50 pointer-events-none"
        style={{
          top: 0,
          height: `${currentY}px`,
          opacity: currentY / refreshThreshold,
        }}
      >
        <div
          className={cn(
            "bg-background/80 backdrop-blur shadow-sm rounded-full p-2 flex items-center justify-center border border-border mt-4",
            refreshing && "animate-spin"
          )}
        >
          <RefreshCw
            className="w-5 h-5 text-primary"
            style={{
              transform: `rotate(${currentY * 3}deg)`,
              transition: refreshing ? "none" : "transform 0.1s",
            }}
          />
        </div>
      </div>

      {/* Content wrapper - no transition during drag to prevent trembling */}
      <div
        style={{
          transform: `translateY(${currentY}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

