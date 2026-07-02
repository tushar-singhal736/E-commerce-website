import DOMPurify from 'dompurify';

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} dirty - Unsanitized input
 * @returns {string} - Sanitized output safe for rendering
 */
export const sanitizeInput = (dirty) => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize HTML content (allows some basic tags)
 * @param {string} dirty - Unsanitized HTML
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHTML = (dirty) => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};

export default DOMPurify;
