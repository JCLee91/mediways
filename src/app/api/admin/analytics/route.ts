import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/adminGuard";

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.response;
    }
    const { user, adminSupabase } = authResult;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateRange = parseInt(searchParams.get('dateRange') || '7');

    // Use SQL RPC to aggregate analytics (KST boundaries)
    const { data, error } = await adminSupabase.rpc('get_admin_analytics', { p_days: dateRange });
    if (error) {
      console.error('get_admin_analytics error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const row: any = Array.isArray(data) ? data[0] : null;

    return NextResponse.json({
      dailyStats: row?.daily_stats ?? [],
      typeStats: row?.type_stats ?? [],
      totalStats: row?.total_stats ?? { totalGenerations: 0, totalUsers: 0, avgPerUser: 0, avgPerDay: 0 }
    }, {
      headers: { 'Cache-Control': 'private, max-age=60' }
    });
    
  } catch (error) {
    console.error('Admin analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}