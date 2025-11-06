"use client";

import { useEffect, useRef, useState } from "react";
import { useCompletion } from "ai/react";
import { Copy, AlertCircle } from "lucide-react";
import Spinner from "@/components/Spinner";
import type { BlogData, SNSData, YoutubeData, CopywritingData } from '@/types/api';

interface ContentGeneratorFormProps {
  type: 'blog' | 'sns' | 'youtube' | 'copywriting';
  title: string;
  fields: React.ReactNode;
  formData: BlogData | SNSData | YoutubeData | CopywritingData;
  onFormDataChange: (data: any) => void;
  subType?: string;
}

export default function ContentGeneratorForm({ 
  type, 
  title, 
  fields, 
  formData, 
  onFormDataChange,
  subType 
}: ContentGeneratorFormProps) {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  
  const { complete, completion, isLoading, error, stop } = useCompletion({
    api: "/api/generate",
    onError: (error) => {
      // 사용자 친화적인 에러 메시지 설정
      if (error.message.includes('timeout')) {
        setErrorMessage('콘텐츠 생성 시간이 초과되었습니다. 다시 시도해주세요.');
      } else if (error.message.includes('network')) {
        setErrorMessage('네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.');
      } else if (error.message.includes('429')) {
        setErrorMessage('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setErrorMessage('콘텐츠 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
      
      // 3초 후 에러 메시지 자동 제거
      setTimeout(() => setErrorMessage(''), 5000);
    },
    onFinish: (prompt, completion) => {
      // 생성 완료 후 폼 초기화
      resetForm();
      setRetryCount(0);
      setErrorMessage('');
    }
  });

  // 인풋 섹션의 높이를 추적하기 위한 ref
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const [inputSectionHeight, setInputSectionHeight] = useState<number | null>(null);

  // 인풋 섹션 높이 감지 (실시간 업데이트만)
  useEffect(() => {
    if (!inputSectionRef.current) return;

    const updateHeight = () => {
      if (inputSectionRef.current) {
        const height = inputSectionRef.current.offsetHeight;
        setInputSectionHeight(height);
      }
    };

    // 즉시 실행 (지연 없음)
    updateHeight();
    
    // ResizeObserver로 높이 변화 감지
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(inputSectionRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []); // 의존성 배열을 빈 배열로 변경 (한 번만 실행)

  const resetForm = () => {
    switch (type) {
      case 'blog':
        onFormDataChange({
          topic: '',
          tone: '~해요체',
          toneExample: '',
          content: '',
          medicalSpecialty: undefined
        });
        break;
      case 'sns':
        onFormDataChange({
          snsType: (formData as SNSData).snsType,
          content: '',
          additional: '',
          medicalSpecialty: undefined
        });
        break;
      case 'youtube':
        onFormDataChange({
          topic: '',
          tone: '~해요체',
          content: '',
          medicalSpecialty: undefined
        });
        break;
      case 'copywriting':
        onFormDataChange({
          language: (formData as CopywritingData).language,
          productIntro: '',
          emphasize: '',
          charCount: '',
          medicalSpecialty: undefined
        });
        break;
    }
  };

  const validateForm = () => {
    switch (type) {
      case 'blog':
        const blogData = formData as BlogData;
        return blogData.topic && blogData.content && blogData.medicalSpecialty;
      case 'sns':
        const snsData = formData as SNSData;
        return snsData.content && snsData.medicalSpecialty;
      case 'youtube':
        const youtubeData = formData as YoutubeData;
        return youtubeData.topic && youtubeData.content && youtubeData.medicalSpecialty;
      case 'copywriting':
        const copyData = formData as CopywritingData;
        return copyData.productIntro && copyData.emphasize && copyData.charCount && copyData.medicalSpecialty;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setErrorMessage("필수 항목을 모두 입력해주세요.");
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setErrorMessage(''); // 이전 에러 메시지 제거
    setRetryCount(prev => prev + 1);

    try {
      await complete("", {
        body: {
          type,
          subType,
          data: formData
        }
      });
    } catch (error) {
      console.error('Error generating content:', error);
      // 에러는 onError 콜백에서 처리됨
    }
  };
  
  const handleRetry = async () => {
    setErrorMessage('');
    handleSubmit();
  };
  
  const handleStop = () => {
    stop();
    setErrorMessage('콘텐츠 생성이 중단되었습니다.');
    setTimeout(() => setErrorMessage(''), 3000);
  };

  const getPlaceholderText = () => {
    switch (type) {
      case 'blog':
        return '블로그 컨텐츠 생성하기!';
      case 'sns':
        return 'SNS 게시물 생성하기!';
      case 'youtube':
        return '유튜브 스크립트 생성하기!';
      case 'copywriting':
        return '카피라이팅 생성하기!';
      default:
        return '컨텐츠 생성하기!';
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
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">{title}</h1>

          {/* Form Fields */}
          <div className="space-y-4 sm:space-y-5">
            {fields}
            
            {/* 에러 메시지 표시 */}
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{errorMessage}</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 bg-[#4f84f5] hover:bg-[#4574e5] disabled:bg-gray-600 text-white py-3 sm:py-3.5 rounded-xl font-bold transition-colors text-sm"
              >
                {isLoading ? "생성 중..." : "컨텐츠 생성하기"}
              </button>
              
              {/* 생성 중일 때 중단 버튼 표시 */}
              {isLoading && (
                <button 
                  onClick={handleStop}
                  className="px-4 bg-red-500 hover:bg-red-600 text-white py-3 sm:py-3.5 rounded-xl font-bold transition-colors text-sm"
                >
                  중단
                </button>
              )}
            </div>
            
            {/* 재시도 카운트 표시 */}
            {retryCount > 0 && !isLoading && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                재시도 {retryCount}회
              </p>
            )}
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
            {/* 에러 상태 */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl text-red-500 mb-2">오류가 발생했습니다</p>
                  <p className="text-sm text-gray-400">{error.message || '알 수 없는 오류'}</p>
                </div>
              </div>
            )}

            {/* 초기 상태 (아직 생성하지 않음) */}
            {!error && !completion && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-base sm:text-lg text-white mb-1">클릭 한 번으로 의료광고용</p>
                  <p className="text-base sm:text-lg text-white">{getPlaceholderText()}</p>
                </div>
              </div>
            )}

            {/* 로딩 상태 - 스트리밍 시작 전에만 표시 */}
            {!error && isLoading && !completion && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner />
              </div>
            )}

            {/* 결과 표시 상태 */}
            {!error && (completion || (isLoading && completion)) && (
              <div className="relative">
                {/* 복사 버튼 */}
                <div className="flex justify-end items-center mb-4">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(completion);
                      alert("클립보드에 복사되었습니다!");
                    }}
                    className="p-2 text-gray-400 hover:text-white transition-colors font-bold"
                    title="복사하기"
                  >
                    <Copy className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>

                {/* 결과 콘텐츠 */}
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-white font-bold text-xs sm:text-sm leading-relaxed">
                    {completion}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}