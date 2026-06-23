require("dotenv").config();
const nodemailer = require("nodemailer");
const SiteConfig = require("../db/siteConfigDB");

// Mescla a configuração do banco (dashboard) sobre o .env. O banco tem prioridade.
async function getMailConfig() {
  let db = {};
  try {
    const site = await SiteConfig.getSingleton();
    db = site.mail || {};
  } catch (_) { /* sem banco ainda */ }

  const host = db.host || process.env.MAIL_HOST || "";
  const port = db.port || process.env.MAIL_PORT || "587";
  const secure = (db.secure !== undefined ? db.secure : process.env.MAIL_SECURE === "true");
  const user = db.user || process.env.MAIL_USER || "";
  const pass = db.pass || process.env.MAIL_PASS || "";
  const from = db.from || process.env.MAIL_FROM || user;

  return { host, port, secure, user, pass, from, configured: Boolean(user && pass) };
}

function buildTransport(cfg) {
  return nodemailer.createTransport(
    cfg.host
      ? { host: cfg.host, port: Number(cfg.port) || 587, secure: Boolean(cfg.secure), auth: { user: cfg.user, pass: cfg.pass } }
      : { service: "gmail", auth: { user: cfg.user, pass: cfg.pass } } // sem host => Gmail (senha de app)
  );
}

async function isMailConfigured() {
  const cfg = await getMailConfig();
  return cfg.configured;
}

// Envia e-mail. Sem SMTP configurado, apenas loga no console (modo dev).
async function sendMail({ to, subject, html, text }) {
  const cfg = await getMailConfig();
  if (!cfg.configured) {
    const plain = text || (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    console.log("\n========== [DEV MAILER — sem SMTP configurado] ==========");
    console.log("Para:    ", to);
    console.log("Assunto: ", subject);
    console.log("Conteúdo:", plain);
    console.log("=========================================================\n");
    return { dev: true };
  }
  const transporter = buildTransport(cfg);
  return transporter.sendMail({ from: cfg.from, to, subject, html, text });
}

// Layout base dos e-mails (dark + accent gradiente)
function wrap(title, bodyHtml) {
  return `
  <div style="background:#0a0a12;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#e8eaf2;">
    <div style="max-width:480px;margin:0 auto;background:#12131d;border:1px solid rgba(255,255,255,.1);border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c3aed,#22d3ee);padding:20px 24px;">
        <h1 style="margin:0;font-size:20px;color:#fff;">CoddeX</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#fff;">${title}</h2>
        ${bodyHtml}
      </div>
    </div>
  </div>`;
}

// E-mail com o código de verificação de 6 dígitos
async function sendVerificationCode(to, name, code) {
  const body = `
    <p style="color:#9aa0b8;">Olá ${name || ""}, use o código abaixo para confirmar seu e-mail:</p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;letter-spacing:10px;font-size:34px;font-weight:bold;color:#fff;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.4);border-radius:12px;padding:14px 24px;">${code}</span>
    </div>
    <p style="color:#9aa0b8;font-size:13px;">O código expira em 15 minutos. Se você não criou esta conta, ignore este e-mail.</p>`;
  return sendMail({
    to,
    subject: "Seu código de verificação · CoddeX",
    html: wrap("Confirme seu e-mail", body),
    text: `Seu código de verificação é ${code}. Expira em 15 minutos.`
  });
}

// Notifica o admin sobre um novo usuário verificado
async function notifyAdminNewUser(adminEmail, newUser) {
  if (!adminEmail) return { skipped: true };
  const body = `
    <p style="color:#9aa0b8;">Um novo usuário confirmou a conta no seu site:</p>
    <ul style="color:#e8eaf2;">
      <li><strong>Nome:</strong> ${newUser.name}</li>
      <li><strong>E-mail:</strong> ${newUser.email}</li>
    </ul>`;
  return sendMail({
    to: adminEmail,
    subject: "Novo usuário cadastrado · CoddeX",
    html: wrap("Novo usuário", body),
    text: `Novo usuário: ${newUser.name} (${newUser.email})`
  });
}

module.exports = { sendMail, sendVerificationCode, notifyAdminNewUser, isMailConfigured, getMailConfig };
