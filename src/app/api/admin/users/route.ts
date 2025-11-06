import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/adminGuard";

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.response;
    }
    const { user, adminSupabase } = authResult;

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // SQL 함수에서 집계, 검색, 페이지네이션까지 처리
    const { data, error } = await adminSupabase
      .rpc('get_user_stats', { search, page, page_size: limit });

    if (error) {
      console.error('get_user_stats error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
    const count = rows[0]?.total_count || 0;

    return NextResponse.json({ data: rows, count });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}