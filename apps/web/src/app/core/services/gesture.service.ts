import { Injectable, signal, effect } from '@angular/core';

/**
 * Gesture Service V2
 * Handles touch gestures for mobile interactions
 *
 * Supported Gestures:
 * - Swipe (up, down, left, right)
 * - Long Press
 * - Pinch Zoom
 * - Double Tap
 * - Pan
 *
 * Features:
 * - Touch and mouse support
 * - Configurable thresholds
 * - Velocity detection
 * - Multi-touch support
 * - Memory efficient
 */

export interface GestureConfig {
  swipeThreshold?: number; // px
  longPressDelay?: number; // ms
  doubleTapDelay?: number; // ms
  pinchThreshold?: number; // scale difference
  velocityThreshold?: number; // px/ms
}

export interface SwipeEvent {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
  velocity: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface PinchEvent {
  scale: number;
  centerX: number;
  centerY: number;
}

export interface PanEvent {
  deltaX: number;
  deltaY: number;
  velocity: number;
}

export interface LongPressEvent {
  x: number;
  y: number;
  duration: number;
}

@Injectable({
  providedIn: 'root',
})
export class GestureService {
  // Configuration
  private config: Required<GestureConfig> = {
    swipeThreshold: 50,
    longPressDelay: 500,
    doubleTapDelay: 300,
    pinchThreshold: 0.1,
    velocityThreshold: 0.3,
  };

  // Touch tracking
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private lastTapTime = 0;
  private longPressTimer: any = null;
  private initialDistance = 0;
  private initialScale = 1;

  // State signals
  isGestureActive = signal(false);
  currentGesture = signal<'swipe' | 'longpress' | 'pinch' | 'pan' | 'doubletap' | null>(null);

  constructor() {
    if (typeof window !== 'undefined') {
      console.log('🤚 GestureService initialized');
    }
  }

  /**
   * Configure gesture thresholds
   */
  configure(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Setup swipe gesture detection on element
   */
  onSwipe(
    element: HTMLElement,
    callback: (event: SwipeEvent) => void,
    options?: { preventScroll?: boolean },
  ): () => void {
    const handleTouchStart = (e: TouchEvent) => {
      if (options?.preventScroll) {
        e.preventDefault();
      }
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
      this.startTime = Date.now();
      this.isGestureActive.set(true);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();

      const deltaX = endX - this.startX;
      const deltaY = endY - this.startY;
      const duration = endTime - this.startTime;
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
      const velocity = distance / duration;

      if (distance > this.config.swipeThreshold) {
        const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
        let direction: 'up' | 'down' | 'left' | 'right';

        if (isHorizontal) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }

        this.currentGesture.set('swipe');
        callback({
          direction,
          distance,
          velocity,
          duration,
          startX: this.startX,
          startY: this.startY,
          endX,
          endY,
        });
      }

      this.isGestureActive.set(false);
      this.currentGesture.set(null);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: !options?.preventScroll });
    element.addEventListener('touchend', handleTouchEnd);

    // Mouse support for testing
    let isMouseDown = false;
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startTime = Date.now();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      const deltaX = e.clientX - this.startX;
      const deltaY = e.clientY - this.startY;
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

      if (distance > this.config.swipeThreshold) {
        const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
        const direction = isHorizontal
          ? deltaX > 0
            ? 'right'
            : 'left'
          : deltaY > 0
            ? 'down'
            : 'up';

        callback({
          direction,
          distance,
          velocity: distance / (Date.now() - this.startTime),
          duration: Date.now() - this.startTime,
          startX: this.startX,
          startY: this.startY,
          endX: e.clientX,
          endY: e.clientY,
        });
      }
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);

    // Cleanup function
    return () => {
      element.removeEventListener('touchstart', handleTouchStart as any);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
    };
  }

  /**
   * Setup long press gesture detection
   */
  onLongPress(element: HTMLElement, callback: (event: LongPressEvent) => void): () => void {
    const handleStart = (x: number, y: number) => {
      this.longPressTimer = setTimeout(() => {
        this.currentGesture.set('longpress');
        callback({
          x,
          y,
          duration: this.config.longPressDelay,
        });

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([10, 50, 10]);
        }
      }, this.config.longPressDelay);
    };

    const handleEnd = () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.currentGesture.set(null);
    };

    const handleTouchStart = (e: TouchEvent) => {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleEnd);
    element.addEventListener('touchcancel', handleEnd);
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleEnd);

    return () => {
      handleEnd();
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleEnd);
      element.removeEventListener('touchcancel', handleEnd);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleEnd);
    };
  }

  /**
   * Setup pinch-zoom gesture detection
   */
  onPinch(element: HTMLElement, callback: (event: PinchEvent) => void): () => void {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.initialDistance = this.getDistance(touch1, touch2);
        this.currentGesture.set('pinch');
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = this.getDistance(touch1, touch2);
        const scale = distance / this.initialDistance;

        if (Math.abs(scale - this.initialScale) > this.config.pinchThreshold) {
          const centerX = (touch1.clientX + touch2.clientX) / 2;
          const centerY = (touch1.clientY + touch2.clientY) / 2;

          callback({ scale, centerX, centerY });
          this.initialScale = scale;
        }
      }
    };

    const handleTouchEnd = () => {
      this.initialDistance = 0;
      this.initialScale = 1;
      this.currentGesture.set(null);
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove as any);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }

  /**
   * Setup double tap gesture detection
   */
  onDoubleTap(element: HTMLElement, callback: (x: number, y: number) => void): () => void {
    const handleTap = (x: number, y: number) => {
      const now = Date.now();
      const timeSinceLastTap = now - this.lastTapTime;

      if (timeSinceLastTap < this.config.doubleTapDelay) {
        this.currentGesture.set('doubletap');
        callback(x, y);

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }

        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
      }

      this.currentGesture.set(null);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      handleTap(touch.clientX, touch.clientY);
    };

    const handleClick = (e: MouseEvent) => {
      handleTap(e.clientX, e.clientY);
    };

    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('click', handleClick);
    };
  }

  /**
   * Setup pan gesture detection
   */
  onPan(element: HTMLElement, callback: (event: PanEvent) => void): () => void {
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;

    const handleMove = (x: number, y: number) => {
      const now = Date.now();
      const deltaX = x - lastX;
      const deltaY = y - lastY;
      const deltaTime = now - lastTime;
      const velocity = Math.sqrt(deltaX ** 2 + deltaY ** 2) / deltaTime;

      if (deltaX !== 0 || deltaY !== 0) {
        this.currentGesture.set('pan');
        callback({ deltaX, deltaY, velocity });
      }

      lastX = x;
      lastY = y;
      lastTime = now;
    };

    const handleTouchStart = (e: TouchEvent) => {
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      lastTime = Date.now();
    };

    const handleTouchMove = (e: TouchEvent) => {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleTouchEnd = () => {
      this.currentGesture.set(null);
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }

  /**
   * Helper: Calculate distance between two touches
   */
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx ** 2 + dy ** 2);
  }

  /**
   * Stop all active gestures
   */
  reset(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.isGestureActive.set(false);
    this.currentGesture.set(null);
  }
}
