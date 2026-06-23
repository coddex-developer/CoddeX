require("dotenv").config();
const bcrypt = require("bcryptjs");
const UUID = require('uuid').v4;
const MessageDB = require("../db/messageDB");
const ProjectsDB = require("../db/projectsDB");
const CertificateDB = require("../db/certificatesDB");
const Admin = require("../db/adminDB.js");
const SiteConfig = require("../db/siteConfigDB.js");
const Like = require("../db/likeDB.js");
const Comment = require("../db/commentDB.js");
const { resolveImage } = require("../utils/uploader.js");
const { verifyConnection, sendTestEmail } = require("../utils/mailer.js");

module.exports = {

  //GET /
  index: async (req, res) => {
    try {
      const certificates = await CertificateDB.find();
      const projects = await ProjectsDB.find().lean();
      const site = await SiteConfig.getSingleton();

      // Curtidas e comentários por projeto
      const [likeAgg, commentAgg] = await Promise.all([
        Like.aggregate([{ $group: { _id: "$project", count: { $sum: 1 } } }]),
        Comment.aggregate([{ $group: { _id: "$project", count: { $sum: 1 } } }])
      ]);
      const likeMap = {}, commentMap = {};
      likeAgg.forEach(l => { likeMap[l._id] = l.count; });
      commentAgg.forEach(c => { commentMap[c._id] = c.count; });

      // Projetos curtidos pelo usuário logado (para marcar o coração)
      let likedSet = new Set();
      if (req.session.user) {
        const myLikes = await Like.find({ user: req.session.user.id }).lean();
        likedSet = new Set(myLikes.map(l => String(l.project)));
      }

      projects.forEach(p => {
        p.likeCount = likeMap[p._id] || 0;
        p.commentCount = commentMap[p._id] || 0;
        p.likedByMe = likedSet.has(String(p._id));
      });

      res.render('index', { site, projects, certificates });
    } catch (error) {
      res.render("warning", {
        title: "Aviso!",
        info: error.message,
        textButton: "Tentar novamente",
        url: "/"
      })
    }
  },

  //GET /admin
  admin: (req, res) => {
    res.render('admin');
  },

  //POST /admin
  account: async (req, res) => {
    const { userAdmin, passAdmin } = req.body;

    try {
      const admin = await Admin.findOne({ userAdmin });

      const passwordMatches = admin
        ? await bcrypt.compare(passAdmin, admin.passAdmin)
        : false;

      if (!admin || !passwordMatches) {
        return res.status(401).render("warning", {
          title: "Oops",
          info: "Credenciais inválidas",
          textButton: "Tentar novamente",
          url: "/admin"
        })
      }

      req.session.authenticated = true;
      req.session.currentUser = {
        id: admin.id,
        userAdmin: admin.userAdmin,
        role: admin.role
      };
      res.status(200).redirect('/admin/dashboard');
    } catch (error) {
      res.render("warning", {
        title: "Aviso!",
        info: error.message,
        textButton: "Tentar novamente",
        url: "/"
      })
    }
  },

  //GET /admin/dashboard/
  dashboard: async (req, res) => {
    try {
      const resultMessage = await MessageDB.find();
      const unreadMessage = await MessageDB.find({ completed: false });
      const projects = await ProjectsDB.find();

      res.render('dashboard', { adminUser: req.session.currentUser, resultMessage, unreadMessage, projects });
    } catch (error) {
      res.render("warning", {
        title: "Aviso!",
        info: error.message,
        textButton: "Tentar novamente",
        url: "/"
      })
    }
  },

  //POST DESTROY SESSION
  logout: (req, res) => {
    req.session.destroy();
    res.redirect('/admin');
  },
  //GET
  unreadMessages: async (req, res) => {
    try {
      const resultMessage = await MessageDB.find({ completed: false });
      const projects = await ProjectsDB.find()
      if (resultMessage.length <= 0) {
        res.render("warning", {
          title: "Aviso!",
          info: "Não temos mensagens no momento volte mais tarde.",
          textButton: "Voltar",
          url: "/admin/dashboard"
        })
        return
      }

      res.render("unread", { resultMessage, projects })
    } catch (error) {
      res.render("warning", {
        title: "Aviso!",
        info: error.message,
        textButton: "Tentar novamente",
        url: "/"
      })
    }
  },

  //GET admin/dashboard/messages
  showMessage: async (req, res) => {
    try {
      const resultMessage = await MessageDB.find();
      const projects = await ProjectsDB.find()
      if (resultMessage.length === 0) {
        res.render("warning", {
          title: "Aviso!",
          info: "Não temos mensagens no momento volte mais tarde.",
          textButton: "Voltar",
          url: "/admin/dashboard"
        })
        return
      }
      res.render("messages", { notes: await resultMessage, projects })
    } catch (error) {
      res.render("warning", {
        title: "Aviso!",
        info: error.message,
        textButton: "Voltar",
        url: "/"
      })
    }
  },

  //GET admin/dashboard/messages/:id
  viewMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const resultMessage = await MessageDB.findOne({ _id: id });
      const projects = await ProjectsDB.find()

      if (!resultMessage) {
        res.render("warning", {
          title: "Oops!",
          info: "Nenhum resultado encontrado.",
          textButton: "Voltar",
          url: "/admin/dashboard/messages"
        })
        return
      }

      res.render("cardMessage", { resultMessage, projects })
    } catch (error) {
      res.render("warning", {
        title: "Aviso!",
        info: error.message,
        textButton: "Voltar",
        url: "/admin"
      })
    }
  },

  //DELETE admin/dashboard/messages/:id/delete
  deletessage: async (req, res) => {
    const { id } = req.params
    const resultMessage = await MessageDB.findByIdAndDelete(id);
    if (!resultMessage) {
      res.render("warning", {
        title: "Oops!",
        info: "Não foi possível excluir esta mensagem pois não foi encontrada.",
        textButton: "Voltar",
        url: "/admin/dashboard/messages"
      })
      return
    }
    res.redirect("/admin/dashboard/messages")
  },

  completedMessage: async (req, res) => {
    try {
      const { id } = req.params
      const resultMessage = await MessageDB.findOne({ _id: id });
      if (!resultMessage) {
        res.send("Mensagem não emcontrada!")
        return
      }
      resultMessage.completed = true
      await resultMessage.save()
      res.redirect(`/admin/dashboard/messages/${resultMessage.id}`)
    } catch (error) {
      res.send(error)
    }
  },

  incompletedMessage: async (req, res) => {
    try {
      const { id } = req.params
      const resultMessage = await MessageDB.findOne({ _id: id });

      if (!resultMessage) {
        res.send("Mensagem não emcontrada!")
        return
      }
      resultMessage.completed = false
      await resultMessage.save()
      res.redirect(`/admin/dashboard/messages/${resultMessage.id}`)
    } catch (error) {
      res.send(error)
    }
  },

  //GET /admin/dashboard/adminProfile
  myProfile: async (req, res) => {
    const projects = await ProjectsDB.find();
    const site = await SiteConfig.getSingleton();
    res.render("adminProfile", { adminUser: req.session.currentUser, projects, site })
  },

  //POST /admin/dashboard/adminProfile
  editProfile: async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password || username.length < 2 || password.length < 2) {
      res.status(400).send("Todos os campos são obrigatórios!");
      return
    }

    if (password === "1234") {
      res.status(400).send("Digite uma senha mais forte!");
      return
    }

    try {
      const admin = await Admin.findById(req.session.currentUser.id);

      if (!admin) {
        res.status(404).send("Administrador não encontrado!");
        return
      }

      admin.userAdmin = username;
      admin.passAdmin = password; // o hash é gerado automaticamente no model
      await admin.save();

      req.session.destroy()
      res.status(200).redirect("/admin")
    } catch (error) {
      res.status(500).send(error.message)
    }
  },

  //GET /admin/dashboard/editPage
  editPage: async (req, res) => {
    const projects = await ProjectsDB.find();
    const site = await SiteConfig.getSingleton();
    res.render("editPage", { site, projects })
  },

  //POST /admin/dashboard/editPage/save
  saveEditPage: async (req, res) => {
    const { titleForm, subtitleForm, titleAboutMeForm, textAboutMeForm } = req.body;

    if (!titleForm || !subtitleForm || !titleAboutMeForm || !textAboutMeForm) {
      return res.status(400).send("Todos os campos precisam ser preenchidos corretamente!");
    }

    try {
      const site = await SiteConfig.getSingleton();
      site.title = titleForm;
      site.subtitle = subtitleForm;
      site.titleAboutMe = titleAboutMeForm;
      site.textAboutMe = textAboutMeForm;
      await site.save();

      res.render("warning", {
        title: "Boas notícias!",
        info: "O conteúdo do site foi atualizado com sucesso.",
        textButton: "Ok",
        url: "/admin/dashboard/editPage"
      })
    } catch (error) {
      res.status(500).render("warning", {
        title: "Aviso!",
        info: error.message,
        textButton: "Tentar novamente",
        url: "/admin/dashboard/editPage"
      })
    }
  },

  // POST /admin/dashboard/profile/social — redes sociais e contato
  saveSocial: async (req, res) => {
    const { github, linkedin, instagram, whatsapp, contactEmail, contactPhone } = req.body;
    try {
      const site = await SiteConfig.getSingleton();
      site.social = {
        github: github || "",
        linkedin: linkedin || "",
        instagram: instagram || "",
        whatsapp: whatsapp || ""
      };
      site.contactEmail = contactEmail || "";
      site.contactPhone = contactPhone || "";
      await site.save();
      res.redirect("/admin/dashboard/adminProfile?toast=" + encodeURIComponent("Redes sociais salvas!") + "#social");
    } catch (error) {
      res.status(500).render("warning", { title: "Aviso!", info: error.message, textButton: "Voltar", url: "/admin/dashboard/adminProfile" });
    }
  },

  // POST /admin/dashboard/profile/mail — configuração SMTP
  saveMail: async (req, res) => {
    const { mailHost, mailPort, mailSecure, mailUser, mailPass, mailFrom } = req.body;
    try {
      const site = await SiteConfig.getSingleton();
      site.mail.host = mailHost || "";
      site.mail.port = mailPort || "587";
      site.mail.secure = mailSecure === "on" || mailSecure === "true";
      site.mail.user = mailUser || "";
      site.mail.from = mailFrom || "";
      if (mailPass && mailPass.trim()) site.mail.pass = mailPass.trim(); // só atualiza se enviada
      await site.save();
      res.redirect("/admin/dashboard/adminProfile?toast=" + encodeURIComponent("Configuração de e-mail salva!") + "#mail");
    } catch (error) {
      res.status(500).render("warning", { title: "Aviso!", info: error.message, textButton: "Voltar", url: "/admin/dashboard/adminProfile" });
    }
  },

  // POST /admin/dashboard/profile/cloudinary — credenciais do Cloudinary
  saveCloudinary: async (req, res) => {
    const { cloudName, cloudApiKey, cloudApiSecret } = req.body;
    try {
      const site = await SiteConfig.getSingleton();
      site.cloudinary.cloudName = cloudName || "";
      site.cloudinary.apiKey = cloudApiKey || "";
      if (cloudApiSecret && cloudApiSecret.trim()) site.cloudinary.apiSecret = cloudApiSecret.trim();
      await site.save();
      res.redirect("/admin/dashboard/adminProfile?toast=" + encodeURIComponent("Cloudinary salvo!") + "#cloudinary");
    } catch (error) {
      res.status(500).render("warning", { title: "Aviso!", info: error.message, textButton: "Voltar", url: "/admin/dashboard/adminProfile" });
    }
  },

  // POST /admin/dashboard/profile/mail/test — valida a conexão e envia e-mail de teste
  testMail: async (req, res) => {
    try {
      const result = await verifyConnection();
      if (!result.ok) {
        return res.status(400).render("warning", {
          title: "SMTP falhou", icon: "error",
          info: result.error,
          textButton: "Voltar", url: "/admin/dashboard/adminProfile#mail"
        });
      }
      const site = await SiteConfig.getSingleton();
      const to = site.contactEmail || site.mail.user;
      await sendTestEmail(to);
      res.render("warning", {
        title: "SMTP OK!", icon: "success",
        info: "Conexão validada e e-mail de teste enviado para " + to + ".",
        textButton: "Ok", url: "/admin/dashboard/adminProfile#mail"
      });
    } catch (error) {
      res.status(500).render("warning", {
        title: "SMTP falhou", icon: "error",
        info: error.message,
        textButton: "Voltar", url: "/admin/dashboard/adminProfile#mail"
      });
    }
  },

  createProject: async (req, res) => {
    const projects = await ProjectsDB.find();
    if (!projects) {
      res.send("Projeto não encontrado!")
      return
    }
    res.status(200).render("CreateProjects", { projects })
  },

  saveProject: async (req, res) => {
    const { imagePj, titlePj, descriptionPj, linkPj } = req.body;

    try {
      const finalImage = await resolveImage(req, imagePj, "coddex/projects");

      if (!finalImage || !titlePj || !descriptionPj || !linkPj) {
        return res.status(400).render("warning", {
          title: "Campos incompletos",
          info: "Preencha todos os campos e envie (ou informe a URL de) uma imagem.",
          textButton: "Voltar",
          url: "/admin/dashboard/editPage/CreateProjects"
        });
      }

      const createProjectDB = new ProjectsDB({
        _id: UUID(),
        imagePj: finalImage,
        titlePj,
        descriptionPj,
        linkPj
      })
      await createProjectDB.save()
      res.redirect("/admin/dashboard/editPage/CreateProjects/allProjects")
    } catch (error) {
      res.status(500).render("warning", {
        title: "Aviso!", info: error.message, textButton: "Voltar",
        url: "/admin/dashboard/editPage/CreateProjects"
      })
    }
  },

  //GET /admin/dashboard/editPage/allProjects
  allProjects: async (req, res) => {
    const projects = await ProjectsDB.find()
    res.render("allProjects", { projects })
  },

  //DELETE /admin/dashboard/editPage/allProjects:id
  deleteProject: async (req, res) => {
    const { id } = req.params
    const removeProject = await ProjectsDB.findByIdAndDelete(id)

    if (!removeProject) {
      res.status(404).send("Certificado não encontrado!");
      return
    }
    res.status(201).redirect("/admin/dashboard/editPage/CreateProjects/allProjects");
  },

  editProject: async (req, res) => {
    const { id } = req.params;
    try {
      const projects = await ProjectsDB.find()
      const projectsID = await ProjectsDB.findOne({ _id: id })
      if (!projectsID) {
        res.send("Id do projeto não identificado!")
        return
      }
      res.render("editProject", { projectsID, projects })
    } catch (error) {
      res.send(error)
    }
  },

  //PUT /admin/dashboard/editPage/allProjects/:id/updated
  updateProject: async (req, res) => {
    const { updateImagePj, updateTitlePj, updateDescriptionPj, updateLinkPj } = req.body;
    const { id } = req.params;

    try {
      const projectsID = await ProjectsDB.findOne({ _id: id })

      if (!projectsID) {
        res.send("Id do projeto não identificado!")
        return
      }
      projectsID.imagePj = await resolveImage(req, updateImagePj, "coddex/projects");
      projectsID.titlePj = updateTitlePj;
      projectsID.descriptionPj = updateDescriptionPj;
      projectsID.linkPj = updateLinkPj;

      await projectsID.save();

      res.status(200).redirect("/admin/dashboard/editPage/CreateProjects/allProjects");

    } catch (error) {
      res.status(500).render("warning", {
        title: "Aviso!", info: error.message, textButton: "Voltar",
        url: "/admin/dashboard/editPage/CreateProjects/allProjects"
      })
    }
  },

  //GET /admin/dashboard/editPage/certificates
  formCertificates: async (req, res) => {
    const projects = await ProjectsDB.find();
    res.status(201).render('certificates', { projects })
  },

  certificatesView: async (req, res) => {
    const certificates = await CertificateDB.find();

    if (!certificates) {
      res.status(404).send("Projeto não encontrado!");
      return
    }
    res.status(201).render('my-certificates', { certificates, projects: 0 });
  },

  //GET /admin/dashboard/editPage/certificates/:id
  updateCertificate: async (req, res) => {
    const { id } = req.params
    const certificateID = await CertificateDB.findOne({ _id: id })
    const projects = await ProjectsDB.find();

    res.status(200).render('editCertificate', { certificate: certificateID, projects });
  },

  //GET /admin/dashboard/editPage/certificates/add-certificate/new
  addCertificate: async (req, res) => {
    const projects = await ProjectsDB.find();
    res.status(200).render("add-certificate", { projects });
  },

  createCertificate: async (req, res) => {
    const { image, title, url } = req.body;

    try {
      const finalImage = await resolveImage(req, image, "coddex/certificates");

      if (!finalImage || !title || !url) {
        return res.status(400).render("warning", {
          title: "Campos incompletos",
          info: "Envie (ou informe a URL de) uma imagem, o título e a URL do certificado.",
          textButton: "Voltar",
          url: "/admin/dashboard/editPage/my-certificates/add-certificate"
        });
      }

      const certificate = new CertificateDB({ _id: UUID(), image: finalImage, title, url });
      await certificate.save();
      res.redirect("/admin/dashboard/editPage/my-certificates")
    } catch (error) {
      res.status(500).render("warning", {
        title: "Aviso!", info: error.message, textButton: "Voltar",
        url: "/admin/dashboard/editPage/my-certificates/add-certificate"
      })
    }
  },

  //PUT /admin/dashboard/editPage/certificates/:id/updated
  editCertificate: async (req, res) => {
    const { id } = req.params;
    const { imageEDIT, titleEDIT, urlEDIT } = req.body;

    try {
      const certificateID = await CertificateDB.findOne({ _id: id })

      if (!certificateID) {
        return res.status(404).send("Certificado não encontrado!");
      }

      const finalImage = await resolveImage(req, imageEDIT, "coddex/certificates");
      if (!finalImage || !titleEDIT || !urlEDIT) {
        return res.status(400).render("warning", {
          title: "Campos incompletos",
          info: "Todos os campos precisam ser preenchidos.",
          textButton: "Voltar",
          url: `/admin/dashboard/editPage/my-certificates/${id}`
        });
      }

      certificateID.image = finalImage;
      certificateID.title = titleEDIT;
      certificateID.url = urlEDIT;
      await certificateID.save();

      res.status(200).redirect("/admin/dashboard/editPage/my-certificates");
    } catch (error) {
      res.status(500).render("warning", {
        title: "Aviso!", info: error.message, textButton: "Voltar",
        url: "/admin/dashboard/editPage/my-certificates"
      })
    }
  },

  //DELETE /admin/dashboard/editPage/my-certificates/:id
  deleteCertificate: async function (req, res) {
    try {
      const { id } = req.params; const removeCertificate = await CertificateDB.findByIdAndDelete(id);
      if (!removeCertificate) {
        res.status(404).send("Certificado não encontrado!");
        return;
      }
      res.status(201).redirect("/admin/dashboard/editPage/my-certificates");
    } catch (error) {
      res.render("warning", {
        title: "Aviso!",
        info: error,
        textButton: "Voltar",
        url: "/admin"
      });
      return;
    }

  }
}