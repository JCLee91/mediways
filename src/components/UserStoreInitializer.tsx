"use client";

import { useEffect } from 'react';
import { useUserStore } from '@/lib/stores/userStore';

export default function UserStoreInitializer() {
  const initialize = useUserStore((state) => state.initialize);

  useEffect(() => {
    // isInitialized 체크 제거 - 매번 Supabase 세션 동기화
    initialize();
  }, [initialize]);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}
