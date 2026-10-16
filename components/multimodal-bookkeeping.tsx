'use client';

import * as React from 'react';
import { Camera, Check, Keyboard, Mic, MicOff, ShieldAlert, Trash2, X } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { toISODate, formatRM, cn } from '@/lib/utils';
import { BOOKING_CATEGORIES, mockReceiptExtraction, parseBookingText, type BookingDraft } from '@/lib/bookkeeping';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ *
 * Minimal Web Speech API typings (browser-only, optional feature).
 * ------------------------------------------------------------------ */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Mode = 'RECEIPT' | 'VOICE' | 'CHAT';

/**
 * P2 Multimodal Bookkeeping (plan.md Section 5.5).
 *
 * Receipt image, voice transcript and typed text all converge on ONE editable draft.
 * Nothing is booked until the user clicks Confirm. The receipt image is previewed from
 * a local object URL and is NEVER uploaded or persisted; it is discarded on confirm.
 */
export function MultimodalBookkeeping() {
  const bookExpense = useCtrlPayStore((s) => s.bookExpense);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>('CHAT');
  const [draft, setDraft] = React.useState<BookingDraft | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [chatText, setChatText] = React.useState('');
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [listening, setListening] = React.useState(false);

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const voiceSupported = React.useMemo(() => getSpeechRecognition() !== null, []);

  const todayISO = toISODate(sandboxClock);

  const clearPreview = React.useCallback(() => {
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }, []);

  // Drop the local image reference on unmount — nothing is ever persisted.
  React.useEffect(() => clearPreview, [clearPreview]);

  function resetDraft() {
    setDraft(null);
    clearPreview();
  }

  function draftFromText(text: string, source: 'VOICE' | 'CHAT') {
    setError(null);
    setNotice(null);
    const parsed = parseBookingText(text, { todayISO, source });
    if (!parsed) {
      setError('I could not find an amount in that. Try: "I spent RM 12 on lunch".');
      return;
    }
    setDraft(parsed);
  }

  function handleReceiptFile(file: File | undefined) {
    if (!file) return;
    clearPreview();
    setError(null);
    setNotice(null);
    setPreviewUrl(URL.createObjectURL(file));
    setDraft(mockReceiptExtraction(file.name, { todayISO }));
  }

  function startVoice() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError('Voice input is not supported in this browser. Type the amount instead.');
      return;
    }
    setError(null);
    setNotice(null);
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = 'en-MY';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setChatText(transcript);
      draftFromText(transcript, 'VOICE');
    };
    rec.onerror = () => setError('Speech recognition failed. You can type the amount instead.');
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function confirmBooking() {
    if (!draft) return;
    bookExpense({
      merchant: draft.merchant,
      amount: draft.amountRM,
      category: draft.category,
      isNeed: draft.isNeed,
      source: draft.source,
    });
    setNotice(`Booked ${formatRM(draft.amountRM)} at ${draft.merchant}. The receipt image was discarded.`);
    setChatText('');
    resetDraft();
  }

  const tabClass = (m: Mode) =>
    cn(
      'flex items-center gap-1 rounded-md border px-2 py-1 text-xs',
      mode === m ? 'border-primary bg-primary/10 text-foreground' : 'text-muted-foreground',
    );

  return (
    <div className="rounded-md border bg-secondary/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Camera className="h-3.5 w-3.5" /> Multimodal bookkeeping
          <Badge variant="outline">P2 · confirm before book</Badge>
        </span>
        <span className="text-muted-foreground">{open ? 'Hide' : 'Add an expense'}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t p-3">
          <div className="flex flex-wrap gap-1">
            <button type="button" className={tabClass('CHAT')} onClick={() => setMode('CHAT')}>
              <Keyboard className="h-3 w-3" /> Type
            </button>
            <button type="button" className={tabClass('RECEIPT')} onClick={() => setMode('RECEIPT')}>
              <Camera className="h-3 w-3" /> Receipt photo
            </button>
            <button type="button" className={tabClass('VOICE')} onClick={() => setMode('VOICE')}>
              <Mic className="h-3 w-3" /> Voice
            </button>
          </div>

          {mode === 'CHAT' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder='e.g. "I spent RM 12 on lunch"'
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  aria-label="Expense text"
                />
                <Button size="sm" onClick={() => draftFromText(chatText, 'CHAT')}>
                  Parse
                </Button>
              </div>
            </div>
          )}

          {mode === 'RECEIPT' && (
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleReceiptFile(e.target.files?.[0])}
                className="block w-full text-xs"
                aria-label="Receipt image"
              />
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Receipt preview (kept in memory only)" className="max-h-32 rounded-md border" />
              )}
              <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                Sandbox stand-in for a vision-LLM call. The image is previewed from memory only, never uploaded or
                written to disk, and is discarded when you confirm or discard. Production runs the extraction in
                memory and drops the image after confirmation.
              </p>
            </div>
          )}

          {mode === 'VOICE' && (
            <div className="space-y-2">
              <Button size="sm" variant={listening ? 'destructive' : 'secondary'} onClick={listening ? stopVoice : startVoice}>
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {listening ? 'Stop' : 'Hold to talk'}
              </Button>
              {!voiceSupported && (
                <p className="text-[11px] text-muted-foreground">
                  Web Speech API not available here — type the amount instead.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Browser speech recognition may process your audio in the cloud. The transcript still goes through
                confirm-before-book.
              </p>
            </div>
          )}

          {error && <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
          {notice && <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">{notice}</p>}

          {draft && (
            <div className="space-y-2 rounded-md border bg-background p-3">
              <p className="text-xs font-medium">
                Confirm the extracted fields <Badge variant="outline">{draft.source}</Badge>
                <span className="ml-1 text-muted-foreground">confidence {Math.round(draft.confidence * 100)}%</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-muted-foreground">
                  Merchant
                  <input
                    value={draft.merchant}
                    onChange={(e) => setDraft({ ...draft, merchant: e.target.value })}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  Amount (RM)
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={draft.amountRM}
                    onChange={(e) => setDraft({ ...draft, amountRM: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  Date
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  Category
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value as BookingDraft['category'] })}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
                  >
                    {BOOKING_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={draft.isNeed}
                  onChange={(e) => setDraft({ ...draft, isNeed: e.target.checked })}
                />
                This is a NEED (protected from Escrow)
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmBooking} disabled={!draft.merchant || !(draft.amountRM > 0)}>
                  <Check className="h-4 w-4" /> Confirm & book
                </Button>
                <Button size="sm" variant="ghost" onClick={resetDraft}>
                  <X className="h-4 w-4" /> Discard
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetDraft}
                  aria-label="Clear draft"
                  className="text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
