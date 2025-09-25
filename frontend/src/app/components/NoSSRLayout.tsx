"use client";

import React from 'react';
import dynamic from 'next/dynamic';

const DynamicClientLayout = dynamic(() => import('./ClientLayout'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-950 text-white">
      <div>Loading...</div>
    </div>
  )
});

interface NoSSRLayoutProps {
  children: React.ReactNode;
}

export default function NoSSRLayout({ children }: NoSSRLayoutProps) {
  return <DynamicClientLayout>{children}</DynamicClientLayout>;
}