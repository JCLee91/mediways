"use client";

import { useState } from "react";
import { X, ArrowRight, Shield, TrendingUp, BookOpen } from "lucide-react";
import { isNewUser } from "@/lib/dummyData";

interface WelcomeBannerProps {
  onDismiss?: () => void;
  userStats?: any;
}

export default function WelcomeBanner({ onDismiss, userStats }: WelcomeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  
  // 신규 사용자가 아니면 배너 표시하지 않음
  if (!isNewUser(userStats) || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="relative bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 border border-blue-500/30 rounded-2xl p-6 mb-8 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              🎉 메디웨이즈에 오신 것을 환영합니다!
            </h2>
            <p className="text-gray-300 text-sm">
              아래는 실제 의료 블로그를 분석한 <span className="text-blue-400 font-medium">샘플 데이터</span>입니다
            </p>
          </div>
        </div>

        {/* Features showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-gray-700/50">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">의료법 준수 분석</div>
              <div className="text-xs text-gray-400">위험 표현 자동 탐지</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-gray-700/50">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">SEO 최적화</div>
              <div className="text-xs text-gray-400">검색 순위 향상 가이드</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-gray-700/50">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">AI 콘텐츠 생성</div>
              <div className="text-xs text-gray-400">안전한 의료광고 작성</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/profile"
            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            내 블로그 연결하기
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Info note */}
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-yellow-500/20 rounded-full flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
            </div>
            <div className="text-xs text-yellow-300">
              <strong>💡 Tip:</strong> 실제 데이터를 보려면 프로필에서 블로그 URL을 설정하거나, 
              AI 콘텐츠 생성 기능을 먼저 체험해보세요!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
