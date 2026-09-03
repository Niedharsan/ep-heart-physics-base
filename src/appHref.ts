export function buildAppHref(baseUrl: string, search = '', hash = ''): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedSearch = search.length === 0 || search.startsWith('?')
    ? search
    : `?${search}`;
  const normalizedHash = hash.length === 0 || hash.startsWith('#')
    ? hash
    : `#${hash}`;
  return `${normalizedBase}${normalizedSearch}${normalizedHash}`;
}

export function appHref(search = '', hash = ''): string {
  return buildAppHref(import.meta.env.BASE_URL, search, hash);
}
