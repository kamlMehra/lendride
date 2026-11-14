'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUser } from '@/lib/api';
import { Icon } from './Icons';

export default function BottomNav() {
  const path = usePathname();
  const [user, setUser] = useState(null);
  useEffect(() => setUser(getUser()), []);
  if (!user || user.role !== 'coordinator') return null; // drivers only have the home screen

  const items = [
    { href: '/dashboard', label: 'Home', icon: 'home' },
    { href: '/trips/new', label: 'New route', icon: 'plus' },
    { href: '/passengers', label: 'Passengers', icon: 'users' },
    { href: '/users', label: 'Users', icon: 'user' },
    { href: '/records', label: 'Records', icon: 'calendar' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={path === i.href ? 'on' : ''}>
          <Icon name={i.icon} size={24} /><span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
