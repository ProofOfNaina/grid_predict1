import { useMemo } from 'react';
import type { PricePoint } from '@/lib/grid-types';

interface PriceChartProps {
  history: PricePoint[];
  height?: number;
}

export function PriceChart({ history, height = 100 }: PriceChartProps) {
  const pathData = useMemo(() => {
    if (history.length < 2) return '';

    const recent = history.slice(-120);
    const prices = recent.map(p => p.price);
    const minP = Math.min(...prices) - 0.5;
    const maxP = Math.max(...prices) + 0.5;
    const range = maxP - minP || 1;

    const width = 1000;
    const points = recent.map((p, i) => {
      const x = (i / (recent.length - 1)) * width;
      const y = height - ((p.price - minP) / range) * (height - 16) - 8;
      return `${x},${y}`;
    });

    return `M${points.join(' L')}`;
  }, [history, height]);

  const gradientPath = useMemo(() => {
    if (!pathData) return '';
    return `${pathData} L1000,${height} L0,${height} Z`;
  }, [pathData, height]);

  const lastY = useMemo(() => {
    if (!pathData) return '50';
    return pathData.split(' ').pop()?.split(',')[1] || '50';
  }, [pathData]);

  return (
    <div className="bg-card/30 border-b border-border px-6 py-1.5 animate-fade-in" style={{ animationDelay: '100ms' }}>
      <svg
        viewBox={`0 0 1000 ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height }}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-line))" stopOpacity="0.12" />
            <stop offset="80%" stopColor="hsl(var(--chart-line))" stopOpacity="0.01" />
            <stop offset="100%" stopColor="hsl(var(--chart-line))" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {gradientPath && (
          <path d={gradientPath} fill="url(#chartGradient)" />
        )}
        {pathData && (
          <>
            {/* Glow line */}
            <path
              d={pathData}
              fill="none"
              stroke="hsl(var(--chart-line))"
              strokeWidth="3"
              strokeOpacity="0.15"
              vectorEffect="non-scaling-stroke"
            />
            {/* Main line */}
            <path
              d={pathData}
              fill="none"
              stroke="hsl(var(--chart-line))"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {history.length > 0 && (
          <>
            <circle
              cx="1000"
              cy={lastY}
              r="5"
              fill="hsl(var(--chart-line))"
              opacity="0.2"
              className="animate-pulse"
            />
            <circle
              cx="1000"
              cy={lastY}
              r="2.5"
              fill="hsl(var(--chart-line))"
            />
          </>
        )}
      </svg>
    </div>
  );
}
