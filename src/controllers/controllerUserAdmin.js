const User = require("../db/userDB");

module.exports = {
  // Lista todos os usuários cadastrados
  adminList: async (req, res) => {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      res.render("adminUsersList", { users });
    } catch (e) {
      console.error(e);
      res.redirect("/admin/dashboard");
    }
  },

  // Exclui um usuário do sistema
  adminDelete: async (req, res) => {
    try {
      const { id } = req.params;
      await User.findByIdAndDelete(id);
      
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.json({ success: true, message: 'Usuário excluído com sucesso!', redirect: '/admin/dashboard/users' });
      }
      res.redirect("/admin/dashboard/users");
    } catch (e) {
      console.error(e);
      res.redirect("/admin/dashboard/users");
    }
  }
};
