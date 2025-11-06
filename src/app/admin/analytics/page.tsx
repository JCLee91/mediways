"use client";

import { useEffect, useState } from "react";
import { FileText, Users, TrendingUp, Activity } from "lucide-react";
import AdminCard from "@/components/admin/AdminCard";

interface DailyStats {
  date: string;
  count: number;
}

interface TypeStats {
  type: string;
  count: number;
  percentage: number;
}

// 캐시 저장소
const cachedData: { [key: string]: any } = {};
const cacheTime: { [key: string]: number } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5분

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7"); // 기본값: 최근 7일
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [typeStats, setTypeStats] = useState<TypeStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalGenerations: 0,
    totalUsers: 0,
    avgPerUser: 0,
    avgPerDay: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // 캐시 확인
      const cacheKey = `analytics-${dateRange}`;
      if (cachedData[cacheKey] && cacheTime[cacheKey] && Date.now() - cacheTime[cacheKey] < CACHE_DURATION) {
        const cached = cachedData[cacheKey];
        setDailyStats(cached.dailyStats);
        setTypeStats(cached.typeStats);
        setTotalStats(cached.totalStats);
        setLoading(false);
        return;
      }
      
      // Use admin API to fetch analytics
      const response = await fetch(`/api/admin/analytics?dateRange=${dateRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const { dailyStats, typeStats, totalStats } = await response.json();
      
      setDailyStats(dailyStats);
      setTypeStats(typeStats);
      setTotalStats(totalStats);
      
      // 캐시 저장
      cachedData[cacheKey] = { dailyStats, typeStats, totalStats };
      cacheTime[cacheKey] = Date.now();

    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="px-12 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-normal text-white">통계 분석</h1>
        
        {/* Date Range Selector */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-[#1e2029] border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-gray-700 focus:outline-none"
        >
          <option value="7">최근 7일</option>
          <option value="30">최근 30일</option>
          <option value="90">최근 90일</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <AdminCard 
          title="전체 생성" 
          value={totalStats.totalGenerations} 
          icon={FileText} 
        />
        <AdminCard 
          title="활성 사용자" 
          value={totalStats.totalUsers} 
          icon={Users} 
        />
        <AdminCard 
          title="사용자당 평균" 
          value={totalStats.avgPerUser} 
          icon={Activity} 
        />
        <AdminCard 
          title="일평균 생성" 
          value={totalStats.avgPerDay} 
          icon={TrendingUp} 
        />
      </div>

      {/* Daily Trend Chart */}
      <div className="bg-[#1e2029] border border-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-white mb-4">일별 사용량 추이</h2>
        <div className="h-64 flex items-end gap-2">
          {dailyStats.map((stat, index) => {
            const maxCount = Math.max(...dailyStats.map(s => s.count));
            const height = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full flex items-end h-48">
                  <div
                    className="w-full bg-[#4f84f5] rounded-t transition-all duration-300 hover:bg-[#4574e5]"
                    style={{ height: `${height}%` }}
                  >
                    {stat.count > 0 && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
                        {stat.count}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 transform rotate-45 origin-left">
                  {stat.date.split('.').slice(1, 3).join('/')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Type Distribution */}
      <div className="bg-[#1e2029] border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">콘텐츠 타입별 분포</h2>
        <div className="space-y-4">
          {typeStats.map((stat) => (
            <div key={stat.type}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-300">{stat.type}</span>
                <span className="text-gray-400">{stat.count}개 ({stat.percentage}%)</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-[#4f84f5] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}