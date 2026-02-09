'use client';

import React, { useState } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { ReadinessState, calculatePercentage, getColorForReadiness } from '@/stores/readinessStore';

interface ReadinessIndicatorProps {
  readiness: ReadinessState;
  variant?: 'small' | 'medium' | 'large';
  displayMode?: 'percentage' | 'states';
  onClick?: () => void;
  className?: string;
  showHover?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
}

const VARIANT_SIZES = {
  small: 24,
  medium: 48,
  large: 96,
} as const;

const ReadinessIndicator: React.FC<ReadinessIndicatorProps> = ({
  readiness,
  variant = 'medium',
  displayMode = 'percentage',
  onClick,
  className = '',
  showHover = true,
  isLoading = false,
  hasError = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const size = VARIANT_SIZES[variant];
  const percentage = calculatePercentage(readiness);
  const color = getColorForReadiness(percentage);

  // Determine if this is "on the bubble" (one dimension away from complete)
  const completeDimensions = [
    readiness.design,
    readiness.backend,
    readiness.frontend,
    readiness.integration,
    readiness.test,
    readiness.deployment,
  ].filter(value => value >= 80).length;

  const isOnTheBubble = completeDimensions >= 5 && percentage < 80;

  // Calculate display value
  const getDisplayValue = () => {
    if (displayMode === 'percentage') {
      return `${percentage}%`;
    } else {
      const completed = [
        readiness.design,
        readiness.backend,
        readiness.frontend,
        readiness.integration,
        readiness.test,
        readiness.deployment,
      ].filter(value => value >= 80).length;
      return `${completed}/6`;
    }
  };

  // Get dimensions breakdown for tooltip
  const getDimensionsBreakdown = () => {
    const dimensions = [
      { name: 'Design', value: readiness.design },
      { name: 'Backend', value: readiness.backend },
      { name: 'Frontend', value: readiness.frontend },
      { name: 'Integration', value: readiness.integration },
      { name: 'Test', value: readiness.test },
      { name: 'Deployment', value: readiness.deployment },
    ];

    return dimensions;
  };

  const progressbarStyles = buildStyles({
    textSize: variant === 'small' ? '24px' : variant === 'medium' ? '16px' : '12px',
    pathColor: isLoading ? '#9CA3AF' : color,
    textColor: isLoading ? '#9CA3AF' : '#1F2937',
    trailColor: '#F3F4F6',
    pathTransitionDuration: 0.3,
    strokeLinecap: 'round',
  });

  const containerClass = `
    relative inline-block transition-transform duration-200 cursor-pointer
    ${isHovered ? 'transform scale-105' : ''}
    ${hasError ? 'ring-2 ring-red-500 rounded-full' : ''}
    ${isOnTheBubble ? 'ring-2 ring-red-400 rounded-full animate-pulse' : ''}
    ${className}
  `;

  return (
    <div
      className={containerClass}
      style={{ width: size, height: size }}
      onMouseEnter={() => showHover && setIsHovered(true)}
      onMouseLeave={() => showHover && setIsHovered(false)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Main progress indicator */}
      <CircularProgressbar
        value={percentage}
        text={getDisplayValue()}
        styles={progressbarStyles}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-full">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
        </div>
      )}

      {/* Error indicator */}
      {hasError && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>
      )}

      {/* Hover tooltip for medium and large variants */}
      {isHovered && showHover && (variant === 'medium' || variant === 'large') && (
        <div className="absolute z-10 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg min-w-max"
             style={{
               bottom: '100%',
               left: '50%',
               transform: 'translateX(-50%)',
               marginBottom: '8px'
             }}>
          <div className="font-semibold mb-2">Readiness Breakdown</div>
          {getDimensionsBreakdown().map((dimension) => (
            <div key={dimension.name} className="flex justify-between items-center mb-1">
              <span className="mr-3">{dimension.name}:</span>
              <div className="flex items-center">
                <div className="w-8 h-2 bg-gray-700 rounded mr-2">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${dimension.value}%`,
                      backgroundColor: getColorForReadiness(dimension.value)
                    }}
                  />
                </div>
                <span className="w-8 text-right">{dimension.value}%</span>
              </div>
            </div>
          ))}

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}

      {/* Compact hover for small variant */}
      {isHovered && showHover && variant === 'small' && (
        <div className="absolute z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap"
             style={{
               bottom: '100%',
               left: '50%',
               transform: 'translateX(-50%)',
               marginBottom: '4px'
             }}>
          {percentage}% ready
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="border-2 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadinessIndicator;