'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ls } from '@/lib/safe';

export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace(ls.get('token') ? '/dashboard' : '/login'); }, [router]);
  return null;
}
