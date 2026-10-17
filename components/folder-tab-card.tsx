'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type FolderTone = 'jade' | 'mint';

/** Solid tone used by the tab ear, so the band and the body share one continuous edge. */
const TONE_SOLID: Record<FolderTone, string> = {
  jade: '#4FB8B4',
  mint: '#98D8D0',
};

const TONE_BODY: Record<FolderTone, string> = {
  jade: 'linear-gradient(180deg, #4FB8B4 0%, #63C4BF 52%, #98D8D0 100%)',
  mint: 'linear-gradient(180deg, #98D8D0 0%, #C2E9E4 52%, #E2F4F0 100%)',
};

/**
 * Stacked folder-tab card — two interlocking layers, never a plain rounded rectangle.
 *
 * 1. Dark base (`#04222B`, rounded-3xl) whose top-right slot stays exposed with the
 *    idle-clock and billing-date read-out (11px, `#E2F4F0`).
 * 2. Light cut-out face (`#4FB8B4` / `#98D8D0`): the left 38% rises into a folder tab ear
 *    carrying the category label, then dives 34px through a smooth cubic Bézier to uncover
 *    that slot. Inside: a bold title, exactly two pills, a 1px divider and a two-column
 *    footer.
 */
export function FolderTabCard({
  tab,
  metaTime,
  metaDate,
  tone = 'jade',
  title,
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
  /** Exactly two rounded pills / interactive buttons. */
  pills: React.ReactNode;
  footerLeft: React.ReactNode;
  footerRight: React.ReactNode;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <section className={cn('relative mt-5', className)}>
      {/* Layer 1 — dark base. */}
      <div className="absolute inset-0 rounded-3xl bg-holst-950" />
      <div className="absolute right-4 top-2.5 z-20 flex items-center gap-2 text-[11px] text-holst-50/85">
        <span>{metaTime}</span>
        <span className="h-3 w-px bg-holst-50/25" />
        <span>{metaDate}</span>
      </div>

      {/* Layer 2 — light cut-out face that interlocks with the base. */}
      <div className="relative">
        <svg viewBox="0 0 360 34" preserveAspectRatio="none" className="block h-[34px] w-full" aria-hidden>
          {/* Tab ear on the left 38%, then an S-curve dive of 34px. */}
          <path d="M0 26 Q0 0 26 0 H130 C158 0 168 34 196 34 H360 V40 H0 Z" fill={TONE_SOLID[tone]} />
        </svg>

        {/* Category label riding the raised ear. */}
        <span className="pointer-events-none absolute left-4 top-[7px] z-10 max-w-[36%] truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-holst-950/75">
          {tab}
        </span>

        <div className="rounded-b-3xl px-4 pb-4 pt-3.5" style={{ background: TONE_BODY[tone] }}>
          <button
            type="button"
            onClick={onSelect}
            disabled={!onSelect}
            className="block w-full text-left disabled:cursor-default"
          >
            <h3 className="text-[17px] font-extrabold leading-snug tracking-[-0.03em] text-holst-950">{title}</h3>
          </button>

          <div className="mt-2.5 flex gap-2">{pills}</div>

          <div className="my-3 h-px w-full bg-holst-950/15" />

          <div className="flex items-end justify-between gap-3">
            <span className="text-[10.5px] leading-tight text-holst-950/70">{footerLeft}</span>
            <span className="duo-num shrink-0 text-[12.5px] font-extrabold text-holst-950">{footerRight}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
