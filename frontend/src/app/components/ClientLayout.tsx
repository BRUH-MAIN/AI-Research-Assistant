"use client";

import React, { useEffect, useState } from 'react';
import { UserProvider } from '../contexts';
import Navigation from './Navigation';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <UserProvider>
      <Navigation />
      <main className="h-[calc(100vh-4rem)] overflow-hidden">
        {children}
      </main>
    </UserProvider>
  );
}