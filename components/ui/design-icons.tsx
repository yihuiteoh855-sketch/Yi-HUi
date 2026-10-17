import * as React from 'react';

/**
 * Three-tier stepped geometric logo from Image 3 (Nexora / CtrlPay emblem).
 * Three stacked horizontal bars with 45° angled cuts on the left.
 */
export function SteppedLogo({ className = 'h-5 w-6', color = '#04222B' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 28 20" fill="none" className={className} aria-hidden>
      {/* Top tier - shortest, indented on the left */}
      <path
        d="M8.5 2.5H26.5C27.3 2.5 28 3.2 28 4V4.5C28 5.3 27.3 6 26.5 6H10C9.4 6 8.8 5.6 8.5 5.1L7.2 3.8C6.9 3.2 7.3 2.5 8.5 2.5Z"
        fill={color}
      />
      {/* Middle tier - medium length */}
      <path
        d="M4.5 8.5H26.5C27.3 8.5 28 9.2 28 10V10.5C28 11.3 27.3 12 26.5 12H6C5.4 12 4.8 11.6 4.5 11.1L3.2 9.8C2.9 9.2 3.3 8.5 4.5 8.5Z"
        fill={color}
      />
      {/* Bottom tier - longest, starts furthest left */}
      <path
        d="M0.8 14.5H26.5C27.3 14.5 28 15.2 28 16V16.5C28 17.3 27.3 18 26.5 18H2C1.4 18 0.8 17.6 0.5 17.1L-0.3 15.8C-0.6 15.2 -0.2 14.5 0.8 14.5Z"
        fill={color}
      />
    </svg>
  );
}

/**
 * Unequal 3-line hamburger menu icon from Image 3 right top button.
 * Three horizontal lines of varying lengths: top medium, middle long, bottom short.
 */
export function UnequalMenuIcon({ className = 'h-4 w-4', color = '#04222B' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 20 16" fill="none" className={className} stroke={color} strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <line x1="2" y1="3" x2="14" y2="3" />
      <line x1="2" y1="8" x2="18" y2="8" />
      <line x1="2" y1="13" x2="10" y2="13" />
    </svg>
  );
}

/**
 * Hand holding coin icon from Image 2 (Expense Overview header).
 */
export function HandHoldingCoinIcon({ className = 'h-5 w-5', color = '#04222B' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Coin floating above */}
      <circle cx="12" cy="6" r="3.5" />
      <path d="M12 4.5v3M10.8 5.4h2.4" />
      {/* Hand beneath */}
      <path d="M3 15.5c2.5-1.5 5-2 8-2 2.5 0 4.5.8 7 2.2l2.5 1.5a2 2 0 0 1 .5 2.8l-.5.8a2 2 0 0 1-2.5.7L14 19.5" />
      <path d="M3 15.5v4a2 2 0 0 0 2 2h6" />
    </svg>
  );
}
