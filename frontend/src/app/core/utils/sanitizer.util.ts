/**
 * Utility functions for client-side text sanitization and XSS prevention.
 */

const DANGEROUS_BLOCK_TAGS = /<\s*(?:script|style|iframe|object|embed|svg)[^>]*>[\s\S]*?<\s*\/\s*(?:script|style|iframe|object|embed|svg)\s*>/gi;
const DANGEROUS_SELF_CLOSING = /<\s*(?:script|style|iframe|object|embed|svg|link|meta|frame|base)[^>]*\/?>/gi;
const HTML_TAG_REGEX = /<\/?[a-z][a-z0-9]*[^<>]*>|<!--.*?-->/gi;
const EVENT_HANDLER_REGEX = /\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
const JAVASCRIPT_URL_REGEX = /javascript\s*:[^"'\s>]+/gi;

/**
 * Sanitizes input string by removing all HTML tags, script elements, event handlers, and javascript: URLs,
 * returning clean plain text.
 *
 * @param input Raw input text
 * @returns Sanitized plain text string
 */
export function sanitizePlainText(input: string | null | undefined): string {
  if (input == null) {
    return '';
  }
  let sanitized = String(input);
  // Remove dangerous script and embed elements with their content
  sanitized = sanitized.replace(DANGEROUS_BLOCK_TAGS, '');
  sanitized = sanitized.replace(DANGEROUS_SELF_CLOSING, '');
  // Remove all other HTML tags
  sanitized = sanitized.replace(HTML_TAG_REGEX, '');
  // Remove inline event handlers and javascript: URLs
  sanitized = sanitized.replace(EVENT_HANDLER_REGEX, '');
  sanitized = sanitized.replace(JAVASCRIPT_URL_REGEX, '');
  return sanitized.trim();
}

/**
 * Sanitizes HTML input by stripping executable tags and dangerous handlers while preserving clean markup.
 *
 * @param input Raw HTML string
 * @returns Safe sanitized HTML string
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (input == null) {
    return '';
  }
  let sanitized = String(input);
  // 1. Remove dangerous block and self-closing tags entirely
  sanitized = sanitized.replace(DANGEROUS_BLOCK_TAGS, '');
  sanitized = sanitized.replace(DANGEROUS_SELF_CLOSING, '');
  // 2. Strip inline event handlers (e.g. onclick, onerror, onload)
  sanitized = sanitized.replace(EVENT_HANDLER_REGEX, '');
  // 3. Strip javascript: pseudo-protocols
  sanitized = sanitized.replace(JAVASCRIPT_URL_REGEX, '');
  return sanitized.trim();
}
