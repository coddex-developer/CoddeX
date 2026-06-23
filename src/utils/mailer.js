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
  if (cfg.host) {
    const port = Number(cfg.port) || 587;
    // Regra robusta: porta 465 = SSL direto; demais (587/2525) = STARTTLS.
    // Evita o erro comum de marcar "SSL" na porta 587 (Brevo, Mailtrap, etc.).
    const secure = port === 465;
    return nodemailer.createTransport({
      host: cfg.host,
      port,
      secure,
      requireTLS: !secure,
      auth: { user: cfg.user, pass: cfg.pass }
    });
  }
  // Sem host => Gmail com senha de app (SMTP SSL explícito)
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass }
  });
}

async function isMailConfigured() {
  const cfg = await getMailConfig();
  return cfg.configured;
}

// Testa a conexão/credenciais SMTP. Retorna { ok, configured, error }.
async function verifyConnection() {
  const cfg = await getMailConfig();
  if (!cfg.configured) {
    return { ok: false, configured: false, error: "SMTP não configurado (usuário e/ou senha vazios)." };
  }
  try {
    await buildTransport(cfg).verify();
    return { ok: true, configured: true };
  } catch (e) {
    return { ok: false, configured: true, error: e.message };
  }
}

// Envia um e-mail de teste
async function sendTestEmail(to) {
  return sendMail({
    to,
    subject: "Teste de SMTP · CoddeX",
    html: wrap("Funciona! 🎉", "<p style=\"color:#9aa0b8;\">Se você recebeu este e-mail, seu SMTP está configurado corretamente.</p>"),
    text: "Seu SMTP está configurado corretamente."
  });
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

// E-mail com o código de recuperação de senha
async function sendResetCode(to, name, code) {
  const body = `
    <p style="color:#9aa0b8;">Olá ${name || ""}, use o código abaixo para redefinir sua senha:</p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;letter-spacing:10px;font-size:34px;font-weight:bold;color:#fff;background:rgba(34,211,238,.15);border:1px solid rgba(34,211,238,.4);border-radius:12px;padding:14px 24px;">${code}</span>
    </div>
    <p style="color:#9aa0b8;font-size:13px;">O código expira em 15 minutos. Se você não solicitou, ignore este e-mail.</p>`;
  return sendMail({
    to,
    subject: "Recuperação de senha · CoddeX",
    html: wrap("Redefinir senha", body),
    text: `Seu código de recuperação é ${code}. Expira em 15 minutos.`
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

// Botão de link reutilizável nos e-mails
function linkButton(url, label) {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#22d3ee);color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;">${label}</a>
  </div>
  <p style="color:#9aa0b8;font-size:13px;">Ou acesse: <a href="${url}" style="color:#22d3ee;">${url}</a></p>`;
}

// Avisa o admin que um usuário enviou uma mensagem (com link para o painel da conversa)
async function notifyAdminNewMessage(adminEmail, fromName, subject, snippet, panelUrl) {
  if (!adminEmail) return { skipped: true };
  const body = `
    <p style="color:#9aa0b8;"><strong>${fromName}</strong> enviou uma mensagem${subject ? ` sobre "<strong>${subject}</strong>"` : ""}:</p>
    <blockquote style="border-left:3px solid #7c3aed;padding-left:12px;color:#e8eaf2;">${snippet}</blockquote>
    ${linkButton(panelUrl, "Ver conversa no painel")}`;
  return sendMail({
    to: adminEmail,
    subject: `Nova mensagem de ${fromName} · CoddeX`,
    html: wrap("Nova mensagem", body),
    text: `${fromName} enviou: ${snippet}\nAbra: ${panelUrl}`
  });
}

// Avisa o usuário que o admin respondeu (com link para o painel dele)
async function notifyUserReply(userEmail, subject, snippet, panelUrl) {
  if (!userEmail) return { skipped: true };
  const body = `
    <p style="color:#9aa0b8;">Você recebeu uma resposta${subject ? ` sobre "<strong>${subject}</strong>"` : ""}:</p>
    <blockquote style="border-left:3px solid #22d3ee;padding-left:12px;color:#e8eaf2;">${snippet}</blockquote>
    ${linkButton(panelUrl, "Ver resposta")}`;
  return sendMail({
    to: userEmail,
    subject: "Você recebeu uma resposta · CoddeX",
    html: wrap("Nova resposta", body),
    text: `Resposta: ${snippet}\nAbra: ${panelUrl}`
  });
}

module.exports = { sendMail, sendVerificationCode, sendResetCode, notifyAdminNewUser, notifyAdminNewMessage, notifyUserReply, isMailConfigured, getMailConfig, verifyConnection, sendTestEmail };
