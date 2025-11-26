/**
 * AITouchScore Component
 * 
 * Displays an asset's AI training contribution score (0-100 scale) with:
 * - Circular SVG progress indicator with smooth animations
 * - Color-coded visual feedback (red <30, yellow 30-70, green >70)
 * - Numerical score display with percentage
 * - Trend indicator showing score changes over time
 * - Explanation tooltip describing score meaning and calculation factors
 * - TailwindCSS responsive styling with animated transitions
 * 
 * @module components/AITouchScore
 */

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Minus, Info } from 'lucide-react';

/**
 * Props interface for the AITouchScore component
 */
interface AITouchScoreProps {
  /** The AI Touch Score value (0-100 scale) */
  score: number;
  /** Trend direction indicating score change over time */
  trend?: 'up' | 'down' | 'stable';
  /** Percentage change in score from previous period */
  trendValue?: number;
  /** Size variant for the circular progress indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the explanation tooltip */
  showTooltip?: boolean;
  /** Whether to show the "AI Touch Score" label */
  showLabel?: boolean;
  /** Optional CSS class name for additional styling */
  className?: string;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
}

/**
 * Size configuration for different component variants
 */
const SIZE_CONFIG = {
  sm: {
    containerSize: 64,
    strokeWidth: 4,
    fontSize: 'text-sm',
    labelSize: 'text-xs',
    trendSize: 'text-xs',
    iconSize: 'w-3 h-3',
  },
  md: {
    containerSize: 96,
    strokeWidth: 6,
    fontSize: 'text-base',
    labelSize: 'text-sm',
    trendSize: 'text-xs',
    iconSize: 'w-4 h-4',
  },
  lg: {
    containerSize: 128,
    strokeWidth: 8,
    fontSize: 'text-lg',
    labelSize: 'text-base',
    trendSize: 'text-sm',
    iconSize: 'w-5 h-5',
  },
} as const;

/**
 * Color scheme based on score ranges
 */
const SCORE_COLORS = {
  low: {
    stroke: '#EF4444', // red-500
    text: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  medium: {
    stroke: '#F59E0B', // amber-500
    text: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  high: {
    stroke: '#10B981', // emerald-500
    text: 'text-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
} as const;

/**
 * Determines the color scheme based on score value
 * @param score - The score value (0-100)
 * @returns Color configuration object
 */
function getScoreColors(score: number): typeof SCORE_COLORS.low {
  if (score < 30) {
    return SCORE_COLORS.low;
  }
  if (score < 70) {
    return SCORE_COLORS.medium;
  }
  return SCORE_COLORS.high;
}

/**
 * Formats the score for display
 * @param score - The score value
 * @returns Formatted score string
 */
function formatScore(score: number): string {
  return Math.round(score).toString();
}

/**
 * Formats the trend value for display
 * @param value - The trend value percentage
 * @param trend - The trend direction
 * @returns Formatted trend string
 */
function formatTrendValue(value: number | undefined, trend: 'up' | 'down' | 'stable'): string {
  if (value === undefined || trend === 'stable') {
    return '0%';
  }
  const sign = trend === 'up' ? '+' : '-';
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/**
 * AITouchScore Component
 * 
 * Renders a circular progress indicator displaying an asset's AI Touch Score
 * with color-coded feedback, trend indicators, and an informational tooltip.
 * 
 * @param props - Component props
 * @returns React component
 */
export default function AITouchScore({
  score,
  trend,
  trendValue,
  size = 'md',
  showTooltip: showTooltipProp = true,
  showLabel = true,
  className = '',
  isLoading = false,
}: AITouchScoreProps): JSX.Element {
  // Animated score state for smooth transition on mount
  const [animatedScore, setAnimatedScore] = useState(0);
  
  // Tooltip visibility state
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  // Get size configuration
  const sizeConfig = SIZE_CONFIG[size];
  
  // Calculate SVG dimensions
  const { containerSize, strokeWidth } = sizeConfig;
  const radius = (containerSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = containerSize / 2;

  // Get color scheme based on score
  const colors = getScoreColors(score);
  
  // Calculate stroke dash offset for progress animation
  const normalizedScore = Math.min(100, Math.max(0, animatedScore));
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  /**
   * Animate score from 0 to actual value on mount
   * Uses requestAnimationFrame for smooth 60fps animation
   */
  useEffect(() => {
    if (isLoading || score === undefined) {
      setAnimatedScore(0);
      return;
    }

    const targetScore = Math.min(100, Math.max(0, score));
    const duration = 1000; // 1 second animation
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetScore - startValue) * easeOut;
      
      setAnimatedScore(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, isLoading]);

  /**
   * Renders the trend indicator arrow and value
   */
  const renderTrendIndicator = () => {
    if (!trend) return null;

    const trendDisplay = formatTrendValue(trendValue, trend);
    
    const trendConfig = {
      up: {
        Icon: ArrowUp,
        colorClass: 'text-emerald-500',
      },
      down: {
        Icon: ArrowDown,
        colorClass: 'text-red-500',
      },
      stable: {
        Icon: Minus,
        colorClass: 'text-gray-400',
      },
    };

    const { Icon, colorClass } = trendConfig[trend];

    return (
      <div 
        className={`flex items-center gap-0.5 ${sizeConfig.trendSize} font-semibold ${colorClass}`}
        aria-label={`Trend: ${trend}, change: ${trendDisplay}`}
      >
        <Icon className={sizeConfig.iconSize} aria-hidden="true" />
        <span>{trendDisplay}</span>
      </div>
    );
  };

  /**
   * Renders the explanation tooltip content
   */
  const renderTooltip = () => {
    if (!showTooltipProp) return null;

    return (
      <div className="relative inline-block ml-1">
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 cursor-help transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
          onMouseEnter={() => setIsTooltipVisible(true)}
          onMouseLeave={() => setIsTooltipVisible(false)}
          onFocus={() => setIsTooltipVisible(true)}
          onBlur={() => setIsTooltipVisible(false)}
          aria-label="Information about AI Touch Score"
          aria-describedby="ai-touch-score-tooltip"
        >
          <Info className="w-4 h-4" />
        </button>
        
        {isTooltipVisible && (
          <div
            id="ai-touch-score-tooltip"
            role="tooltip"
            className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg"
          >
            <div className="font-semibold mb-1.5">AI Touch Score Explained</div>
            <p className="text-gray-300 mb-2">
              Represents your asset&apos;s estimated contribution to AI model training on a 0-100 scale.
            </p>
            <div className="text-gray-400">
              <span className="font-medium text-gray-300">Based on:</span>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>Asset uniqueness</li>
                <li>Content quality</li>
                <li>Metadata richness</li>
              </ul>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders loading placeholder
   */
  if (isLoading) {
    return (
      <div 
        className={`flex flex-col items-center justify-center ${className}`}
        aria-label="Loading AI Touch Score"
        aria-busy="true"
      >
        <div 
          style={{ width: containerSize, height: containerSize }}
          className="relative"
        >
          <svg
            viewBox={`0 0 ${containerSize} ${containerSize}`}
            className="transform -rotate-90 animate-pulse"
            style={{ width: containerSize, height: containerSize }}
          >
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
            />
            {/* Placeholder progress */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#D1D5DB"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * 0.7}
              strokeLinecap="round"
              className="opacity-50"
            />
          </svg>
          {/* Placeholder text */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className={`${sizeConfig.fontSize} font-bold text-gray-300`}>--</span>
          </div>
        </div>
        {showLabel && (
          <div className={`${sizeConfig.labelSize} font-medium text-gray-400 mt-2`}>
            AI Touch Score
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col items-center justify-center ${className}`}
      role="progressbar"
      aria-label={`AI Touch Score: ${formatScore(score)} out of 100`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(score)}
    >
      {/* Circular Progress SVG */}
      <div 
        style={{ width: containerSize, height: containerSize }}
        className="relative transition-transform duration-200 hover:scale-105"
      >
        <svg
          viewBox={`0 0 ${containerSize} ${containerSize}`}
          className="transform -rotate-90"
          style={{ width: containerSize, height: containerSize }}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            className="transition-all duration-300"
          />
          
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{
              filter: `drop-shadow(0 0 4px ${colors.stroke}40)`,
            }}
          />
        </svg>
        
        {/* Center score display */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span 
            className={`${sizeConfig.fontSize} font-bold ${colors.text} transition-colors duration-300`}
          >
            {formatScore(animatedScore)}
          </span>
          {size !== 'sm' && (
            <span className="text-xs text-gray-400">/ 100</span>
          )}
        </div>
      </div>

      {/* Label and tooltip */}
      {showLabel && (
        <div className="flex items-center mt-2">
          <span className={`${sizeConfig.labelSize} font-medium text-gray-700`}>
            AI Touch Score
          </span>
          {renderTooltip()}
        </div>
      )}

      {/* Trend indicator */}
      {trend && (
        <div className="mt-1">
          {renderTrendIndicator()}
        </div>
      )}
    </div>
  );
}
