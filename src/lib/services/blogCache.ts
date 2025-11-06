// 블로그 분석 결과 캐시 시스템
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl: number; // Time to live in milliseconds
}

export class BlogCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 6 * 60 * 60 * 1000) { // 기본 6시간
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * 캐시에 데이터 저장
   */
  set(key: string, data: T, options?: CacheOptions): void {
    const ttl = options?.ttl || this.defaultTTL;
    const now = Date.now();

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });

    // 메모리 관리: 100개 이상 저장 시 가장 오래된 항목 제거
    if (this.cache.size > 100) {
      this.pruneOldest();
    }
  }

  /**
   * 캐시에서 데이터 조회
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 만료 확인
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 캐시 키 존재 여부 및 유효성 확인
   */
  has(key: string): boolean {
    const data = this.get(key);
    return data !== null;
  }

  /**
   * 캐시 삭제
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 전체 캐시 초기화
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 만료된 항목 정리
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 가장 오래된 항목 제거
   */
  private pruneOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 캐시 통계 조회
   */
  stats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      defaultTTL: this.defaultTTL
    };
  }
}

// 싱글톤 인스턴스
export const blogAnalysisCache = new BlogCache(6 * 60 * 60 * 1000); // 6시간 캐시
