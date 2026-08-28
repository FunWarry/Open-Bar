import { Pipe, PipeTransform } from '@angular/core';
import { sanitizePlainText } from '../utils/sanitizer.util';

/**
 * Custom pipe for sanitizing plain text strings and preventing XSS injections in template interpolations.
 */
@Pipe({
  name: 'appSanitize',
  standalone: true
})
export class SanitizePipe implements PipeTransform {

  /**
   * Transforms raw text into safe sanitized plain text by stripping HTML tags and executable scripts.
   *
   * @param value Raw text input
   * @returns Sanitized plain text
   */
  transform(value: string | null | undefined): string {
    return sanitizePlainText(value);
  }
}
