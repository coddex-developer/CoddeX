const fs = require('fs');

const path = './src/controllers/controlerPage.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('sendError')) {
  content = 'const { sendError, sendSuccess } = require("../utils/responseHelper");\n' + content;
}

// Replace pattern 1:
// res.render("warning", { title: "Aviso!", info: error.message, textButton: "Voltar", url: "/" })
content = content.replace(/res\.render\(\s*["']warning["']\s*,\s*\{\s*title:\s*["'][^"']*["'],\s*info:\s*([^,]+),\s*textButton:\s*["'][^"']*["'],\s*url:\s*([^}]+)\s*\}\s*\)/g, 'sendError(req, res, $1, "warning", {}, 500, $2)');

// Replace pattern 2: status + render
content = content.replace(/res\.status\((\d+)\)\.render\([\s\S]*?info:\s*([^,]+),[\s\S]*?url:\s*([^}]+?)\s*\}\)/g, 'sendError(req, res, $2, "warning", {}, $1, $3)');

// Replace pattern 3: generic render
content = content.replace(/res\.render\([\s\S]*?info:\s*([^,]+),[\s\S]*?url:\s*([^}]+?)\s*\}\)/g, 'sendError(req, res, $1, "warning", {}, 500, $2)');

fs.writeFileSync(path, content);
console.log('controlerPage.js replaced');
