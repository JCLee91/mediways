"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function LoadingBar() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300); // 300ms 후 로딩 완료로 처리

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]">
      <div className="h-0.5 bg-[#4f84f5] animate-pulse">
        <div 
          className="h-full bg-[#4f84f5] transition-all duration-300 ease-out"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
} 