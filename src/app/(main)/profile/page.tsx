"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useUserStore } from "@/lib/stores/userStore";
import { useLoadingStates } from "@/hooks/useLoadingStates";
import type { User } from "@supabase/supabase-js";

type Generation = {
  id: string;
  type: string;
  sub_type?: string;
  input_data: any;
  output_content: string;
  created_at: string;
};

export default function ProfilePage() {
  // 전역 스토어에서 사용자 정보 가져오기
  const { user, blogId: userBlogId, isInitialized, setBlogId: setGlobalBlogId } = useUserStore();
  const initializeStore = useUserStore(state => state.initialize);
  const refreshStore = useUserStore(state => state.refresh);
  
  // 통합 로딩 상태 관리
  const { isLoading, startLoading, stopLoading, setError, error } = useLoadingStates();
  
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [blogId, setBlogId] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGeneration, setSelectedGeneration] =
    useState<Generation | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "history">("profile");
  const [contentFilter, setContentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();
  const supabase = createClient();

  // 검색어 디바운스 처리
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  useEffect(() => {
    if (isInitialized) {
      initializeProfile();
    }
  }, [isInitialized, user]);

  const initializeProfile = async () => {
    let currentUser = user;
    if (!currentUser) {
      await refreshStore();
      currentUser = useUserStore.getState().user;
      if (!currentUser) {
        router.push("/login");
        return;
      }
    }

    setEmail(currentUser.email || "");
    setBlogId(useUserStore.getState().blogId || "");

    fetchGenerations();
  };

  if (!isInitialized || (!user && isLoading)) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-xl font-semibold text-white mb-4">마이페이지</h1>
        <p className="text-sm text-gray-400">사용자 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  const fetchGenerations = async () => {
    startLoading('fetch-history');
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        // 테이블이 없는 경우는 정상적인 상황 (아직 사용하지 않음)
        if (error.code !== "42P01") {
          console.error("Error fetching generations:", error);
          setError('생성 이력을 불러오는데 실패했습니다');
        }
      } else {
        setGenerations(data || []);
      }
    } catch (error: any) {
      // 에러 무시 - 테이블이 없는 것은 정상
    } finally {
      stopLoading('fetch-history');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 텍스트에서 검색어를 하이라이트
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-[#4f84f5]/30 text-white">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  const getContentTypeLabel = (type: string, subType?: string) => {
    const labels: { [key: string]: string } = {
      blog: "블로그",
      sns: "SNS 게시물",
      youtube: "유튜브 스크립트",
      copywriting: "카피라이팅",
    };

    let label = labels[type] || type;
    if (type === "blog" && subType) {
      label += ` (${subType === "review" ? "리뷰형" : "정보형"})`;
    }
    return label;
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    startLoading('update-email');
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;

      setMessage({
        type: "success",
        text: "이메일이 업데이트되었습니다. 새 이메일로 확인 메일이 발송되었습니다.",
      });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      stopLoading('update-email');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "새 비밀번호가 일치하지 않습니다." });
      return;
    }

    startLoading('update-password');
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setMessage({ type: "success", text: "비밀번호가 변경되었습니다." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      stopLoading('update-password');
    }
  };

  const handleUpdateBlogId = async (e: React.FormEvent) => {
    e.preventDefault();
    startLoading('save-blog-id');
    setMessage(null);

    try {
      // 블로그 ID 검증 (기본적인)
      if (blogId && !/^[a-zA-Z0-9_-]+$/.test(blogId)) {
        setMessage({ 
          type: "error", 
          text: "블로그 ID는 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능합니다." 
        });
        return;
      }

      if (blogId && (blogId.length < 2 || blogId.length > 50)) {
        setMessage({ 
          type: "error", 
          text: "블로그 ID는 2-50자 사이여야 합니다." 
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: { blog_id: blogId }
      });
      
      if (error) throw error;

      // 전역 스토어도 업데이트
      setGlobalBlogId(blogId || null);

      setMessage({
        type: "success",
        text: blogId 
          ? "블로그 ID가 저장되었습니다. 대시보드에서 실제 블로그 분석을 확인할 수 있습니다!"
          : "블로그 ID가 제거되었습니다."
      });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      stopLoading('save-blog-id');
    }
  };

  // 필터링된 콘텐츠 가져오기
  const filteredGenerations = generations.filter((gen) => {
    // 콘텐츠 타입 필터
    if (contentFilter !== "all" && gen.type !== contentFilter) {
      return false;
    }

    // 검색어 필터
    if (debouncedSearchQuery.trim()) {
      const searchLower = debouncedSearchQuery.toLowerCase();

      // 콘텐츠 타입명 검색
      const typeLabel = getContentTypeLabel(
        gen.type,
        gen.sub_type,
      ).toLowerCase();
      if (typeLabel.includes(searchLower)) return true;

      // 생성된 내용 검색
      if (gen.output_content.toLowerCase().includes(searchLower)) return true;

      // 입력 데이터 검색
      const inputData = gen.input_data.data || gen.input_data;

      // 각 타입별 입력 데이터 검색
      if (
        gen.type === "blog" &&
        inputData.topic?.toLowerCase().includes(searchLower)
      )
        return true;
      if (
        gen.type === "blog" &&
        inputData.content?.toLowerCase().includes(searchLower)
      )
        return true;
      if (
        gen.type === "sns" &&
        inputData.content?.toLowerCase().includes(searchLower)
      )
        return true;
      if (
        gen.type === "youtube" &&
        inputData.topic?.toLowerCase().includes(searchLower)
      )
        return true;
      if (
        gen.type === "youtube" &&
        inputData.content?.toLowerCase().includes(searchLower)
      )
        return true;
      if (
        gen.type === "copywriting" &&
        inputData.productIntro?.toLowerCase().includes(searchLower)
      )
        return true;
      if (
        gen.type === "copywriting" &&
        inputData.emphasize?.toLowerCase().includes(searchLower)
      )
        return true;

      return false;
    }

    return true;
  });

  // 콘텐츠 타입별 개수 계산
  const contentCounts = {
    all: generations.length,
    blog: generations.filter((g) => g.type === "blog").length,
    sns: generations.filter((g) => g.type === "sns").length,
    youtube: generations.filter((g) => g.type === "youtube").length,
    copywriting: generations.filter((g) => g.type === "copywriting").length,
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-1 sm:p-2">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-normal text-white mb-8">마이페이지</h1>

        {/* 탭 네비게이션 - 모바일: 세로, 데스크탑: 좌우 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "profile"
                ? "bg-[#4f84f5] text-white"
                : "border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            블로그 설정
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "history"
                ? "bg-[#4f84f5] text-white"
                : "border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            사용 로그
          </button>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-[#4f84f5]/20 text-[#4f84f5]"
                : "bg-red-900/20 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 프로필 설정 탭 */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* 계정 정보, 비밀번호 변경, 블로그 설정 섹션 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* 계정 정보 섹션 */}
              <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-medium text-white mb-4">
                  계정 정보
                </h2>

                <form onSubmit={handleUpdateEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      이메일
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-700 focus:outline-none"
                      placeholder="이메일 주소"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || email === user?.email}
                    className="bg-[#4f84f5] hover:bg-[#4574e5] disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    이메일 변경
                  </button>
                </form>
              </div>

              {/* 비밀번호 변경 섹션 */}
              <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-medium text-white mb-4">
                  비밀번호 변경
                </h2>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      새 비밀번호
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-700 focus:outline-none"
                      placeholder="새 비밀번호"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      새 비밀번호 확인
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-700 focus:outline-none"
                      placeholder="새 비밀번호 확인"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !newPassword || !confirmPassword}
                    className="bg-[#4f84f5] hover:bg-[#4574e5] disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    비밀번호 변경
                  </button>
                </form>
              </div>

              {/* 블로그 설정 섹션 */}
              <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-medium text-white mb-4">
                  블로그 설정
                </h2>
                
                <form onSubmit={handleUpdateBlogId} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      네이버 블로그 ID
                    </label>
                    <input
                      type="text"
                      value={blogId}
                      onChange={(e) => setBlogId(e.target.value)}
                      className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-700 focus:outline-none"
                      placeholder="예: mydoctorblog"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      네이버 블로그 URL에서 ID 부분을 입력하세요 (blog.naver.com/<strong>여기부분</strong>)
                    </p>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-3 text-xs text-gray-400">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">💡</span>
                      <div>
                        <p className="mb-1"><strong>설정하면?</strong></p>
                        <ul className="space-y-1">
                          <li>• 대시보드에서 실제 블로그 SEO 분석 확인</li>
                          <li>• 최근 글들의 SEO 점수 자동 계산</li>
                          <li>• 개선 제안사항 제공</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#4f84f5] hover:bg-[#4574e5] disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    {isLoading ? "저장 중..." : "블로그 설정 저장"}
                  </button>
                </form>
              </div>
            </div>

            {/* 계정 정보 */}
            <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg font-medium text-white mb-4">계정 상세</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">가입일</span>
                  <span className="text-gray-300">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString("ko-KR")
                      : "-"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">마지막 로그인</span>
                  <span className="text-gray-300">
                    {user?.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString(
                          "ko-KR",
                        )
                      : "-"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">블로그 주소</span>
                  {blogId ? (
                    <a
                      href={`https://blog.naver.com/${blogId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 group"
                    >
                      <span>blog.naver.com/{blogId}</span>
                      <svg
                        className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <span className="text-xs text-gray-500">미설정</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 사용 로그 탭 */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* 콘텐츠 필터 */}
            <div className="bg-[#1e2029] border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3">
                콘텐츠 타입별 보기
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "전체", count: contentCounts.all },
                  { key: "blog", label: "블로그", count: contentCounts.blog },
                  { key: "sns", label: "SNS", count: contentCounts.sns },
                  {
                    key: "youtube",
                    label: "유튜브",
                    count: contentCounts.youtube,
                  },
                  {
                    key: "copywriting",
                    label: "카피라이팅",
                    count: contentCounts.copywriting,
                  },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setContentFilter(filter.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      contentFilter === filter.key
                        ? "bg-[#4f84f5] text-white"
                        : "bg-black text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>

            {/* 검색 바 */}
            <div className="bg-[#1e2029] border border-gray-800 rounded-lg p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // 검색어 입력 시 콘텐츠 필터를 전체로 변경
                    if (e.target.value && contentFilter !== "all") {
                      setContentFilter("all");
                    }
                  }}
                  placeholder="생성한 콘텐츠 검색..."
                  className="w-full bg-black border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-gray-700 focus:outline-none text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 사용 내역 */}
            <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-white">
                  사용 내역{" "}
                  {contentFilter !== "all" &&
                    `- ${contentFilter === "blog" ? "블로그" : contentFilter === "sns" ? "SNS" : contentFilter === "youtube" ? "유튜브" : "카피라이팅"}`}
                </h2>
                {debouncedSearchQuery && (
                  <span className="text-sm text-gray-400">
                    검색 결과: {filteredGenerations.length}개
                  </span>
                )}
              </div>

              {isLoading && generations.length === 0 ? (
                <div className="text-gray-400 text-center py-8">로딩 중...</div>
              ) : filteredGenerations.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  {debouncedSearchQuery
                    ? `"${debouncedSearchQuery}"에 대한 검색 결과가 없습니다.`
                    : contentFilter === "all"
                      ? "아직 생성한 컨텐츠가 없습니다."
                      : `${contentFilter === "blog" ? "블로그" : contentFilter === "sns" ? "SNS" : contentFilter === "youtube" ? "유튜브" : "카피라이팅"} 컨텐츠가 없습니다.`}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredGenerations.map((generation) => (
                    <div
                      key={generation.id}
                      className="bg-black border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-700 transition-colors"
                      onClick={() => setSelectedGeneration(generation)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-white">
                          {getContentTypeLabel(
                            generation.type,
                            generation.sub_type,
                          )}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {formatDate(generation.created_at)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-400 mb-2">
                        {generation.type === "blog" &&
                          (() => {
                            const inputData =
                              generation.input_data.data ||
                              generation.input_data;
                            return (
                              <>
                                주제:{" "}
                                {highlightSearchTerm(
                                  inputData.topic?.substring(0, 50) + "...",
                                  debouncedSearchQuery,
                                )}
                              </>
                            );
                          })()}
                        {generation.type === "sns" &&
                          (() => {
                            const inputData =
                              generation.input_data.data ||
                              generation.input_data;
                            return <>플랫폼: {inputData.snsType}</>;
                          })()}
                        {generation.type === "youtube" &&
                          (() => {
                            const inputData =
                              generation.input_data.data ||
                              generation.input_data;
                            return (
                              <>
                                주제:{" "}
                                {highlightSearchTerm(
                                  inputData.topic?.substring(0, 50) + "...",
                                  debouncedSearchQuery,
                                )}
                              </>
                            );
                          })()}
                        {generation.type === "copywriting" &&
                          (() => {
                            const inputData =
                              generation.input_data.data ||
                              generation.input_data;
                            return (
                              <>
                                언어:{" "}
                                {inputData.language === "korean"
                                  ? "한국어"
                                  : "영어"}
                              </>
                            );
                          })()}
                      </div>

                      <div className="text-xs text-gray-500">
                        {highlightSearchTerm(
                          generation.output_content.substring(0, 100) + "...",
                          debouncedSearchQuery,
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 선택된 생성물 상세 모달 */}
        {selectedGeneration && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setSelectedGeneration(null)}
          >
            <div
              className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-white">
                  {getContentTypeLabel(
                    selectedGeneration.type,
                    selectedGeneration.sub_type,
                  )}
                </h3>
                <button
                  onClick={() => setSelectedGeneration(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="text-sm text-gray-400 mb-4">
                {formatDate(selectedGeneration.created_at)}
              </div>

              <div className="border-t border-gray-800 pt-4 mb-4">
                <h4 className="text-sm font-medium text-white mb-2">
                  입력 정보
                </h4>
                <div className="bg-black rounded-lg p-3 text-sm text-gray-300">
                  {selectedGeneration.type === "blog" &&
                    (() => {
                      // 기존 데이터(중첩)와 새 데이터 모두 처리
                      const inputData =
                        selectedGeneration.input_data.data ||
                        selectedGeneration.input_data;
                      return (
                        <>
                          <div>주제: {inputData.topic}</div>
                          <div>말투: {inputData.tone}</div>
                          {inputData.toneExample && (
                            <div>말투 예시: {inputData.toneExample}</div>
                          )}
                          <div>핵심 내용: {inputData.content}</div>
                        </>
                      );
                    })()}
                  {selectedGeneration.type === "sns" &&
                    (() => {
                      const inputData =
                        selectedGeneration.input_data.data ||
                        selectedGeneration.input_data;
                      return (
                        <>
                          <div>SNS 종류: {inputData.snsType}</div>
                          <div>컨텐츠 내용: {inputData.content}</div>
                          {inputData.additional && (
                            <div>기타: {inputData.additional}</div>
                          )}
                        </>
                      );
                    })()}
                  {selectedGeneration.type === "youtube" &&
                    (() => {
                      const inputData =
                        selectedGeneration.input_data.data ||
                        selectedGeneration.input_data;
                      return (
                        <>
                          <div>영상 주제: {inputData.topic}</div>
                          <div>말투: {inputData.tone}</div>
                          <div>핵심 내용: {inputData.content}</div>
                        </>
                      );
                    })()}
                  {selectedGeneration.type === "copywriting" &&
                    (() => {
                      const inputData =
                        selectedGeneration.input_data.data ||
                        selectedGeneration.input_data;
                      return (
                        <>
                          <div>
                            언어:{" "}
                            {inputData.language === "korean"
                              ? "한국어"
                              : "영어"}
                          </div>
                          <div>제품 소개: {inputData.productIntro}</div>
                          <div>강조 메세지: {inputData.emphasize}</div>
                          <div>최대 글자 수: {inputData.charCount}</div>
                        </>
                      );
                    })()}
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-white">
                    생성된 결과
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        selectedGeneration.output_content,
                      );
                      alert("클립보드에 복사되었습니다!");
                    }}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    복사하기
                  </button>
                </div>
                <div className="bg-black rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap">
                  {selectedGeneration.output_content}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
