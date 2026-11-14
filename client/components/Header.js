'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/api';
import { ls, str } from '@/lib/safe';
import Logo from './Logo';
import { Avatar, Icon } from './Icons';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  useEffect(() => setUser(getUser()), []);
  const logout = () => { ls.clear(); router.push('/login'); };
  return (
    <header className="site-header">
      <Logo />
      <div className="brand-text">
        <h1>Seva Ride</h1>
        <p>Car and route sharing</p>
      </div>
      {user && (
        <>
          <div className="user-chip">
            <div><b>{str(user.name).split(' ')[0] || 'User'}</b><span>{str(user.role)}</span></div>
            <Avatar name={str(user.name)} light />
          </div>
          <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out"><Icon name="logout" size={20} /></button>
        </>
      )}
    </header>
  );
}
