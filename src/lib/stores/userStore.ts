import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface UserState {
  user: User | null;
  blogId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setBlogId: (blogId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      blogId: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      setUser: (user) => {
        const blogId = user?.user_metadata?.blog_id || null;
        set({ user, blogId, error: null });
      },

      setBlogId: (blogId) => {
        set({ blogId });
        // 사용자 메타데이터도 업데이트 (선택적)
        const { user } = get();
        if (user) {
          const updatedUser = {
            ...user,
            user_metadata: {
              ...user.user_metadata,
              blog_id: blogId
            }
          };
          set({ user: updatedUser });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      initialize: async () => {
        const { isLoading } = get();

        // 진행 중이면 스킵 (중복 호출 방지)
        if (isLoading) return;

        set({ isLoading: true, error: null });

        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.getUser();
          const isSessionMissing = error && (
            error.name === 'AuthSessionMissingError' ||
            error.message?.toLowerCase().includes('auth session missing')
          );
          if (error && !isSessionMissing) {
            throw error;
          }

          const sessionUser = isSessionMissing ? null : data?.user ?? null;
          const blogId = sessionUser?.user_metadata?.blog_id || null;
          set({
            user: sessionUser,
            blogId,
            isInitialized: true,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('User initialization failed:', error);
          set({
            user: null,
            blogId: null,
            isInitialized: true,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Authentication failed'
          });
        }
      },

      refresh: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.getUser();
          const isSessionMissing = error && (
            error.name === 'AuthSessionMissingError' ||
            error.message?.toLowerCase().includes('auth session missing')
          );
          
          if (error && !isSessionMissing) throw error;
          
          const sessionUser = isSessionMissing ? null : data?.user ?? null;
          const blogId = sessionUser?.user_metadata?.blog_id || null;
          set({ 
            user: sessionUser, 
            blogId, 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          console.error('User refresh failed:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Refresh failed',
            isLoading: false 
          });
        }
      },

      logout: async () => {
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
          set({ 
            user: null, 
            blogId: null, 
            isLoading: false,
            isInitialized: true,
            error: null 
          });
        } catch (error) {
          console.error('Logout failed:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Logout failed'
          });
        }
      }
    }),
    {
      name: 'mediways-user-store',
      partialize: (state) => ({
        // 로컬스토리지에는 사용자 정보와 blogId만 저장
        // isInitialized는 저장하지 않음 (매번 Supabase 세션 확인 필요)
        user: state.user,
        blogId: state.blogId,
      }),
    }
  )
);

// 앱 시작 시 자동 초기화를 위한 헬퍼
export const initializeUserStore = () => {
  const store = useUserStore.getState();
  if (!store.isInitialized) {
    store.initialize();
  }
};
