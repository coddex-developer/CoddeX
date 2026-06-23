const fs = require('fs');

const path = './src/controllers/controllerAuth.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('sendError')) {
  content = 'const { sendError, sendSuccess } = require("../utils/responseHelper");\n' + content;
}

// Register errors
content = content.replace(/res\.status\((\d+)\)\.render\(\s*["']register["']\s*,\s*\{\s*error:\s*(.+?)\s*,\s*values\s*\}\s*\)/g, 'sendError(req, res, $2, "register", values, $1)');

// Verify errors
content = content.replace(/res\.status\((\d+)\)\.render\(\s*["']verify["']\s*,\s*\{\s*error:\s*(.+?)\s*,\s*info:\s*null\s*,\s*email\s*\}\s*\)/g, 'sendError(req, res, $2, "verify", { email }, $1)');

// Login errors
content = content.replace(/res\.status\((\d+)\)\.render\(\s*["']login["']\s*,\s*\{\s*error:\s*(.+?)\s*,\s*values\s*\}\s*\)/g, 'sendError(req, res, $2, "login", values, $1)');

// Forgot errors
content = content.replace(/res\.status\((\d+)\)\.render\(\s*["']forgot["']\s*,\s*\{\s*error:\s*(.+?)\s*,\s*info:\s*null\s*\}\s*\)/g, 'sendError(req, res, $2, "forgot", {}, $1)');

// Reset errors
content = content.replace(/res\.status\((\d+)\)\.render\(\s*["']reset["']\s*,\s*\{\s*error:\s*(.+?)\s*,\s*info:\s*null\s*,\s*email\s*\}\s*\)/g, 'sendError(req, res, $2, "reset", { email }, $1)');

// Redirects that should become sendSuccess in AJAX
// /verify resend
content = content.replace(/res\.render\(\s*["']verify["']\s*,\s*\{\s*error:\s*null\s*,\s*info:\s*(.+?)\s*,\s*email\s*\}\s*\)/g, 'sendSuccess(req, res, $1, "/verify")');

// res.redirect(...) for success?
// For register: res.redirect("/account")
// I will not regex that, it's safer. The user will be redirected. But we want AJAX forms to not reload!
// Wait, if it's an AJAX form, we NEED sendSuccess!
content = content.replace(/res\.redirect\(\s*["']\/account["']\s*\)/g, 'sendSuccess(req, res, "Bem-vindo!", "/account")');
content = content.replace(/return res\.redirect\(\s*["']\/verify["']\s*\)/g, 'return sendSuccess(req, res, "Código enviado para o seu e-mail.", "/verify")');
content = content.replace(/res\.redirect\(\s*["']\/reset["']\s*\)/g, 'sendSuccess(req, res, "Se o e-mail existir, enviamos o código.", "/reset")');

// Specific warning render in reset
content = content.replace(/res\.render\(\s*["']warning["']\s*,\s*\{\s*title:\s*["']Senha alterada!["'],\s*icon:\s*["']success["'],\s*info:\s*["']Sua senha foi redefinida\. Faça login\.["'],\s*textButton:\s*["']Entrar["'],\s*url:\s*["']\/login["']\s*\}\s*\)/g, 'sendSuccess(req, res, "Sua senha foi redefinida. Faça login.", "/login")');

// account error
content = content.replace(/res\.status\(500\)\.render\(\s*["']warning["']\s*,\s*\{\s*title:\s*["']Aviso!["'],\s*info:\s*error\.message,\s*textButton:\s*["']Voltar["'],\s*url:\s*["']\/["']\s*\}\s*\)/g, 'sendError(req, res, error.message, "warning", {}, 500, "/")');

fs.writeFileSync(path, content);
console.log('controllerAuth.js replaced');
