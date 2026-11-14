import { Noto_Serif, Roboto_Condensed } from 'next/font/google';
import './globals.css';

const serif = Noto_Serif({ subsets: ['latin'], variable: '--serif' });
const cond = Roboto_Condensed({ subsets: ['latin'], weight: ['700'], variable: '--cond' });

export const metadata = { title: 'Seva Ride', description: 'Car and route sharing' };
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${cond.variable}`}>{children}</body>
    </html>
  );
}
