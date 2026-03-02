'use client';

import React from 'react';

// Color palette from ForgeGraph component for consistency
const C = {
  bg: "#08090d",
  surface: "#111219",
  surfaceAlt: "#161822",
  hover: "#1c1e2d",
  border: "#1f2235",
  borderActive: "#3b4068",
  text: "#e4e6f2",
  textMuted: "#6d7196",
  textDim: "#3a3e5c",
  accent: "#f97316",
  accentDim: "#f9731620",
  green: "#22c55e",
  greenDim: "#22c55e20",
  yellow: "#eab308",
  yellowDim: "#eab30820",
  red: "#ef4444",
  redDim: "#ef444420",
  blue: "#3b82f6",
  blueDim: "#3b82f620",
};

export type StatusType = 'empty' | 'draft' | 'review' | 'complete';
export type StatusSize = 'sm' | 'md' | 'lg';

export interface SpecificationStatusIndicatorProps {
  status: StatusType;
  size?: StatusSize;
  showText?: boolean;
  className?: string;
}

// Status configuration
const STATUS_CONFIG: Record<StatusType, {
  label: string;
  color: string;
  bgColor: string;
  percentage: number;
  description: string;
}> = {
  empty: {
    label: 'Empty',
    color: C.textDim,
    bgColor: C.border,
    percentage: 0,
    description: 'Section has no content yet'
  },
  draft: {
    label: 'Draft',
    color: C.yellow,
    bgColor: C.yellowDim,
    percentage: 25,
    description: 'Section has initial content but needs more detail'
  },
  review: {
    label: 'Review',
    color: C.accent,
    bgColor: C.accentDim,
    percentage: 75,
    description: 'Section is substantial but may need refinement'
  },
  complete: {
    label: 'Complete',
    color: C.green,
    bgColor: C.greenDim,
    percentage: 100,
    description: 'Section is comprehensive and ready'
  }
};

// Size configuration
const SIZE_CONFIG: Record<StatusSize, {
  diameter: number;
  strokeWidth: number;
  fontSize: string;
  textSize: string;
}> = {
  sm: {
    diameter: 24,
    strokeWidth: 2,
    fontSize: '8px',
    textSize: 'text-xs'
  },
  md: {
    diameter: 32,
    strokeWidth: 3,
    fontSize: '10px',
    textSize: 'text-sm'
  },
  lg: {
    diameter: 48,
    strokeWidth: 4,
    fontSize: '12px',
    textSize: 'text-base'
  }
};

export function SpecificationStatusIndicator({
  status,
  size = 'md',
  showText = false,
  className = ''
}: SpecificationStatusIndicatorProps) {
  const statusConfig = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];

  const radius = (sizeConfig.diameter - sizeConfig.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (statusConfig.percentage / 100) * circumference;

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      title={`${statusConfig.label}: ${statusConfig.description}`}
    >
      {/* Circular Progress Indicator */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: sizeConfig.diameter,
          height: sizeConfig.diameter
        }}
      >
        {/* Background Circle */}
        <svg
          width={sizeConfig.diameter}
          height={sizeConfig.diameter}
          className="absolute transform -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={sizeConfig.diameter / 2}
            cy={sizeConfig.diameter / 2}
            r={radius}
            stroke={statusConfig.bgColor}
            strokeWidth={sizeConfig.strokeWidth}
            fill="transparent"
          />

          {/* Progress Circle */}
          <circle
            cx={sizeConfig.diameter / 2}
            cy={sizeConfig.diameter / 2}
            r={radius}
            stroke={statusConfig.color}
            strokeWidth={sizeConfig.strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>

        {/* Percentage Text */}
        <div
          className="absolute inset-0 flex items-center justify-center font-bold font-mono"
          style={{
            color: statusConfig.color,
            fontSize: sizeConfig.fontSize
          }}
        >
          {status === 'empty' ? '—' : `${statusConfig.percentage}%`}
        </div>
      </div>

      {/* Status Text (Optional) */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-medium ${sizeConfig.textSize}`}
            style={{ color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>

          {size === 'lg' && (
            <span
              className="text-xs"
              style={{ color: C.textMuted }}
            >
              {statusConfig.description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Accessibility-focused variant with screen reader support
export function AccessibleSpecificationStatusIndicator({
  status,
  size = 'md',
  showText = false,
  className = ''
}: SpecificationStatusIndicatorProps) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="progressbar"
      aria-valuenow={statusConfig.percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Section completion: ${statusConfig.label} (${statusConfig.percentage}%)`}
    >
      <SpecificationStatusIndicator
        status={status}
        size={size}
        showText={showText}
        className={className}
      />

      {/* Screen reader only description */}
      <span className="sr-only">
        {statusConfig.description}
      </span>
    </div>
  );
}

// Batch indicator for showing overall specification completion
export interface BatchStatusIndicatorProps {
  sections: Array<{
    name: string;
    status: StatusType;
  }>;
  size?: StatusSize;
  className?: string;
}

export function BatchSpecificationStatusIndicator({
  sections,
  size = 'md',
  className = ''
}: BatchStatusIndicatorProps) {
  // Calculate overall completion
  const totalPercentage = sections.reduce((sum, section) => {
    return sum + STATUS_CONFIG[section.status].percentage;
  }, 0);

  const averagePercentage = sections.length > 0 ? Math.round(totalPercentage / sections.length) : 0;

  // Determine overall status based on average
  let overallStatus: StatusType = 'empty';
  if (averagePercentage >= 100) overallStatus = 'complete';
  else if (averagePercentage >= 75) overallStatus = 'review';
  else if (averagePercentage > 0) overallStatus = 'draft';

  const statusConfig = STATUS_CONFIG[overallStatus];
  const sizeConfig = SIZE_CONFIG[size];

  const radius = (sizeConfig.diameter - sizeConfig.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (averagePercentage / 100) * circumference;

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      title={`Overall completion: ${averagePercentage}% (${sections.length} sections)`}
    >
      {/* Overall Progress Circle */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: sizeConfig.diameter,
          height: sizeConfig.diameter
        }}
      >
        <svg
          width={sizeConfig.diameter}
          height={sizeConfig.diameter}
          className="absolute transform -rotate-90"
        >
          <circle
            cx={sizeConfig.diameter / 2}
            cy={sizeConfig.diameter / 2}
            r={radius}
            stroke={statusConfig.bgColor}
            strokeWidth={sizeConfig.strokeWidth}
            fill="transparent"
          />

          <circle
            cx={sizeConfig.diameter / 2}
            cy={sizeConfig.diameter / 2}
            r={radius}
            stroke={statusConfig.color}
            strokeWidth={sizeConfig.strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>

        <div
          className="absolute inset-0 flex items-center justify-center font-bold font-mono"
          style={{
            color: statusConfig.color,
            fontSize: sizeConfig.fontSize
          }}
        >
          {averagePercentage}%
        </div>
      </div>

      {/* Section breakdown tooltip on hover */}
      <div className="group relative">
        <span
          className={`${sizeConfig.textSize} font-medium`}
          style={{ color: statusConfig.color }}
        >
          {sections.length} sections
        </span>

        {/* Hover tooltip */}
        <div className="invisible group-hover:visible absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 rounded shadow-lg min-w-max" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <div className="space-y-1">
            {sections.map((section, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <SpecificationStatusIndicator status={section.status} size="sm" />
                <span style={{ color: C.text }}>{section.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpecificationStatusIndicator;