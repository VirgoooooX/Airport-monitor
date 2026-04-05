/**
 * LazyChart Component
 * 
 * Wrapper component that lazy loads charts when they come into viewport.
 * Improves initial page load performance by deferring chart rendering.
 * 
 * Uses Intersection Observer API to detect when chart enters viewport.
 */

import React, { useState, useEffect, useRef } from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface LazyChartProps {
  children: React.ReactNode;
  height?: number;
  threshold?: number;
  rootMargin?: string;
  placeholder?: React.ReactNode;
  className?: string;
}

/**
 * LazyChart component
 * 
 * Renders a placeholder until the chart scrolls into view,
 * then loads and renders the actual chart component.
 */
export const LazyChart: React.FC<LazyChartProps> = ({
  children,
  height = 300,
  threshold = 0.1,
  rootMargin = '100px',
  placeholder,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoaded) {
            setIsVisible(true);
            setHasLoaded(true);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, rootMargin, hasLoaded]);

  return (
    <div ref={containerRef} className={className}>
      {isVisible ? (
        children
      ) : (
        placeholder || (
          <LoadingSkeleton variant="chart" height={height} />
        )
      )}
    </div>
  );
};

/**
 * Hook for lazy loading multiple charts
 * Returns whether each chart should be loaded based on scroll position
 */
export function useLazyCharts(count: number, options?: {
  threshold?: number;
  rootMargin?: string;
}) {
  const [loadedCharts, setLoadedCharts] = useState<boolean[]>(
    new Array(count).fill(false)
  );

  const observerRefs = useRef<(HTMLDivElement | null)[]>(
    new Array(count).fill(null)
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = observerRefs.current.indexOf(
              entry.target as HTMLDivElement
            );
            if (index !== -1 && !loadedCharts[index]) {
              setLoadedCharts((prev) => {
                const next = [...prev];
                next[index] = true;
                return next;
              });
            }
          }
        });
      },
      {
        threshold: options?.threshold || 0.1,
        rootMargin: options?.rootMargin || '100px'
      }
    );

    observerRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observerRefs.current.forEach((ref) => {
        if (ref) {
          observer.unobserve(ref);
        }
      });
    };
  }, [count, options?.threshold, options?.rootMargin, loadedCharts]);

  const setRef = (index: number) => (ref: HTMLDivElement | null) => {
    observerRefs.current[index] = ref;
  };

  return { loadedCharts, setRef };
}
