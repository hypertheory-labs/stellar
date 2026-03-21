/*
 * Public API Surface of @hypertheory/sanitize
 */

export { sanitized, sanitizeConfig, autoRedactConfig, arrayOf, keepFirst, keepLast, truncate, replace } from './lib/sanitation';
export type { SanitizationConfig, Sanitized, SanitizationHandler } from './lib/sanitation';
