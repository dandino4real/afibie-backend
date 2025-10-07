import { Context } from 'telegraf';

export interface SessionData {
  step?: string;
  captcha?: string;
  country?: string;
  bybitUid?: string;
  blofinUid?: string;
  requiresBoth?: boolean;
  botType?: string;
  excoTraderLoginId?: string;
  derivLoginId?: string;
  retryCount?: number;
  loginId?: string;
  awaitingLoginId?: boolean;
  awaitingScreenshot?: boolean;
  awaitingTestTradesScreenshot?: boolean;
  broker?: string;
  group?: string;

  
}

export interface BotContext extends Context {
  session: SessionData;
  botType: string;
}