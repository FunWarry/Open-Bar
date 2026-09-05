/**
 * Utility functions for client-side text sanitization and XSS prevention.
 */

const DANGEROUS_BLOCK_TAGS = /<\s*(?:script|style|iframe|object|embed|svg)[^>]*>[\s\S]*?<\s*\/\s*(?:script|style|iframe|object|embed|svg)[^>]*>/gi;
const DANGEROUS_SELF_CLOSING = /<\s*(?:script|style|iframe|object|embed|svg|link|meta|frame|base)[^>]*\/?>/gi;
const HTML_TAG_REGEX = /<\/?[a-z][a-z0-9]*[^<>]*>|<!--.*?-->/gi;
const EVENT_HANDLER_REGEX = /\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
const JAVASCRIPT_URL_REGEX = /javascript\s*:[^"'\s>]+/gi;

/**
 * Repeatedly strips matches of a regex until no more replacements occur,
 * preventing nested tag re-emergence (e.g. <scr<script>ipt>).
 */
function stripRepeatedly(text: string, regex: RegExp): string {
  let previous: string;
  do {
    previous = text;
    text = text.replace(regex, '');
  } while (text !== previous);
  return text;
}

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
  sanitized = stripRepeatedly(sanitized, DANGEROUS_BLOCK_TAGS);
  sanitized = stripRepeatedly(sanitized, DANGEROUS_SELF_CLOSING);
  // Remove all other HTML tags
  sanitized = stripRepeatedly(sanitized, HTML_TAG_REGEX);
  // Remove inline event handlers and javascript: URLs
  sanitized = stripRepeatedly(sanitized, EVENT_HANDLER_REGEX);
  sanitized = stripRepeatedly(sanitized, JAVASCRIPT_URL_REGEX);
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
  sanitized = stripRepeatedly(sanitized, DANGEROUS_BLOCK_TAGS);
  sanitized = stripRepeatedly(sanitized, DANGEROUS_SELF_CLOSING);
  // 2. Strip inline event handlers (e.g. onclick, onerror, onload)
  sanitized = stripRepeatedly(sanitized, EVENT_HANDLER_REGEX);
  // 3. Strip javascript: pseudo-protocols
  sanitized = stripRepeatedly(sanitized, JAVASCRIPT_URL_REGEX);
  return sanitized.trim();
}
