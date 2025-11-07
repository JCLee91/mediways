import { createClient } from '@supabase/supabase-js';

/**
 * Service Role 클라이언트 (RLS 바이패스)
 * Webhook, Cron Job 등 사용자 세션이 없는 서버 사이드 작업용
 *
 * ⚠️ 주의: 이 클라이언트는 모든 RLS 정책을 우회합니다.
 * 사용자 요청 처리에는 createClient()를 사용하세요.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
