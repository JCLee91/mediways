import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminAuthResult {
  success: true;
  user: any;
  adminSupabase: ReturnType<typeof createAdminClient>;
}

export interface AdminAuthError {
  success: false;
  response: Response;
}

/**
 * 관리자 권한을 검증하고 필요한 클라이언트들을 반환합니다.
 * @returns 성공 시 user와 adminSupabase, 실패 시 에러 응답
 */
export async function verifyAdminAuth(): Promise<AdminAuthResult | AdminAuthError> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.user_metadata?.is_admin !== true) {
      return {
        success: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      };
    }

    return {
      success: true,
      user,
      adminSupabase: createAdminClient()
    };
  } catch (error) {
    console.error('Admin auth verification failed:', error);
    return {
      success: false,
      response: NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
    };
  }
}