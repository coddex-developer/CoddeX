require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  // Verificação por código de 6 dígitos (armazenado como hash)
  verifyCodeHash: { type: String, default: null },
  verifyCodeExpires: { type: Date, default: null },
  verifyAttempts: { type: Number, default: 0 },
  // Recuperação de senha (código de 6 dígitos)
  resetCodeHash: { type: String, default: null },
  resetCodeExpires: { type: Date, default: null },
  resetAttempts: { type: Number, default: 0 },
  role: { type: String, default: "user" }
}, { timestamps: true });

// Hash da senha sempre que for definida/alterada
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(String(plain), this.password);
};

// Gera um código de 6 dígitos, guarda o hash, expira em 15 min e zera tentativas.
// Retorna o código em claro (para enviar por e-mail).
userSchema.methods.setVerificationCode = async function () {
  const code = String(crypto.randomInt(100000, 1000000));
  this.verifyCodeHash = await bcrypt.hash(code, 10);
  this.verifyCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
  this.verifyAttempts = 0;
  return code;
};

// Valida o código informado. Retorna { ok, reason }.
// Só o código exato, não expirado e dentro do limite de tentativas é aceito.
userSchema.methods.checkVerificationCode = async function (code) {
  if (this.emailVerified) return { ok: true };
  if (!this.verifyCodeHash || !this.verifyCodeExpires) return { ok: false, reason: "no_code" };
  if (this.verifyCodeExpires < new Date()) return { ok: false, reason: "expired" };
  if (this.verifyAttempts >= 5) return { ok: false, reason: "too_many" };

  const match = await bcrypt.compare(String(code), this.verifyCodeHash);
  if (!match) {
    this.verifyAttempts += 1;
    await this.save();
    return { ok: false, reason: "invalid" };
  }

  this.emailVerified = true;
  this.verifyCodeHash = null;
  this.verifyCodeExpires = null;
  this.verifyAttempts = 0;
  await this.save();
  return { ok: true };
};

// Recuperação de senha: gera código de 6 dígitos (hash, expira 15 min)
userSchema.methods.setResetCode = async function () {
  const code = String(crypto.randomInt(100000, 1000000));
  this.resetCodeHash = await bcrypt.hash(code, 10);
  this.resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
  this.resetAttempts = 0;
  return code;
};

// Valida o código de recuperação. Retorna { ok, reason }.
userSchema.methods.checkResetCode = async function (code) {
  if (!this.resetCodeHash || !this.resetCodeExpires) return { ok: false, reason: "no_code" };
  if (this.resetCodeExpires < new Date()) return { ok: false, reason: "expired" };
  if (this.resetAttempts >= 5) return { ok: false, reason: "too_many" };
  const match = await bcrypt.compare(String(code), this.resetCodeHash);
  if (!match) {
    this.resetAttempts += 1;
    await this.save();
    return { ok: false, reason: "invalid" };
  }
  return { ok: true };
};

module.exports = mongoose.model("User", userSchema);
