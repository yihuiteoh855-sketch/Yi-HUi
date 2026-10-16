import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CtrlPay — Stop Paying Blindly. Let AI Control the Flow.',
  description:
    'CtrlPay is a proactive defensive personal-finance agent sandbox for university students. It detects, simulates and proposes; the human decides and signs. No real money moves.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
