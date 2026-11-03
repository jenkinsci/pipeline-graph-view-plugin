import DOMPurify from "dompurify";

/** Restricts console HTML to the markup Jenkins console notes produce. */
export function sanitizeConsoleHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["a", "span", "b"],
    ALLOWED_ATTR: ["href", "rel", "class", "style"],
    ALLOWED_URI_REGEXP: /^(?:https?:\/\/|\/(?![/\\]))/i,
  });
}
