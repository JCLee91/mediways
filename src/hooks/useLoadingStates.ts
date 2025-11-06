import { useState, useCallback } from 'react';

export interface LoadingState {
  isLoading: boolean;
  loadingTasks: Set<string>;
  error: string | null;
}

export interface LoadingActions {
  startLoading: (taskId: string) => void;
  stopLoading: (taskId: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  isTaskLoading: (taskId: string) => boolean;
}

export interface UseLoadingStatesReturn extends LoadingState, LoadingActions {}

/**
 * 여러 로딩 작업을 통합 관리하는 훅
 * 
 * @example
 * const { isLoading, startLoading, stopLoading, setError, error } = useLoadingStates();
 * 
 * // 작업 시작
 * startLoading('blog-analysis');
 * startLoading('user-stats');
 * 
 * // 작업 완료
 * stopLoading('blog-analysis');
 * // isLoading은 'user-stats'가 아직 진행 중이므로 true
 * 
 * stopLoading('user-stats');
 * // 모든 작업 완료, isLoading은 false
 */
export function useLoadingStates(): UseLoadingStatesReturn {
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());
  const [error, setErrorState] = useState<string | null>(null);

  const startLoading = useCallback((taskId: string) => {
    setLoadingTasks(prev => new Set(prev).add(taskId));
    // 새 작업 시작 시 이전 에러 클리어
    setErrorState(null);
  }, []);

  const stopLoading = useCallback((taskId: string) => {
    setLoadingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  }, []);

  const setError = useCallback((error: string | null) => {
    setErrorState(error);
    // 에러 발생 시 모든 로딩 중지
    if (error) {
      setLoadingTasks(new Set());
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const isTaskLoading = useCallback((taskId: string) => {
    return loadingTasks.has(taskId);
  }, [loadingTasks]);

  return {
    isLoading: loadingTasks.size > 0,
    loadingTasks,
    error,
    startLoading,
    stopLoading,
    setError,
    clearError,
    isTaskLoading
  };
}

/**
 * 지연 로딩을 지원하는 훅
 * 빠른 응답 시 로딩 스피너 플래시를 방지
 */
export function useDelayedLoading(delay: number = 250) {
  const [showLoading, setShowLoading] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);

  const startDelayedLoading = useCallback(() => {
    if (timer) {
      window.clearTimeout(timer);
    }
    
    const newTimer = window.setTimeout(() => {
      setShowLoading(true);
      setTimer(null);
    }, delay);
    
    setTimer(newTimer);
  }, [delay, timer]);

  const stopDelayedLoading = useCallback(() => {
    if (timer) {
      window.clearTimeout(timer);
      setTimer(null);
    }
    setShowLoading(false);
  }, [timer]);

  return {
    showLoading,
    startDelayedLoading,
    stopDelayedLoading
  };
}
