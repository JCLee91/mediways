import { createClient } from '@/lib/supabase/server';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,  // 10 requests
  windowMs: 60000,  // per 1 minute
};

export class RateLimiter {
  constructor(private config: RateLimitConfig = DEFAULT_CONFIG) {}

  async checkLimit(userId: string, endpoint: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const supabase = await createClient();
    const windowStart = Date.now() - this.config.windowMs;
    
    // Get recent requests count
    const { data: requests, error } = await supabase
      .from('api_requests')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('created_at', new Date(windowStart).toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Rate limit check failed:', error);
      // Allow request on error to avoid blocking users
      return { allowed: true };
    }

    const requestCount = requests?.length || 0;

    if (requestCount >= this.config.maxRequests) {
      const oldestRequest = requests?.[0];
      if (oldestRequest) {
        const retryAfter = this.config.windowMs - (Date.now() - new Date((oldestRequest as any).created_at).getTime());
        return { allowed: false, retryAfter: Math.ceil(retryAfter / 1000) };
      }
      return { allowed: false, retryAfter: 60 };
    }

    // Log the request
    await supabase
      .from('api_requests')
      .insert({ user_id: userId, endpoint, created_at: new Date().toISOString() });

    return { allowed: true };
  }
}

// Create a singleton instance
export const rateLimiter = new RateLimiter();