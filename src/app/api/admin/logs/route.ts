export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminGuard';

export async function GET(request: Request) {
  // Check if user is admin
  const authResult = await verifyAdminAuth();
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, adminSupabase } = authResult;
  
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const countOnly = searchParams.get('count') === 'true';
  const cursorParam = searchParams.get('cursor');
  let cursor: { created_at: string; id: string } | null = null;
  if (cursorParam) {
    try {
      cursor = JSON.parse(Buffer.from(cursorParam, 'base64').toString('utf-8'));
    } catch (error) {
      console.error('Invalid cursor parameter:', error);
    }
  }
  
  try {
    if (countOnly) {
      // Get total count using lighter COUNT(*) on view
      const { count, error: countError } = await adminSupabase
        .from('generations_with_email')
        .select('id', { count: 'exact', head: true });
      if (countError) {
        console.error('Count error:', countError);
      }
      const res = NextResponse.json({ count });
      res.headers.set('Cache-Control', 'private, max-age=60');
      return res;
    }
    
    // Keyset pagination when cursor is provided; otherwise first page
    let query = adminSupabase
      .from('generations_with_email')
      .select('id,user_id,user_email,type,sub_type,created_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (cursor) {
      // created_at < cursor.created_at OR (created_at = cursor.created_at AND id < cursor.id)
      query = query.or(`and(created_at.eq.${cursor.created_at},id.lt.${cursor.id}),created_at.lt.${cursor.created_at}`);
    }

    const { data, error } = await query.limit(limit);
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    // Compute next cursor from the last item
    const last = data && data.length > 0 ? data[data.length - 1] : null;
    const nextCursor = last ? Buffer.from(JSON.stringify({ created_at: last.created_at, id: last.id })).toString('base64') : null;

    const res = NextResponse.json({ data, nextCursor });
    res.headers.set('Cache-Control', 'private, max-age=60');
    return res;
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
