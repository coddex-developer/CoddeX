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
  },

  // Bloquear ou Desbloquear um usuário
  toggleBlock: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
      
      user.isBlocked = !user.isBlocked;
      await user.save();
      
      return res.json({ success: true, message: `Usuário ${user.isBlocked ? 'bloqueado' : 'desbloqueado'} com sucesso!`, isBlocked: user.isBlocked });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao processar a requisição.' });
    }
  },

  // Alterar senha do usuário manualmente
  updatePassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
      }

      user.password = newPassword;
      await user.save();
      
      return res.json({ success: true, message: 'Senha atualizada com sucesso!' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao atualizar a senha.' });
    }
  },

  // Obter interações do usuário (estatísticas)
  getInteractions: async (req, res) => {
    try {
      const { id } = req.params;
      
      const Comment = require("../db/commentDB");
      const CommentLike = require("../db/commentLikeDB");
      const Ticket = require("../db/ticketDB");

      const commentsCount = await Comment.countDocuments({ user: id });
      const likesCount = await CommentLike.countDocuments({ user: id });
      const ticketsCount = await Ticket.countDocuments({ user: id });

      return res.json({
        success: true,
        stats: {
          comments: commentsCount,
          likes: likesCount,
          tickets: ticketsCount
        }
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao carregar interações.' });
    }
  }
};
