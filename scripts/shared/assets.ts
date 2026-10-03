// Only parse the quoted, local asset URLs emitted by our Vite build.
export function assetsFromHtml(html: string) {
  return [...html.matchAll(/<(script|link)\b[^>]*>/gi)].flatMap(([tag, type]) => {
    const attributes = Object.fromEntries(
      [...tag.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(([, key, value]) => [key, value]),
    );
    let url: string | undefined;
    let mime = 'text/css';
    if (type === 'script') {
      url = attributes.src;
      mime = 'text/javascript';
    } else if (attributes.rel === 'stylesheet') {
      url = attributes.href;
    }
    if (!url?.startsWith('/assets/') || url.includes('..')) return [];
    return [{ path: url, mime }];
  });
}
