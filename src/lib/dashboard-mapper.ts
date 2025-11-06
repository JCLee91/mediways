// 대시보드 공통 유틸리티 함수

/**
 * 분석 상태별 메시지
 */
export function getAnalysisStatusMessage(
  isLoading: boolean, 
  error: string | null, 
  hasBlogId: boolean
): { message: string; type: 'info' | 'error' | 'success' | 'setup' } {
  if (!hasBlogId) {
    return {
      message: "프로필에서 네이버 블로그 ID를 설정하면 실제 블로그 분석 결과를 확인할 수 있습니다.",
      type: 'setup'
    };
  }
  
  if (isLoading) {
    return {
      message: "블로그를 분석하고 있습니다...",
      type: 'info'
    };
  }
  
  if (error) {
    return {
      message: `블로그 분석 중 오류가 발생했습니다: ${error}`,
      type: 'error'
    };
  }
  
  return {
    message: "블로그 분석이 완료되었습니다. 아래 데이터는 실제 블로그 분석 결과입니다.",
    type: 'success'
  };
}

