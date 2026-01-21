const DEFAULT_SITE_URL = 'https://campusrentalsllc.com';

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function resolveSiteUrl(rawUrl?: string): string {
  const candidate = rawUrl?.trim();
  if (!candidate) {
    return DEFAULT_SITE_URL;
  }

  try {
    return normalizeUrl(new URL(candidate).toString());
  } catch (error) {
    try {
      return normalizeUrl(new URL(`https://${candidate}`).toString());
    } catch (innerError) {
      console.warn('Invalid NEXT_PUBLIC_SITE_URL, falling back to default:', candidate);
      return DEFAULT_SITE_URL;
    }
  }
}

export function resolveMetadataBase(rawUrl?: string): URL {
  return new URL(resolveSiteUrl(rawUrl));
}
