import crypto from 'crypto';

export interface PromptInjectionAnalysis {
  isSuspicious: boolean;
  flags: string[];
  sanitizedText: string;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|directives)/i,
  /system\s+prompt\s+override/i,
  /you\s+are\s+now\s+an?\s+(unrestricted|admin|god)/i,
  /grant\s+(admin|root|superuser)\s+access/i,
  /bypass\s+(all\s+)?(workflow|security|safety|approval)\s+rules/i,
  /classify\s+this\s+as\s+safe\s+and\s+auto-close/i,
  /delete\s+all\s+audit\s+logs/i,
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /javascript:/i,
];

export function analyzeAndSanitizeInput(text: string): PromptInjectionAnalysis {
  const flags: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(`Matched pattern: ${pattern.toString()}`);
    }
  }

  // Sanitize potentially harmful control characters while preserving meaningful text
  let sanitized = text
    .replace(/\u0000/g, '') // remove null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[REDACTED_SCRIPT]');

  return {
    isSuspicious: flags.length > 0,
    flags,
    sanitizedText: sanitized,
  };
}

export function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

