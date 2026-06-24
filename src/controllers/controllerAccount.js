const User = require("../db/userDB");
const { sendError, sendSuccess } = require("../utils/responseHelper");
const { resolveImage } = require("../utils/uploader");

module.exports = {
  // GET /account/settings
  settingsView: async (req, res) => {
    try {
      const user = await User.findById(req.session.user.id).lean();
      if (!user) return req.session.destroy(() => res.redirect("/login"));
      res.render("accountSettings", { user });
    } catch (error) {
      res.redirect("/account");
    }
  },

  // POST /account/settings/profile
  updateProfile: async (req, res) => {
    try {
      const user = await User.findById(req.session.user.id);
      if (!user) return sendError(req, res, "Usuário não encontrado.", "settings", {}, 404);

      let { username, name } = req.body;
      
      // Update Name
      if (name) {
        name = name.trim();
        if (name.length < 2) return sendError(req, res, "O nome de exibição deve ter pelo menos 2 caracteres.", "settings", {}, 400);
        user.name = name;
      }
      
      // Update Username
      if (username) {
        username = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (username.length < 3) return sendError(req, res, "O username deve ter pelo menos 3 caracteres alfanuméricos.", "settings", {}, 400);
        
        // Verifica se outro usuário já usa esse username
        const existing = await User.findOne({ username, _id: { $ne: user._id } });
        if (existing) {
          return sendError(req, res, "Este nome de usuário já está em uso.", "settings", {}, 400);
        }
        user.username = username;
      }

      // Update or Remove Avatar
      if (req.body.removeAvatar === 'true') {
        user.avatar = ''; // Define como vazio para mostrar a inicial
      } else {
        try {
          const avatarUrl = await resolveImage(req, null, "avatars");
          if (avatarUrl) {
            user.avatar = avatarUrl;
          }
        } catch (err) {
          return sendError(req, res, err.message, "settings", {}, 400);
        }
      }

      await user.save();
      sendSuccess(req, res, "Perfil atualizado com sucesso!", "/account/settings");
    } catch (error) {
      sendError(req, res, error.message, "settings", {}, 500);
    }
  },

  // POST /account/settings/security
  updateSecurity: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return sendError(req, res, "Preencha todos os campos.", "settings", {}, 400);
      }
      if (newPassword.length < 6) {
        return sendError(req, res, "A nova senha deve ter pelo menos 6 caracteres.", "settings", {}, 400);
      }

      const user = await User.findById(req.session.user.id);
      if (!user) return sendError(req, res, "Usuário não encontrado.", "settings", {}, 404);

      const matches = await user.comparePassword(currentPassword);
      if (!matches) {
        return sendError(req, res, "A senha atual está incorreta.", "settings", {}, 400);
      }

      user.password = newPassword; // O hook pre-save irá fazer o hash
      await user.save();

      sendSuccess(req, res, "Senha atualizada com sucesso!", "/account/settings");
    } catch (error) {
      sendError(req, res, error.message, "settings", {}, 500);
    }
  }
};
