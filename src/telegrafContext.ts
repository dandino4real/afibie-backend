import { Context } from 'telegraf';

export interface SessionData {
  step?: string;
  captcha?: string;
  country?: string;
  bybitUid?: string;
  hasBybitAccount?: boolean;
  blofinUid?: string;
  weexUid?:string;
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
  mode?: "chat" | "default";

  
}

export interface BotContext extends Context {
  session: SessionData;
  botType: string;
}