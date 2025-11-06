import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FileText, Users, TrendingUp } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";
import AdminTable from "@/components/admin/AdminTable";

interface Stats {
  totalLogs: number;
  todayLogs: number;
  totalUsers: number;
}

interface RecentLog {
  id: string;
  user_id: string;
  user_email?: string;
  type: string;
  sub_type?: string;
  created_at: string;
}

export default async function AdminDashboard() {
  // Check if user is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.user_metadata?.is_admin !== true) {
    redirect("/");
  }

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Single RPC for dashboard stats and recent logs
  const { data: rpcData, error } = await adminSupabase.rpc('get_admin_dashboard', { p_recent_limit: 5 });
  if (error) {
    console.error('get_admin_dashboard error:', error);
  }
  const row: any = Array.isArray(rpcData) ? rpcData[0] : null;

  const stats: Stats = {
    totalLogs: row?.total_logs ?? 0,
    todayLogs: row?.today_logs ?? 0,
    totalUsers: row?.total_users ?? 0,
  };

  const recentLogs: RecentLog[] = Array.isArray(row?.recent_logs) ? (row.recent_logs as RecentLog[]) : [];

  return (
    <div className="px-12 py-8">
        <h1 className="text-2xl font-normal text-white mb-8">관리자 대시보드</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <AdminCard 
          title="전체 콘텐츠" 
          value={stats.totalLogs} 
          icon={FileText} 
        />
        <AdminCard 
          title="오늘 생성" 
          value={stats.todayLogs} 
          icon={TrendingUp} 
        />
        <AdminCard 
          title="전체 사용자" 
          value={stats.totalUsers} 
          icon={Users} 
        />
      </div>

      {/* Recent Logs */}
      <div>
        <h2 className="text-lg font-medium text-white mb-4">최근 생성된 콘텐츠</h2>
        <AdminTable headers={["사용자", "타입", "생성일시"]}>
          {recentLogs.map((log: RecentLog) => (
            <tr key={log.id} className="hover:bg-gray-800/50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {log.user_email || log.user_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {log.type}{log.sub_type && ` (${log.sub_type})`}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {new Date(log.created_at).toLocaleString('ko-KR')}
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </div>
  );
}