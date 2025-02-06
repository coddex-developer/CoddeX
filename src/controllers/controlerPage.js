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
    res.render('index', { contentIndex, projects: contentIndex.projects, certificates });
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

    res.render('dashboard', { adminUser: req.session.currentUser, resultMessage, unreadMessage, projects: contentIndex.projects });
  },

  logout: (req, res) => {
    req.session.destroy();
    res.redirect('/admin');
  },

  unreadMessages: async (req, res) => {
    const resultMessage = await MessageDB.find({ completed: false });

    if (resultMessage.length <= 0) {
      return res.render("alertNotMessages", { projects: contentIndex.projects })
    }

    res.render("unread", { resultMessage, projects: contentIndex.projects })
  },

  //GET admin/dashboard/messages
  showMessage: async (req, res) => {
    const resultMessage = await MessageDB.find();
    if (resultMessage.length === 0) {
      return res.render("alertNotMessages", { projects: contentIndex.projects })
    }
    res.render("messages", { notes: await resultMessage, projects: contentIndex.projects })
  },

  //GET admin/dashboard/messages/:id
  viewMessage: async (req, res) => {
    const { id } = req.params;
    const resultMessage = await MessageDB.findOne({ _id: id });

    if (!resultMessage) {
      return res.send("Nada de novo por aqui!")
    }

    res.render("cardMessage", { resultMessage, projects: contentIndex.projects })

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
      console.log(resultMessage.completed)
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
  myProfile: (req, res) => {
    res.render("adminProfile", { adminUser: req.session.currentUser, projects: contentIndex.projects })
  },

  //POST /admin/dashboard/adminProfile
  editProfile: (req, res) => {
    const { username, password, contact } = req.body;


    if (!username || !password || username.length < 2 || password < 2) {
      res.status(400).send("Todos os campos são obrigatórios!");
      return
    }

    if (password === "1234") {
      res.status(400).send("Digite uma senha mais forte!");
      return
    }

    const adminIndex = userAdmin.findIndex(dados => dados.username === username);

    if (adminIndex === -1) {
      return res.status(404).send("Dados de Admin não encontrado!")
    }

    const contactNumber = parseFloat(contact)

    if (isNaN(contactNumber)) {
      res.status(400).send("O contato precisa ser do tipo numero!")
    }

    userAdmin[adminIndex].username = username
    userAdmin[adminIndex].password = password
    userAdmin[adminIndex].contact = contactNumber
    req.session.destroy()
    res.status(200).redirect("/admin")
  },

  //GET /admin/dashboard/editPage
  editPage: (req, res) => {
    res.render("editPage", { contentIndex, projects: contentIndex.projects })
  },

  //POST /admin/dashboard/editPage/save
  saveEditPage: (req, res) => {
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

    const createProjectDB = new ProjectsDB({
      id: UUID(),
      imagePj,
      titlePj,
      descriptionPj,
      linkPj
    })

    await createProjectDB.save();

    res.redirect("/admin/dashboard/editPage/CreateProjects");
  },

  //GET /admin/dashboard/editPage/allProjects
  allProjects: async (req, res) => {
    const projects = await ProjectsDB.find()
    res.render("allProjects", { projects })
  },

  //GET /admin/dashboard/editPage/allProjects:id

  editProject: (req, res) => {
    const { updateImagePj, updateTitlePj, updateDescriptionPj, updateLinkPj } = req.body;
    
    const { id } = req.params;
    const projects = await ProjectsDB.findOne({ _id: id })

    if(!projects) {
      res.send("Id do projeto não identificado!")
      return
    }
    
    projects.imagePj = updateLinkPj;
    projects.titlePj = updateTitlePj;
    projects.descriptionPj = updateDescriptionPj;
    projects.linkPj = updateLinkPj;
    
    await projects.save()

    res.status(200).render("editProject", { projects });

  },

  //DELETE /admin/dashboard/editPage/allProjects:id
  deleteProject: (req, res) => {
    const { id } = req.params;

    const pjID = contentIndex.projects.findIndex(pj => pj.id == id)

    if (pjID === -1) {
      res.status(404).send("Projeto não encontrado!");
      return
    }

    contentIndex.projects.splice(pjID, 1)

    res.status(201).redirect("/admin/dashboard/editPage/CreateProjects/allProjects");
  },

  //GET /admin/dashboard/editPage/allProjects:id/updated

  updateProject: (req, res) => {
    const { id } = req.params; // Obter o ID do projeto a ser atualizado
    const { updateImagePj, updateTitlePj, updateDescriptionPj, updateLinkPj } = req.body;

    // Encontrar o índice do projeto pelo ID
    const pjID = contentIndex.projects.findIndex(pj => pj.id == id);

    // Validar se o projeto existe
    if (pjID === -1) {
      return res.status(404).send("Projeto não encontrado!");
    }

    // Validar os campos recebidos
    if (!updateImagePj || !updateTitlePj || !updateDescriptionPj || !updateLinkPj) {
      return res.status(400).send("Todos os campos precisam ser preenchidos!");
    }

    // Atualizar os dados do projeto
    contentIndex.projects[pjID].imagePj = updateImagePj;
    contentIndex.projects[pjID].titlePj = updateTitlePj;
    contentIndex.projects[pjID].descriptionPj = updateDescriptionPj;
    contentIndex.projects[pjID].linkPj = updateLinkPj;

    // Redirecionar ou renderizar uma página de confirmação
    res.status(200).redirect("/admin/dashboard/editPage/CreateProjects/allProjects");
  },

  //GET /admin/dashboard/editPage/certificates
  formCertificates: async (req, res) => {
    res.status(201).render('certificates', { projects: contentIndex.projects })
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


    res.status(200).render('editCertificate', { certificate: certificateID, projects: contentIndex.projects });
  },

  //GET /admin/dashboard/editPage/certificates/add-certificate/new
  addCertificate: (req, res) => {
    res.status(200).render("add-certificate", { projects: contentIndex.projects });
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
    console.log(certificate)
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

    console.log(removeCertificate)

    if (!removeCertificate) {
      res.status(404).send("Certificado não encontrado!");
      return
    }

    res.status(201).redirect("/admin/dashboard/editPage/my-certificates");
  }
}