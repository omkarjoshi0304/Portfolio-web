// Shared by the local server and the static host's generated _headers file.
export const securityHeaders = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; media-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
});
