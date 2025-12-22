const sanitizeHtml = require('sanitize-html');

module.exports = (dirtyHtml) => {
  return sanitizeHtml(dirtyHtml, {
    allowedTags: [
      'b', 'i', 'em', 'strong',
      'p', 'br',
      'ul', 'ol', 'li',
      'h1', 'h2', 'h3',
      'blockquote',
      'a'
    ],
    allowedAttributes: {
      a: ['href', 'target']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
};
