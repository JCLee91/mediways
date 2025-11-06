import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/adminGuard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check if user is admin
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.response;
    }
    const { user, adminSupabase } = authResult;

    const { userId } = await params;

    // Get user's recent generations
    const { data } = await adminSupabase
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({ data: data || [] });
    
  } catch (error) {
    console.error('Admin user details API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}