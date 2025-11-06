"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminTable from "@/components/admin/AdminTable";
import AdminModal from "@/components/admin/AdminModal";
import AdminPagination from "@/components/admin/AdminPagination";

const ITEMS_PER_PAGE = 20;

// 캐시 저장소
let cachedData: { logs: any[]; totalPages: number; totalCount: number } | null = null;
let cacheTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // 캐시 확인 (첫 페이지인 경우만 캐시 사용)
      if (page === 1 && cachedData && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
        setLogs(cachedData.logs);
        setTotalPages(cachedData.totalPages);
        setTotalCount(cachedData.totalCount);
        setLoading(false);
        return;
      }
      
      // 첫 페이지에서만 총 카운트 별도 호출
      let total = totalCount;
      if (page === 1) {
        const countRes = await fetch(`/api/admin/logs?count=true`);
        if (countRes.ok) {
          const { count } = await countRes.json();
          total = typeof count === 'number' ? count : 0;
          setTotalCount(total);
          setTotalPages(Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)));
        }
      }

      // 페이지 데이터만 가져오기 (keyset 기반)
      const response = await fetch(`/api/admin/logs?page=${page}&limit=${ITEMS_PER_PAGE}${page > 1 && nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const { data, nextCursor: newCursor } = await response.json();
      if (newCursor) setNextCursor(newCursor);

      setLogs(data || []);
      
      // 캐시 저장 (첫 페이지인 경우만)
      if (page === 1) {
        cachedData = { 
          logs: data || [], 
          totalPages: Math.max(1, Math.ceil((total || 0) / ITEMS_PER_PAGE)),
          totalCount: total || 0,
        };
        cacheTime = Date.now();
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-2xl font-normal text-white mb-8">콘텐츠 로그</h1>

      {/* Logs Table */}
      <div className="bg-[#1e2029] border border-gray-800 rounded-lg overflow-hidden">
        <AdminTable headers={["사용자", "타입", "생성일시", "상세"]}>
          {logs.map((log) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-[#4f84f5] hover:text-[#4574e5]"
                    >
                      보기
                    </button>
                  </td>
                </tr>
          ))}
        </AdminTable>

        {/* Pagination */}
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          itemsInfo={`전체 ${(page - 1) * ITEMS_PER_PAGE + 1} - ${Math.min(page * ITEMS_PER_PAGE, totalCount)} / ${totalCount}`}
        />
      </div>

      {/* Log Detail Modal */}
      <AdminModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="로그 상세"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">사용자</p>
              <p className="text-white">{selectedLog.user_email || selectedLog.user_id}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 mb-1">타입</p>
                  <p className="text-white">{selectedLog.type}{selectedLog.sub_type && ` (${selectedLog.sub_type})`}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 mb-1">생성일시</p>
                  <p className="text-white">{new Date(selectedLog.created_at).toLocaleString('ko-KR')}</p>
                </div>
                
                {/* 요청 정보 */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">요청 정보</p>
                  <div className="bg-gray-900 p-4 rounded-lg space-y-2">
                    {selectedLog.input_data && (() => {
                      const data = selectedLog.input_data;
                      // data 필드가 있으면 그 안의 내용을, 없으면 전체 input_data를 표시
                      const displayData = data.data || data;
                      
                      return Object.entries(displayData).map(([key, value]) => {
                        // 빈 값은 표시하지 않음
                        if (!value || value === '') return null;
                        
                        return (
                          <div key={key} className="flex items-start gap-2">
                            <span className="text-gray-400 text-sm min-w-[100px]">
                              {key === 'topic' ? '주제' :
                               key === 'keywords' ? '키워드' :
                               key === 'tone' ? '톤' :
                               key === 'toneExample' ? '톤 예시' :
                               key === 'length' ? '길이' :
                               key === 'intent' ? '검색 의도' :
                               key === 'platform' ? '플랫폼' :
                               key === 'product' ? '제품/서비스' :
                               key === 'goal' ? '목표' :
                               key === 'target' ? '타겟' :
                               key === 'channel' ? '채널명' :
                               key === 'format' ? '포맷' :
                               key === 'type' ? '타입' :
                               key === 'subType' ? '서브타입' :
                               key === 'audience' ? '대상' :
                               key === 'message' ? '핵심 메시지' :
                               key === 'content' ? '내용' :
                               key === 'prompt' ? '프롬프트' :
                               key}:
                            </span>
                            <span className="text-gray-300 text-sm flex-1">
                              {typeof value === 'string' ? value : 
                               typeof value === 'object' ? JSON.stringify(value, null, 2) : 
                               String(value)}
                            </span>
                          </div>
                        );
                      }).filter(Boolean);
                    })()}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 mb-2">생성된 콘텐츠</p>
                  <div className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 whitespace-pre-wrap">
                    {selectedLog.output_content}
                  </div>
                </div>
              </div>
        )}
      </AdminModal>
    </div>
  );
}