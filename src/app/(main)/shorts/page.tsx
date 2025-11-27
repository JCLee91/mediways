'use client';

import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Loader2, Video, Download, AlertCircle, ArrowRight, Copy } from 'lucide-react';
import { SimpleProcessStepper } from '@/components/shorts/SimpleProcessStepper';
import Spinner from '@/components/Spinner';

interface Segment {
  title: string;
  content: string;
  order: number;
  videoPrompt: string;
}

interface ConversionStatus {
  jobId: string;
  status: string;
  progress: number;
  currentStep: string;
  result?: {
    videoUrl: string;
    duration: number;
    title: string;
    summary: string;
    segments?: Segment[];
  };
  error?: string;
}

export default function ShortsPage() {
  const [blogUrl, setBlogUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 부드러운 진행률 표시를 위한 state
  const [displayProgress, setDisplayProgress] = useState(0);

  // 인풋 섹션의 높이를 추적하기 위한 ref
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const [inputSectionHeight, setInputSectionHeight] = useState<number | null>(null);

  // 인풋 섹션 높이 감지
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

  // 로컬 스토리지에서 작업 ID 복원 및 폴링 재개
  useEffect(() => {
    const savedJobId = localStorage.getItem('latestShortsJobId');
    if (savedJobId) {
      console.log('[쇼츠 생성] 💾 저장된 작업 발견:', savedJobId);
      setJobId(savedJobId);
      setIsLoading(true);

      // 상태 복원 및 폴링 시작
      fetch(`/api/shorts/status/${savedJobId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            // 작업이 없거나 오류가 있으면 스토리지 초기화
            localStorage.removeItem('latestShortsJobId');
            setIsLoading(false);
            return;
          }

          setStatus(data);

          // 완료된 작업이 아니면 폴링 시작
          if (data.status !== 'completed' && data.status !== 'failed') {
            startPolling(savedJobId);
          } else {
            setIsLoading(false);
            if (data.status === 'completed') setDisplayProgress(100);
          }
        })
        .catch(err => {
          console.error('상태 복원 실패:', err);
          setIsLoading(false);
        });
    }
  }, []);

  // 부드러운 진행률 업데이트
  useEffect(() => {
    if (!status) {
      setDisplayProgress(0);
      return;
    }

    const targetProgress = status.progress;

    // 이미 목표치에 도달했으면 중단
    if (displayProgress >= targetProgress) return;

    const step = () => {
      setDisplayProgress(prev => {
        if (prev >= targetProgress) return targetProgress;
        // 남은 거리의 5%만큼 이동 (점진적 감속)하거나 최소 1씩 증가
        const increment = Math.max(1, Math.floor((targetProgress - prev) * 0.1));
        return Math.min(targetProgress, prev + increment);
      });
    };

    const timer = setInterval(step, 50); // 50ms마다 업데이트

    return () => clearInterval(timer);
  }, [status?.progress]);

  const handleSubmit = async () => {
    if (!blogUrl) return;

    console.log('[쇼츠 생성] 🎬 시작:', blogUrl);

    flushSync(() => {
      setIsLoading(true);
      setError(null);
      setStatus(null);
      setDisplayProgress(0);
    });

    try {
      console.log('[쇼츠 생성] 📝 Step 1/4: 작업 생성 요청...');
      const response = await fetch('/api/shorts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '오류가 발생했습니다.');
      }

      console.log('[쇼츠 생성] ✅ Step 1 완료: 작업 ID =', data.jobId);
      setJobId(data.jobId);
      localStorage.setItem('latestShortsJobId', data.jobId);

      setStatus({
        jobId: data.jobId,
        status: 'pending',
        progress: 0,
        currentStep: '대기 중...'
      });

      console.log('[쇼츠 생성] 🚀 Step 2/4: 변환 프로세스 시작...');
      // process API를 fire-and-forget으로 호출 (await 없이)
      // 바로 polling을 시작해서 실시간 진행 상황을 표시
      fetch(`/api/shorts/process/${data.jobId}`, {
        method: 'POST',
      }).then(async (processResponse) => {
        if (!processResponse.ok) {
          const errorData = await processResponse.json();
          console.error(`[쇼츠 생성] Process API 실패: ${errorData.error}`);
        }
      }).catch((err) => {
        console.error('[쇼츠 생성] Process API 오류:', err);
      });

      console.log('[쇼츠 생성] 🔄 Step 3/4: 상태 모니터링 시작...');
      // 바로 polling 시작 (process 완료를 기다리지 않음)
      startPolling(data.jobId);
    } catch (error: any) {
      console.error('[쇼츠 생성] ❌ 오류 발생:', error.message);
      setError(error.message);
      setIsLoading(false);
    }
  };

  const startPolling = (jobId: string) => {
    let pollCount = 0;
    const interval = setInterval(async () => {
      try {
        pollCount++;
        const response = await fetch(`/api/shorts/status/${jobId}`);
        const data = await response.json();

        console.log(`[쇼츠 생성] 📊 상태 확인 #${pollCount}:`, {
          status: data.status,
          progress: `${data.progress}%`,
          currentStep: data.currentStep
        });

        setStatus(data);

        if (data.status === 'completed') {
          clearInterval(interval);
          setIsLoading(false);
          // 완료 시 진행률 100%로 즉시 설정
          setDisplayProgress(100);
          console.log('[쇼츠 생성] 🎉 Step 4/4: 완료!', {
            videoUrl: data.result?.videoUrl,
          });
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setIsLoading(false);
          console.error('[쇼츠 생성] ❌ 실패:', data.error);
        }
      } catch (error) {
        console.error('[쇼츠 생성] ⚠️ Polling error:', error);
      }
    }, 5000);
  };

  const handleDownload = () => {
    if (status?.result?.videoUrl) {
      window.open(status.result.videoUrl, '_blank');
    }
  };

  const isProcessing = isLoading || (status && status.status !== 'completed' && status.status !== 'failed');

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-2 p-1 sm:p-2">
      {/* Left side input */}
      <div
        ref={inputSectionRef}
        className="w-full lg:w-[320px] xl:w-[360px] bg-black rounded-2xl p-4 sm:p-6"
      >
        <div className="w-full">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">쇼츠 영상</h1>

          {/* Form Fields */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-white font-bold mb-3">
                네이버 블로그 URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                placeholder="https://blog.naver.com/..."
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
                disabled={!!isProcessing}
                className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                의료 관련 블로그 글을 입력하시면 자동으로 쇼츠 영상을 생성합니다. (약 2-3분 소요)
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* 진행 상태 표시 (작업 시작 후) */}
            {status && status.status !== 'completed' && status.status !== 'failed' && (
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <SimpleProcessStepper status={status.status} />
                <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
                  <span>{status.currentStep}</span>
                  <span>{displayProgress}%</span>
                </div>
                <div className="mt-2 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4f84f5] transition-all duration-500 ease-out"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isProcessing || !blogUrl}
              className="w-full bg-[#4f84f5] hover:bg-[#4574e5] disabled:bg-gray-800 disabled:text-gray-500 text-white py-3 sm:py-3.5 rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  쇼츠 생성하기
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
            className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6 relative overflow-hidden min-h-[600px] flex flex-col items-center justify-center"
            style={inputSectionHeight ? {
              minHeight: `${inputSectionHeight}px`
            } : undefined}
          >
            {/* 초기 상태 */}
            {!status && !isProcessing && !error && (
              <div className="text-center">
                <p className="text-base sm:text-lg text-white mb-1">클릭 한 번으로 블로그를 영상으로</p>
                <p className="text-base sm:text-lg text-white">쇼츠 영상 생성하기!</p>
              </div>
            )}

            {/* 로딩/진행 중 상태 */}
            {isProcessing && status?.status !== 'completed' && (
              <div className="flex flex-col items-center w-full max-w-xs">
                <div className="relative mb-8">
                  {/* 배경 원 */}
                  <div className="w-24 h-24 rounded-full border-4 border-gray-800 opacity-30"></div>
                  {/* 진행률 원 (SVG) */}
                  <svg className="absolute top-0 left-0 w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="44"
                      stroke="#4f84f5"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray="276.46"
                      strokeDashoffset={276.46 * (1 - displayProgress / 100)}
                      className="transition-all duration-100 ease-linear"
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* 중앙 스피너 및 텍스트 */}
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-bold text-white">{displayProgress}%</span>
                  </div>
                </div>

                <div className="text-center space-y-2 w-full">
                  <h3 className="text-lg font-bold text-white animate-pulse">
                    {status?.currentStep || 'AI가 영상을 제작하고 있어요...'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    조금만 기다려주세요. 멋진 영상을 만들고 있습니다.
                  </p>

                  {/* 팁 메시지 롤링 */}
                  <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800 text-xs text-gray-400 leading-relaxed">
                    <p className="font-bold text-[#4f84f5] mb-1">💡 알아두세요</p>
                    영상 생성에는 약 2~3분이 소요됩니다.<br />
                    창을 닫지 말고 잠시만 기다려주세요.
                  </div>
                </div>
              </div>
            )}

            {/* 완료 상태 (결과물) */}
            {status?.status === 'completed' && status.result && (
              <div className="w-full max-w-[500px] space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* 영상 */}
                  <div className="w-full max-w-[280px] mx-auto lg:mx-0 lg:w-[280px] flex-shrink-0">
                    <div className="relative w-full aspect-[9/16] bg-black rounded-2xl shadow-2xl overflow-hidden ring-1 ring-gray-800">
                      <video
                        src={status.result.videoUrl}
                        controls
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        playsInline
                      />
                    </div>
                  </div>

                  {/* 제목 + 대본 */}
                  <div className="flex-1 space-y-3">
                    <h3 className="text-white font-bold text-lg line-clamp-2">{status.result.title}</h3>

                    {/* 블로그 요약 표시 */}
                    {status.result.summary && (
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <p className="text-xs text-gray-400 font-bold mb-2 flex items-center gap-1">
                          <span className="text-lg">📄</span> 블로그 요약
                        </p>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {status.result.summary}
                        </p>
                      </div>
                    )}

                    {/* 대본 전체 표시 */}
                    {status.result.segments && status.result.segments.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500 font-medium">📝 대본</p>
                        {status.result.segments
                          .sort((a, b) => a.order - b.order)
                          .map((segment, idx) => (
                            <div key={idx} className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                              <p className="text-xs text-[#4f84f5] font-medium mb-1">
                                {idx === 0 ? '🎬 훅 (0-8초)' : idx === 1 ? '💡 정보 (8-16초)' : '✅ CTA (16-24초)'}
                              </p>
                              <p className="text-sm text-gray-300 leading-relaxed">{segment.content}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full bg-[#4f84f5] hover:bg-[#4574e5] text-white py-3 rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="h-4 w-4" />
                  영상 다운로드
                </button>
              </div>
            )}

            {/* 실패 상태 */}
            {status?.status === 'failed' && (
              <div className="text-center p-6">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4 opacity-80" />
                <p className="text-lg font-bold text-white mb-2">영상 생성 실패</p>
                <p className="text-gray-400 mb-6 max-w-xs mx-auto">
                  {status.error || '알 수 없는 오류가 발생했습니다.'}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 border border-gray-700 text-white rounded-xl hover:bg-gray-900 transition-colors text-sm"
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
