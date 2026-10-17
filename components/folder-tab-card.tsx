'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type FolderTone = 'sky' | 'jade' | 'mint';

/** Solid tone used by the tab ear, so the band and the body share one continuous edge. */
const TONE_SOLID: Record<FolderTone, string> = {
  sky: '#74B2EB',
  jade: '#4FB8B4',
  mint: '#98D8D0',
};

const TONE_BODY: Record<FolderTone, string> = {
  sky: 'linear-gradient(180deg, #74B2EB 0%, #82BAEC 52%, #96C7F2 100%)',
  jade: 'linear-gradient(180deg, #4FB8B4 0%, #63C4BF 52%, #98D8D0 100%)',
  mint: 'linear-gradient(180deg, #98D8D0 0%, #C2E9E4 52%, #E2F4F0 100%)',
};

/**
 * Stacked folder-tab card — two interlocking layers matching Image 2 right screen.
 *
 * 1. Dark base (`#0B1E3F`, rounded-3xl) whose top-right slot stays exposed with the
 *    clock and billing-date read-out.
 * 2. Light cut-out face (`#74B2EB` sky): the left 38% rises into a folder tab ear
 *    carrying the category label, then dives 34px through a smooth cubic Bézier.
 */
export function FolderTabCard({
  tab,
  metaTime,
  metaDate,
  tone = 'sky',
  title,
  subtitle,
  logo,
  pills,
  footerLeft,
  footerRight,
  onSelect,
  className,
}: {
  tab: string;
  metaTime: string;
  metaDate: string;
  tone?: FolderTone;
  title: string;
  subtitle?: React.ReactNode;
  logo?: React.ReactNode;
  /** Exactly two rounded pills / interactive buttons. */
  pills: React.ReactNode;
  footerLeft: React.ReactNode;
  footerRight: React.ReactNode;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <section className={cn('relative mt-3', className)}>
      {/* Layer 1 — dark navy base matching Image 2. */}
      <div className="absolute inset-0 rounded-[26px] bg-[#0B1E3F] shadow-sm" />
      <div className="absolute right-4 top-2.5 z-20 flex items-center gap-2.5 text-[11px] font-medium text-white/90">
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 opacity-80" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3.5l2 1" strokeLinecap="round" />
          </svg>
          {metaTime}
        </span>
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 opacity-80" stroke="currentColor" strokeWidth="1.5">
            <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
            <path d="M2.5 6.5h11M5.5 2v2M10.5 2v2" strokeLinecap="round" />
          </svg>
          {metaDate}
        </span>
      </div>

      {/* Layer 2 — light cut-out face that interlocks with the base. */}
      <div className="relative">
        <svg viewBox="0 0 360 34" preserveAspectRatio="none" className="block h-[34px] w-full" aria-hidden>
          {/* Tab ear on the left 38%, then an S-curve dive of 34px. */}
          <path d="M0 26 Q0 0 26 0 H130 C158 0 168 34 196 34 H360 V40 H0 Z" fill={TONE_SOLID[tone]} />
        </svg>

        {/* Category label riding the raised ear. */}
        <span className="pointer-events-none absolute left-4 top-[7px] z-10 max-w-[36%] truncate text-[11.5px] font-bold tracking-[0.02em] text-[#0B1E3F]">
          {tab}
        </span>

        <div className="rounded-b-[26px] px-4 pb-4 pt-3 shadow-[0_12px_28px_rgba(11,30,63,0.12)]" style={{ background: TONE_BODY[tone] }}>
          <div className="flex items-center gap-3">
            {logo}
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={onSelect}
                disabled={!onSelect}
                className="block w-full text-left disabled:cursor-default"
              >
                <h3 className="truncate text-[16.5px] font-extrabold leading-snug tracking-[-0.02em] text-[#0B1E3F]">
                  {title}
                </h3>
              </button>
              {subtitle && (
                <p className="truncate text-[11px] font-semibold text-[#0B1E3F]/75 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2">{pills}</div>

          <div className="my-3 h-px w-full bg-white/40" />

          <div className="flex items-center justify-between gap-3 text-[11.5px]">
            <span className="font-semibold text-[#0B1E3F]/80">{footerLeft}</span>
            <span className="shrink-0 font-extrabold text-[#0B1E3F]">{footerRight}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
