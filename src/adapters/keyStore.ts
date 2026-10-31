/**
 * User Key Storage & Management for OpenRouter
 * Allows users to provide their own OpenRouter API key when the host credit runs out.
 * Keys are saved locally in the user's browser (localStorage) and transmitted via headers to backend proxy routes.
 */

const STORAGE_KEY = 'aja_user_openrouter_key';
type KeyListener = (key: string) => void;
const listeners = new Set<KeyListener>();

export class QuotaExceededError extends Error {
  code: string;
  details?: string;

  constructor(message: string, code = 'INSUFFICIENT_CREDITS', details?: string) {
    super(message);
    this.name = 'QuotaExceededError';
    this.code = code;
    this.details = details;
  }
}

export function getUserOpenRouterKey(): string {
  try {
    return (localStorage.getItem(STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function setUserOpenRouterKey(key: string): void {
  const sanitized = key.trim();
  try {
    if (sanitized) {
      localStorage.setItem(STORAGE_KEY, sanitized);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted iframes
  }
  listeners.forEach((fn) => fn(sanitized));
}

export function clearUserOpenRouterKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  listeners.forEach((fn) => fn(''));
}

export function hasUserOpenRouterKey(): boolean {
  return Boolean(getUserOpenRouterKey());
}

export function subscribeUserKeyChanges(callback: KeyListener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export interface KeyTestResult {
  valid: boolean;
  messageAr: string;
  usageUsd?: number;
  limitUsd?: number | null;
  isFreeTier?: boolean;
}

export async function testOpenRouterKey(apiKey: string): Promise<KeyTestResult> {
  const sanitized = apiKey.trim();
  if (!sanitized) {
    return {
      valid: false,
      messageAr: 'يرجى إدخال مفتاح API أولاً قبل الاختبار.',
    };
  }

  try {
    const res = await fetch('/api/sim/openrouter/test-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: sanitized }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.valid) {
      return {
        valid: true,
        messageAr: 'المفتاح صالح وفعال على OpenRouter بنجاح!',
        usageUsd: data.data?.usage,
        limitUsd: data.data?.limit,
        isFreeTier: data.data?.is_free_tier,
      };
    }

    return {
      valid: false,
      messageAr: data.error || 'المفتاح غير صالح أو أن رصيده غير كافٍ على OpenRouter.',
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      messageAr: `فشل التحقق من المفتاح: ${errMsg}`,
    };
  }
}
