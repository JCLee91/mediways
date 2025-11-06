'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Video, Download, AlertCircle } from 'lucide-react';

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
  };
  error?: string;
}

export default function ShortsPage() {
  const [blogUrl, setBlogUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch('/api/shorts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '오류가 발생했습니다.');
      }

      setJobId(data.jobId);
      startPolling(data.jobId);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/shorts/status/${jobId}`);
        const data = await response.json();

        setStatus(data);

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // 3초마다 폴링
  };

  const handleDownload = () => {
    if (status?.result?.videoUrl) {
      window.open(status.result.videoUrl, '_blank');
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">블로그 쇼츠 생성</h1>
        <p className="text-muted-foreground">
          네이버 블로그 URL을 입력하면 자동으로 YouTube 쇼츠 영상을 생성합니다.
        </p>
      </div>

      {/* URL 입력 폼 */}
      <Card className="p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="blogUrl" className="text-sm font-medium mb-2 block">
              네이버 블로그 URL
            </label>
            <Input
              id="blogUrl"
              type="url"
              placeholder="https://blog.naver.com/아이디/12345678"
              value={blogUrl}
              onChange={(e) => setBlogUrl(e.target.value)}
              required
              disabled={isLoading || (status !== null && status.status !== 'completed' && status.status !== 'failed')}
            />
            <p className="text-sm text-muted-foreground mt-2">
              의료 관련 블로그 글을 입력하시면 자동으로 쇼츠 영상을 생성합니다.
              (약 2-3분 소요)
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading || (status !== null && status.status !== 'completed' && status.status !== 'failed')}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                쇼츠 생성하기
              </>
            )}
          </Button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">오류 발생</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </Card>

      {/* 진행 상황 */}
      {status && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">진행 상황</h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{status.currentStep}</span>
                <span className="text-sm text-muted-foreground">
                  {status.progress}%
                </span>
              </div>
              <Progress value={status.progress} className="h-2" />
            </div>

            {status.status === 'completed' && status.result && (
              <div className="mt-6 space-y-6">
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    생성된 영상
                  </h4>
                  <div className="bg-black rounded-lg overflow-hidden">
                    <video
                      src={status.result.videoUrl}
                      controls
                      className="w-full"
                      style={{ maxHeight: '600px' }}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">제목</h4>
                  <p className="text-foreground">{status.result.title}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">요약</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {status.result.summary}
                  </p>
                </div>

                <Button onClick={handleDownload} className="w-full" size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  영상 다운로드
                </Button>
              </div>
            )}

            {status.status === 'failed' && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">변환 실패</p>
                  <p className="text-sm">{status.error || '알 수 없는 오류가 발생했습니다.'}</p>
                </div>
              </div>
            )}

            {status.status !== 'completed' && status.status !== 'failed' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>처리 중입니다. 잠시만 기다려주세요...</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
