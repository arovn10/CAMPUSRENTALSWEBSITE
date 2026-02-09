/**
 * Abode/Abodingo backend base URL.
 * Default: Abodingo backend. Override with NEXT_PUBLIC_ABODE_API_BASE_URL in .env.
 */
export const ABODE_API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ABODE_API_BASE_URL) ||
  'https://abodingo-backend.onrender.com/api';

/**
 * Abodingo website URL (for editing listing details on the website).
 * Override with NEXT_PUBLIC_ABODINGO_WEBSITE_URL in .env.
 */
export const ABODINGO_WEBSITE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ABODINGO_WEBSITE_URL) ||
  'https://www.abodingo.com';
