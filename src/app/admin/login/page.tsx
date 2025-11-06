"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Shield, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // 이미 로그인된 관리자는 어드민 대시보드로 리다이렉트
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata?.is_admin === true) {
      router.push("/admin");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 로그인 시도
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // 관리자 권한 확인
      if (data.user?.user_metadata?.is_admin === true) {
        // 관리자면 어드민 대시보드로 이동
        router.push("/admin");
      } else {
        // 관리자가 아니면 로그아웃하고 에러 표시
        await supabase.auth.signOut();
        throw new Error("관리자 권한이 없습니다.");
      }
    } catch (error: any) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1e2029] border border-gray-800 rounded-lg p-8">
          {/* 관리자 아이콘 */}
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-gray-800 rounded-full">
              <Shield className="w-8 h-8 text-[#4f84f5]" />
            </div>
          </div>

          <h2 className="text-2xl font-medium text-center text-white mb-8">
            관리자 로그인
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0f0f13] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#4f84f5] transition-colors"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0f0f13] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#4f84f5] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#4f84f5] hover:bg-[#4574e5] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "로그인 중..." : "관리자 로그인"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-sm text-gray-400 text-center">
              관리자 권한이 있는 계정으로만 로그인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}