const { marked } = require("marked");
const sanitizeHtml = require("sanitize-html");

// Configuração do parser: quebra de linha simples vira <br>, sem HTML cru do usuário.
marked.setOptions({
  breaks: true,
  gfm: true
});

// Allowlist segura de tags/atributos para o HTML gerado a partir do markdown.
const sanitizeOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr", "blockquote",
    "strong", "em", "del", "code", "pre",
    "ul", "ol", "li",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "span"
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title"],
    span: ["class"],
    code: ["class"]
  },
  // Apenas protocolos seguros (bloqueia javascript:, data: etc.)
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    // Links externos abrem em nova aba com rel seguro
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" })
  }
};

/**
 * Converte markdown em HTML sanitizado (seguro contra XSS).
 * @param {string} md texto em markdown
 * @returns {string} HTML pronto para uso com <%- %>
 */
function renderMarkdown(md) {
  if (!md) return "";
  const rawHtml = marked.parse(String(md));
  return sanitizeHtml(rawHtml, sanitizeOptions);
}

module.exports = { renderMarkdown };
