const MERGE_FIELD_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function renderTemplate(
  bodyHtml: string,
  mergeData: Record<string, unknown> | null,
): string {
  return bodyHtml.replace(MERGE_FIELD_PATTERN, (match, field: string) => {
    const value = mergeData?.[field];
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    return match;
  });
}

export function injectUnsubscribeLink(
  bodyHtml: string,
  unsubscribeUrl: string,
): string {
  if (bodyHtml.includes('{{unsubscribe_link}}')) {
    return bodyHtml.replace(/\{\{\s*unsubscribe_link\s*\}\}/g, unsubscribeUrl);
  }
  return `${bodyHtml}\n<p style="font-size:12px;color:#888"><a href="${unsubscribeUrl}">Unsubscribe</a></p>`;
}
