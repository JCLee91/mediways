"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // 회원가입 시 검증
    if (isSignUp) {
      if (password !== confirmPassword) {
        setError("비밀번호가 일치하지 않습니다.");
        setIsLoading(false);
        return;
      }
      if (!agreeTerms || !agreePrivacy) {
        setError("이용약관 및 개인정보처리방침에 동의해주세요.");
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("비밀번호는 6자 이상이어야 합니다.");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("회원가입 완료! 이메일을 확인해주세요.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mb-6">
            <a href="/" className="block">
              <img 
                src="/logo.png" 
                alt="Mediways" 
                className="h-12 w-auto mx-auto cursor-pointer hover:opacity-80 transition-opacity" 
              />
            </a>
          </div>
          
          <h1 className="text-3xl font-normal text-white mb-2">
            {isSignUp ? "회원가입" : "로그인"}
          </h1>
          <p className="text-gray-400">
            의료광고 컨텐츠 생성 서비스를 이용해보세요
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              className="w-full bg-[#1e2029] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-gray-700 focus:outline-none"
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full bg-[#1e2029] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-gray-700 focus:outline-none"
              required
            />
          </div>

          {isSignUp && (
            <>
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 확인"
                  className="w-full bg-[#1e2029] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-gray-700 focus:outline-none"
                  required
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#4f84f5] bg-[#1e2029] border-gray-600 rounded focus:ring-[#4f84f5] focus:ring-2"
                  />
                  <label htmlFor="agreeTerms" className="text-sm text-gray-300">
                    <span className="text-red-500">*</span> 이용약관에 동의합니다
                  </label>
                </div>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agreePrivacy"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#4f84f5] bg-[#1e2029] border-gray-600 rounded focus:ring-[#4f84f5] focus:ring-2"
                  />
                  <label htmlFor="agreePrivacy" className="text-sm text-gray-300">
                    <span className="text-red-500">*</span> 개인정보 처리방침에 동의합니다
                  </label>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#4f84f5] hover:bg-[#4574e5] disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {isLoading ? "처리 중..." : isSignUp ? "회원가입" : "로그인"}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#0f0f13] text-gray-400">또는</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full mt-4 bg-white hover:bg-gray-100 disabled:bg-gray-300 text-gray-900 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            구글로 {isSignUp ? "회원가입" : "로그인"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setConfirmPassword("");
              setAgreeTerms(false);
              setAgreePrivacy(false);
            }}
            className="text-gray-400 hover:text-white text-sm"
          >
            {isSignUp
              ? "이미 계정이 있으신가요? 로그인"
              : "계정이 없으신가요? 회원가입"}
          </button>
        </div>
      </div>
    </div>
  );
}