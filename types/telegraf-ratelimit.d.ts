
declare module 'telegraf-ratelimit' {
  import { Middleware } from 'telegraf';

  interface RateLimitOptions {
    window?: number;
    limit?: number;
    onLimitExceeded?: (ctx: any, next: () => Promise<void>) => void;
    keyGenerator?: (ctx: any) => string;
    whitelist?: (ctx: any) => boolean;
    blacklist?: (ctx: any) => boolean;
  }

  function rateLimit(options?: RateLimitOptions): Middleware<any>;
  export = rateLimit;
}
