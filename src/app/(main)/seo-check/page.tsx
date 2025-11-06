"use client";

import { useState, useRef, useEffect } from "react";
import { Search, FileText, Link2, AlertCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import StatusCard, { type StatusType } from "@/components/StatusCard";
import type { SEOAnalysisResult } from "@/lib/services/seoAnalysisService";

interface SEOCheckResult {
  score: number;
  grade: string;
  pageSummary?: {
    title: string;
    description?: string;
    url?: string;
  };
  title: {
    status: StatusType;
    message: string;
    details?: string;
  };
  description: {
    status: StatusType;
    message: string;
    details?: string;
  };
  keywords: {
    status: StatusType;
    message: string;
    details?: string;
  };
  medicalCompliance: {
    status: StatusType;
    message: string;
    details?: string;
  };
  readability: {
    status: StatusType;
    message: string;
    details?: string;
  };
  suggestions: string[];
}

export default function SEOCheck() {
  const [activeTab, setActiveTab] = useState<'text' | 'url'>('text');
  const [textContent, setTextContent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<SEOCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 왼쪽 섹션의 높이를 추적하기 위한 ref와 state
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const [inputSectionHeight, setInputSectionHeight] = useState<number | null>(null);

  // 왼쪽 섹션 높이 감지
  useEffect(() => {
    if (!inputSectionRef.current) return;

    const updateHeight = () => {
      if (inputSectionRef.current) {
        const height = inputSectionRef.current.offsetHeight;
        setInputSectionHeight(height);
      }
    };

    updateHeight();
    
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(inputSectionRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const convertAnalysisToResult = (analysis: SEOAnalysisResult): SEOCheckResult => {
    const getStatus = (score: number, maxScore: number): StatusType => {
      const percentage = (score / maxScore) * 100;
      if (percentage >= 80) return 'good';     // 80% 이상
      if (percentage >= 50) return 'warning';  // 50% 이상
      return 'error';                          // 50% 미만
    };

    const getComplianceStatus = (isCompliant: boolean, violations: any[]): StatusType => {
      if (isCompliant && violations.length === 0) return 'good';
      if (violations.length > 0) return 'error';
      return 'warning';
    };

    return {
      score: analysis.overallScore,
      grade: analysis.grade,
      pageSummary: analysis.pageSummary,
      title: {
        status: getStatus(analysis.title.score, 20),
        message: (() => {
          if (analysis.title.issues.length > 0) return analysis.title.issues[0];
          const percentage = (analysis.title.score / 20) * 100;
          if (percentage >= 80) return '제목이 우수합니다';
          if (percentage >= 50) return '제목 길이를 최적화하세요';
          return '제목이 너무 짧거나 깁니다';
        })(),
        details: `제목 길이: ${analysis.title.length}자 (권장: 30-60자)`
      },
      description: {
        status: analysis.description ? getStatus(analysis.description.score, 10) : 'warning',
        message: (() => {
          if (!analysis.description) return '메타 설명이 없습니다';
          const length = analysis.description.length;
          if (length >= 120 && length <= 160) return '메타 설명이 최적화되었습니다';
          if (length >= 100 && length <= 180) return '메타 설명 길이를 120-160자로 조정하세요';
          if (length < 100) return '메타 설명이 너무 짧습니다';
          return '메타 설명이 너무 깁니다';
        })(),
        details: (() => {
          if (!analysis.description) {
            return '메타 설명을 추가하여 검색 결과의 클릭률을 향상시키세요.';
          }
          if (analysis.description.length >= 60 && analysis.description.length <= 220) {
            return `설명 길이: ${analysis.description.length}자 (권장: 60-220자)`;
          }
          return `설명 길이: ${analysis.description.length}자 (추천 범위를 벗어났습니다)`;
        })()
      },
      keywords: (() => {
        if (analysis.keywords.length === 0) {
          return {
            status: 'warning' as StatusType,
            message: '키워드를 설정해주세요',
            details: '타겟 키워드를 설정하면 더 정확한 분석이 가능합니다.'
          };
        }

        const keywordIssues = analysis.keywords.some(keyword => keyword.density === 0 || keyword.isOptimal === false);
        const optimalCount = analysis.keywords.filter(keyword => keyword.isOptimal).length;

        return {
          status: keywordIssues ? ('warning' as StatusType) : ('good' as StatusType),
          message: keywordIssues ? '키워드 최적화가 필요합니다' : '키워드가 잘 최적화되어 있습니다',
          details: keywordIssues
            ? analysis.keywords
                .filter(keyword => keyword.density === 0 || keyword.isOptimal === false)
                .map(keyword => `${keyword.keyword}: 밀도 ${keyword.density.toFixed(1)}%`)
                .join(', ')
            : `${optimalCount}/${analysis.keywords.length}개 키워드가 권장 범위에 있습니다`
        };
      })(),
      medicalCompliance: {
        status: getComplianceStatus(analysis.compliance.isCompliant, analysis.compliance.violations),
        message: analysis.compliance.isCompliant ? '의료법을 준수합니다' : '의료법 위반 표현 발견',
        details: analysis.compliance.violations.length > 0 
          ? `${analysis.compliance.violations.length}개 위반 표현 발견: ${analysis.compliance.violations.slice(0, 2).join(', ')}` 
          : '의료법 준수 규정을 잘 따르고 있습니다.'
      },
      readability: {
        status: getStatus(analysis.readability.score, 15),
        message: analysis.readability.level === 'excellent' ? '가독성이 우수합니다' : 
                analysis.readability.level === 'good' ? '가독성이 좋습니다' : '가독성 개선이 필요합니다',
        details: `평균 문장 길이: ${analysis.readability.avgSentenceLength}단어`
      },
      suggestions: analysis.suggestions
    };
  };

  const handleAnalyze = async () => {
    if (activeTab === 'text' && !textContent.trim()) {
      toast.error("분석할 텍스트를 입력해주세요.");
      return;
    }
    if (activeTab === 'url' && !urlInput.trim()) {
      toast.error("분석할 URL을 입력해주세요.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      let response;
      
      if (activeTab === 'text') {
        // 텍스트 기반 분석
        const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
        
        response = await fetch('/api/seo-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title.trim(),
            content: textContent.trim(),
            description: description.trim() || undefined,
            targetKeywords: keywordList
          })
        });
      } else {
        // URL 기반 분석
        response = await fetch(`/api/seo-analysis?url=${encodeURIComponent(urlInput.trim())}`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API 요청 실패');
      }

      const { data: analysisResult } = await response.json();
      const convertedResult = convertAnalysisToResult(analysisResult);
      
      setResults(convertedResult);
      toast.success("SEO 분석이 완료되었습니다!");
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'SEO 분석 중 오류가 발생했습니다';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-2 p-1 sm:p-2">
      {/* Left side input */}
      <div 
        ref={inputSectionRef}
        className="w-full lg:w-[320px] xl:w-[360px] bg-black rounded-2xl p-4 sm:p-6"
      >
        <div className="w-full">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">SEO 점검</h1>
          {/* Form Fields */}
          <div className="space-y-4 sm:space-y-5">
            {/* Tabs - 생성 메뉴 스타일에 맞춘 세로 탭 */}
            <div className="flex flex-col gap-3 mb-8">
              <button
                onClick={() => setActiveTab('text')}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'text'
                    ? 'bg-[#4f84f5] text-white'
                    : 'border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <FileText size={16} />
                텍스트 분석
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'url'
                    ? 'bg-[#4f84f5] text-white'
                    : 'border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <Link2 size={16} />
                URL 분석
              </button>
            </div>

            {/* Content */}
            {activeTab === 'text' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white font-bold mb-3">
                    제목 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="블로그 글 제목을 입력하세요..."
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white font-bold mb-3">
                    본문 내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="블로그 글 내용을 여기에 붙여넣기 하세요..."
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none resize-none text-sm"
                    rows={4}
                  />
                  <div className="mt-2 text-xs text-gray-400">
                    {textContent.length}자 / 최소 100자 이상 권장
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-white font-bold mb-3">
                    메타 설명 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="검색 결과에 표시될 설명을 입력하세요..."
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white font-bold mb-3">
                    타겟 키워드 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="키워드1, 키워드2, 키워드3 (쉼표로 구분)"
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none text-sm"
                  />
                  <div className="mt-1 text-xs text-gray-400">
                    분석하고 싶은 키워드를 쉼표로 구분하여 입력하세요
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-white font-bold mb-3">
                  분석할 웹페이지 URL을 입력하세요 <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/blog/article"
                  className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none text-sm"
                />
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-[#4f84f5] hover:bg-[#4574e5] disabled:bg-gray-600 text-white py-3 sm:py-3.5 rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Clock size={20} className="animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Search size={20} />
                  SEO 분석 시작
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right side output */}
      <div className="flex-1 flex items-start justify-center mt-2 lg:mt-0">
        <div className="w-full max-w-none">
          <div 
            className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6 relative overflow-hidden min-h-[600px]"
            style={inputSectionHeight ? { 
              minHeight: `${inputSectionHeight}px` 
            } : undefined}
          >
            
            {/* 초기 상태 (아직 분석하지 않음) */}
            {!results && !isAnalyzing && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-base sm:text-lg text-white mb-1">실제 SEO 분석과</p>
                  <p className="text-base sm:text-lg text-white">의료법 준수 점검하기</p>
                </div>
              </div>
            )}
            
            {/* 에러 상태 */}
            {error && !isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                  <p className="text-lg text-white mb-2">분석 중 오류가 발생했습니다</p>
                  <p className="text-sm text-gray-400">{error}</p>
                </div>
              </div>
            )}

            {/* 로딩 상태 */}
            {isAnalyzing && !results && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Clock size={48} className="animate-spin text-[#4f84f5] mx-auto mb-4" />
                  <p className="text-lg text-white">SEO 분석 중...</p>
                </div>
              </div>
            )}

            {/* 결과 표시 상태 */}
            {results && (
              <div className="space-y-6">
                {results.pageSummary && (
                  <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6">
                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-gray-400">분석한 페이지</div>
                      <h2 className="text-lg font-semibold text-white">
                        {results.pageSummary.title || '제목을 불러오지 못했습니다'}
                      </h2>
                      {results.pageSummary.description && (
                        <p className="text-sm text-gray-400">
                          {results.pageSummary.description}
                        </p>
                      )}
                      {results.pageSummary.url && (
                        <a
                          href={results.pageSummary.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#4f84f5] hover:underline break-all"
                        >
                          {results.pageSummary.url}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {/* Overall Score */}
                <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6">
                  <h3 className="text-lg font-medium text-white mb-4">종합 SEO 점수</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-[#4f84f5]">{results.score}</div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-gradient-to-r from-[#4f84f5] to-[#6b93f7] transition-all duration-1000"
                          style={{ width: `${results.score}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        {results.grade === 'excellent' ? '우수' : 
                         results.grade === 'good' ? '양호' :
                         results.grade === 'fair' ? '보통' :
                         results.grade === 'needs_improvement' ? '개선 필요' : '불량'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6">
                  <h3 className="text-lg font-medium text-white mb-6">상세 분석 결과</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatusCard 
                      title="제목 최적화" 
                      message={results.title.message}
                      details={results.title.details}
                      status={results.title.status} 
                    />
                    <StatusCard 
                      title="메타 설명" 
                      message={results.description.message}
                      details={results.description.details}
                      status={results.description.status} 
                    />
                    <StatusCard 
                      title="키워드 최적화" 
                      message={results.keywords.message}
                      details={results.keywords.details}
                      status={results.keywords.status} 
                    />
                    <StatusCard 
                      title="의료법 준수" 
                      message={results.medicalCompliance.message}
                      details={results.medicalCompliance.details}
                      status={results.medicalCompliance.status} 
                    />
                    <StatusCard 
                      title="가독성" 
                      message={results.readability.message}
                      details={results.readability.details}
                      status={results.readability.status} 
                    />
                  </div>
                </div>

                {/* Recommendations */}
                {results.suggestions && results.suggestions.length > 0 && (
                  <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6">
                    <h3 className="text-lg font-medium text-white mb-4">개선 권장사항</h3>
                    <div className="space-y-3">
                      {results.suggestions.map((suggestion, index) => {
                        const isError = suggestion.includes('의료법') || suggestion.includes('위반');
                        const isWarning = !isError;
                        
                        return (
                          <div 
                            key={index}
                            className={`flex items-start gap-3 p-3 rounded-lg ${
                              isError 
                                ? 'bg-red-400/10 border border-red-400/50' 
                                : 'bg-yellow-400/10 border border-yellow-400/50'
                            }`}
                          >
                            {isError ? (
                              <XCircle className="text-red-400 mt-0.5" size={16} />
                            ) : (
                              <AlertCircle className="text-yellow-400 mt-0.5" size={16} />
                            )}
                            <div>
                              <p className="text-sm font-medium text-white">{suggestion}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
