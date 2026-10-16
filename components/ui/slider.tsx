'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/** Minimal range input styled to match shadcn tokens. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  disabled,
  id,
  className,
  ...rest
}: SliderProps) {
  return (
    <input
      type="range"
      id={id}
      aria-label={rest['aria-label']}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={cn(
        'h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:opacity-50',
        className,
      )}
    />
  );
}
