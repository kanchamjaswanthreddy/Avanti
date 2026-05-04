import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Avanti — School Management Platform',
  description: 'India-first AI-native school management operating system.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
