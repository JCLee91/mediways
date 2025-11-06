"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search } from "lucide-react";
import AdminTable from "@/components/admin/AdminTable";
import AdminModal from "@/components/admin/AdminModal";
import AdminPagination from "@/components/admin/AdminPagination";

const ITEMS_PER_PAGE = 20;

interface UserData {
  user_id: string;
  email: string;
  created_at: string;
  total_generations: number;
  last_activity: string;
}

// 캐시 저장소
let cachedData: { users: UserData[]; totalPages: number; totalCount: number } | null = null;
let cacheTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userDetails, setUserDetails] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, [page, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // 캐시 확인 (검색어가 없고 첫 페이지인 경우만 캐시 사용)
      if (!searchTerm && page === 1 && cachedData && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
        setUsers(cachedData.users);
        setTotalPages(cachedData.totalPages);
        setTotalCount(cachedData.totalCount);
        setLoading(false);
        return;
      }
      
      // Use admin API to fetch users with statistics
      const response = await fetch(`/api/admin/users?page=${page}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const { data, count } = await response.json();
      const safeCount = typeof count === 'number' ? count : 0;
      setTotalPages(Math.max(1, Math.ceil(safeCount / ITEMS_PER_PAGE)));
      setTotalCount(safeCount);

      setUsers(data || []);
      
      // 캐시 저장 (검색어가 없고 첫 페이지인 경우만)
      if (!searchTerm && page === 1) {
        cachedData = { 
          users: data || [], 
          totalPages: Math.max(1, Math.ceil(safeCount / ITEMS_PER_PAGE)),
          totalCount: safeCount,
        };
        cacheTime = Date.now();
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/details`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      
      const { data } = await response.json();
      setUserDetails(data || []);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }
  };

  const handleUserClick = async (user: UserData) => {
    setSelectedUser(user);
    await fetchUserDetails(user.user_id);
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
        <h1 className="text-2xl font-normal text-white mb-8">사용자 관리</h1>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1); // 검색 시 첫 페이지로 이동
            }}
            placeholder="이메일로 검색..."
            className="w-full pl-10 pr-4 py-2 bg-[#1e2029] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-gray-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#1e2029] border border-gray-800 rounded-lg overflow-hidden">
        <AdminTable headers={["이메일", "생성 콘텐츠", "가입일", "마지막 활동", "상세"]}>
          {users.map((user) => (
            <tr key={user.user_id} className="hover:bg-gray-800/50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {user.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {user.total_generations}개
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {new Date(user.created_at).toLocaleDateString('ko-KR')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {new Date(user.last_activity).toLocaleString('ko-KR')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  onClick={() => handleUserClick(user)}
                  className="text-[#4f84f5] hover:text-[#4574e5]"
                >
                  보기
                </button>
              </td>
            </tr>
          ))}
        </AdminTable>

        {/* Pagination */}
        {totalPages > 1 && (
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemsInfo={`전체 ${(page - 1) * ITEMS_PER_PAGE + 1} - ${Math.min(page * ITEMS_PER_PAGE, totalCount)} / ${totalCount}`}
          />
        )}
      </div>

      {/* User Detail Modal */}
      <AdminModal
        isOpen={!!selectedUser}
        onClose={() => {
          setSelectedUser(null);
          setUserDetails([]);
        }}
        title="사용자 상세 정보"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">이메일</p>
                <p className="text-white">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">전체 생성 콘텐츠</p>
                    <p className="text-white">{selectedUser.total_generations}개</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">가입일</p>
                    <p className="text-white">{new Date(selectedUser.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">마지막 활동</p>
                    <p className="text-white">{new Date(selectedUser.last_activity).toLocaleString('ko-KR')}</p>
                  </div>
                </div>

                {/* Recent Activities */}
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">최근 활동 내역</h3>
                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="px-4 py-2 text-left text-xs text-gray-400">타입</th>
                          <th className="px-4 py-2 text-left text-xs text-gray-400">생성일시</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {userDetails.map((detail) => (
                          <tr key={detail.id}>
                            <td className="px-4 py-2 text-sm text-gray-300">
                              {detail.type}{detail.sub_type && ` (${detail.sub_type})`}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-300">
                              {new Date(detail.created_at).toLocaleString('ko-KR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
        )}
      </AdminModal>
    </div>
  );
}