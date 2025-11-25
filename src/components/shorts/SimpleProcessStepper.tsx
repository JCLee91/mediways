import { Check, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleProcessStepperProps {
  status: string;
  className?: string;
}

const steps = [
  {
    id: 'analysis',
    label: '분석',
    description: '블로그 콘텐츠 분석',
    matchStatuses: ['pending', 'crawling'],
  },
  {
    id: 'scripting',
    label: '대본',
    description: '요약 및 대본 작성',
    matchStatuses: ['summarizing'],
  },
  {
    id: 'production',
    label: '제작',
    description: 'AI 영상 생성 중',
    matchStatuses: ['generating_video', 'adding_subtitles'],
  },
  {
    id: 'ready',
    label: '완료',
    description: '영상 생성 완료',
    matchStatuses: ['completed'],
  },
];

export function SimpleProcessStepper({ status, className }: SimpleProcessStepperProps) {
  const currentStepIndex = steps.findIndex((step) =>
    step.matchStatuses.includes(status)
  );
  
  const activeIndex = status === 'completed' 
    ? steps.length 
    : (currentStepIndex === -1 ? 0 : currentStepIndex);

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="relative flex justify-between">
        {/* 배경 라인 - 어두운 테마에 맞춰 색상 조정 */}
        <div className="absolute top-4 left-0 h-0.5 w-full bg-gray-800 -z-10" />
        
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex || status === 'completed';
          const isCurrent = index === activeIndex && status !== 'completed';
          const isWaiting = index > activeIndex;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-black px-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  // 색상 팔레트를 다른 페이지의 버튼 색상(#4f84f5)에 맞춤
                  isCompleted && "border-[#4f84f5] bg-[#4f84f5] text-white",
                  isCurrent && "border-[#4f84f5] bg-black text-[#4f84f5]",
                  isWaiting && "border-gray-700 bg-black text-gray-600"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Circle className="h-4 w-4 fill-current text-[8px]" />
                )}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    (isCompleted || isCurrent) ? "text-white" : "text-gray-500"
                  )}
                >
                  {step.label}
                </p>
                <p className="hidden text-xs text-gray-500 sm:block mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
