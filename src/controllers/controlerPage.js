require("dotenv").config();
const UUID = require('uuid').v4;
const contentIndex = require('../models/contentPageIndelModel');
const MessageDB = require("../db/messageDB");
const ProjectsDB = require("../db/projectsDB");
const CertificateDB = require("../db/certificatesDB");
const Admin = require("../db/adminDB.js");

module.exports = {

  //GET /
  index: async (req, res) => {
    const certificates = await CertificateDB.find();
    const projects = await ProjectsDB.find();
    res.render('index', { contentIndex, projects, certificates });
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

      if (!admin) {
        return { message: "Admin não encontrado!" }
      }

      if (passAdmin !== process.env.ADMIN_PASS) {
        res.redirect("alertUserIncorrect");
        return
      }

      req.session.authenticated = true;
      req.session.currentUser = admin;
      res.status(200).redirect('/admin/dashboard');
    } catch (error) {

    }
  },

  //GET /admin/dashboard/
  dashboard: async (req, res) => {
    const resultMessage = await MessageDB.find();
    const unreadMessage = await MessageDB.find({ completed: false });
    const projects = await ProjectsDB.find();

    res.render('dashboard', { adminUser: req.session.currentUser, resultMessage, unreadMessage, projects });
  },

  //POST DESTROY SESSION
  logout: (req, res) => {
    req.session.destroy();
    res.redirect('/admin');
  },
  //GET
  unreadMessages: async (req, res) => {
    const resultMessage = await MessageDB.find({ completed: false });
    const projects = await ProjectsDB.find()

    if (resultMessage.length <= 0) {
      return res.render("alertNotMessages", { projects })
    }

    res.render("unread", { resultMessage, projects })
  },

  //GET admin/dashboard/messages
  showMessage: async (req, res) => {
    const resultMessage = await MessageDB.find();
    const projects = await ProjectsDB.find()
    if (resultMessage.length === 0) {
      return res.render("alertNotMessages", { projects })
    }
    res.render("messages", { notes: await resultMessage, projects })
  },

  //GET admin/dashboard/messages/:id
  viewMessage: async (req, res) => {
    const { id } = req.params;
    const resultMessage = await MessageDB.findOne({ _id: id });
    const projects = await ProjectsDB.find()

    if (!resultMessage) {
      return res.send("Nada de novo por aqui!")
    }

    res.render("cardMessage", { resultMessage, projects })

  },

  //DELETE admin/dashboard/messages/:id/delete
  deletessage: async (req, res) => {
    const { id } = req.params
    const resultMessage = await MessageDB.findByIdAndDelete(id);
    if (!resultMessage) {
      return res.render("/error")
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
    res.render("adminProfile", { adminUser: req.session.currentUser, projects })
  },

  //POST /admin/dashboard/adminProfile
  editProfile: async (req, res) => {
    const { username, password, contact } = req.body;

    if (!username || !password || username.length < 2 || password < 2) {
      res.status(400).send("Todos os campos são obrigatórios!");
      return
    }

    if (password === "1234") {
      res.status(400).send("Digite uma senha mais forte!");
      return
    }
    
    process.env.ADMIN_USER = username
    process.env.ADMIN_PASS = password
    process.env.ADMIN_PHONE = contact
    req.session.destroy()
    
    res.status(200).redirect("/admin")
  },

  //GET /admin/dashboard/editPage
  editPage: async (req, res) => {
    const projects = await ProjectsDB.find();
    res.render("editPage", { contentIndex, projects })
  },

  //POST /admin/dashboard/editPage/save
  saveEditPage: async (req, res) => {
    const { titleForm, subtitleForm, titleAboutMeForm, textAboutMeForm } = req.body;

    if (!titleForm || !subtitleForm || !titleAboutMeForm || !textAboutMeForm) {
      return res.status(400).send("Todos os campos precisam ser preenchidos corretamente!");
    }

    // Atualizar o conteúdo
    contentIndex.title = titleForm;
    contentIndex.subtitle = subtitleForm;
    contentIndex.titleAboutMe = titleAboutMeForm;
    contentIndex.textAboutMe = textAboutMeForm;

    res.status(201).render("alertSaveSuccess");
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

    if (!imagePj || !titlePj || !descriptionPj || !linkPj) {
      res.send("Preencha todos os campos corretamente!")
      return
    }

    try {
      const createProjectDB = new ProjectsDB({
        _id: UUID(),
        imagePj,
        titlePj,
        descriptionPj,
        linkPj
      })
      await createProjectDB.save()
      res.redirect("/admin/dashboard/editPage/CreateProjects/allProjects")
    } catch (error) {
      res.send("Um erro ocorreu: " + error)
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
      projectsID.imagePj = updateLinkPj;
      projectsID.titlePj = updateTitlePj;
      projectsID.descriptionPj = updateDescriptionPj;
      projectsID.linkPj = updateLinkPj;

      await projectsID.save();

      res.status(200).redirect("/admin/dashboard/editPage/CreateProjects/allProjects");

    } catch (error) {
      res.send("Um erro ocorreu: " + error)
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

    const certificate = new CertificateDB({
      _id: UUID(),
      image,
      title,
      url
    });

    await certificate.save();
    res.redirect("/admin/dashboard/editPage/my-certificates")
  },

  //PUT /admin/dashboard/editPage/certificates/:id/updated
  editCertificate: async (req, res) => {
    const { id } = req.params;
    const { imageEDIT, titleEDIT, urlEDIT } = req.body;
    const certificateID = await CertificateDB.findOne({ _id: id })

    if (!certificateID) {
      return res.status(404).send("Projeto não encontrado!");
    }
    if (!imageEDIT || !titleEDIT || !urlEDIT) {
      return res.status(400).send("Todos os campos precisam ser preenchidos!");
    }

    certificateID.image = imageEDIT;
    certificateID.title = titleEDIT;
    certificateID.url = urlEDIT;

    await certificateID.save();

    res.status(200).redirect("/admin/dashboard/editPage/my-certificates");
  },

  //DELETE /admin/dashboard/editPage/my-certificates/:id
  deleteCertificate: async (req, res) => {
    const { id } = req.params;
    const removeCertificate = await CertificateDB.findByIdAndDelete(id);
    if (!removeCertificate) {
      res.status(404).send("Certificado não encontrado!");
      return
    }
    res.status(201).redirect("/admin/dashboard/editPage/my-certificates");
  }
}