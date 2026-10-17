import { MobileAppShell } from '@/components/mobile-app-shell';

/**
 * CtrlPay sandbox.
 *
 * The ONLY thing on screen is the phone App. There is deliberately no outer
 * dashboard, no side console, no external tables — the judge-facing sandbox
 * controls live inside the phone's `⚡ Sandbox` bottom sheet so the product
 * reads as a real consumer App.
 */
export default function Page() {
  return (
    <main className="ct-studio grid min-h-[100svh] w-full place-items-center p-6 max-[500px]:p-0">
      <MobileAppShell />
    </main>
  );
}
