const UUID = require('uuid').v4;
const controllerSms = require('../controllers/controllerSms');
const userAdmin = require('../models/adminModel');
const contentIndex = require('../models/contentPageIndelModel');
const messengers = controllerSms.getMessages()
const certificateGenerate = require('../models/modelCertificate.js');

const myCertificates = certificateGenerate.containerCertificates()

module.exports = {

  //GET /
  index: (req, res) => {
    res.render('index', { contentIndex, projects: contentIndex.projects, certificates: myCertificates });
  },

  //GET /admin
  admin: (req, res) => {
    res.render('admin');
  },

  //POST /admin
  account: (req, res) => {
    const { usuario, senha } = req.body;
    const checkUser = userAdmin.find(user => user.username === usuario && user.password === senha);

    if (!checkUser) {
      return res.status(404).render('alertUserIncorrect')
    }
    req.session.authenticated = true;
    req.session.currentUser = checkUser;
    res.status(200).redirect('/admin/dashboard');
  },

  //GET /admin/dashboard/
  dashboard: (req, res) => {

    const newMessages = messengers.filter(el => el.completed === false)

    res.render('dashboard', { adminUser: req.session.currentUser, notes: messengers, msn: newMessages, projects: contentIndex.projects });
  },

  logout: (req, res) => {
    req.session.destroy();
    res.redirect('/admin');
  },

  unreadMessages: (req, res) => {

    const newMessages = messengers.filter(el => el.completed === false)

    if (newMessages.length <= 0) {
      return res.render("alertNotMessages", { projects: contentIndex.projects })
    }

    res.render("unread", { newMessages, projects: contentIndex.projects })
  },

  //GET admin/dashboard/messages
  showMessage: (req, res) => {
    if (messengers.length === 0) {
      return res.render("alertNotMessages", { projects: contentIndex.projects })
    }
    res.render("messages", { notes: messengers, projects: contentIndex.projects })
  },

  //GET admin/dashboard/messages/:id
  viewMessage: (req, res) => {
    const id = req.params.id

    const checkIndexId = messengers.findIndex(msg => msg.id == id);

    if (checkIndexId === -1) {
      return res.send("Nada de novo por aqui!")
    }

    res.render("cardMessage", { notes: messengers[checkIndexId], projects: contentIndex.projects })

  },

  //DELETE admin/dashboard/messages/:id/delete
  deletessage: (req, res) => {
    const id = req.params.id

    const checkIndexId = messengers.findIndex(msg => msg.id == id);

    if (checkIndexId === -1) {
      return res.render("/error")
    }

    messengers.splice(checkIndexId, 1)

    res.redirect("/admin/dashboard/messages")

  },

  completedMessage: (req, res) => {
    const id = req.params.id
    const checkMsg = messengers.find(msg => msg.id == id);
    checkMsg.completed = true
    res.redirect(`/admin/dashboard/messages/${id}`)
  },

  incompletedMessage: (req, res) => {
    const id = req.params.id
    const checkMsg = messengers.find(msg => msg.id == id);
    checkMsg.completed = false
    res.redirect(`/admin/dashboard/messages/${id}`)
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

  createProject: (req, res) => {
    res.status(200).render("CreateProjects", { projects: contentIndex.projects })
  },

  saveProject: (req, res) => {
    const { imagePj, titlePj, descriptionPj, linkPj } = req.body;

    const generateProgent = {
      id: UUID(),
      imagePj,
      titlePj,
      descriptionPj,
      linkPj
    }

    contentIndex.projects.push(generateProgent)
    res.redirect("/admin/dashboard/editPage/CreateProjects");
  },

  //GET /admin/dashboard/editPage/allProjects
  allProjects: (req, res) => {
    res.render("allProjects", { projects: contentIndex.projects })
  },

  //GET /admin/dashboard/editPage/allProjects:id

  editProject: (req, res) => {
    const { id } = req.params;

    const pjID = contentIndex.projects.findIndex(pj => pj.id == id);

    if (pjID === -1) {
      res.status(404).send("Projeto não encontrado!");
      return
    }

    res.status(200).render("editProject", { project: contentIndex.projects[pjID], projects: contentIndex.projects });

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
  formCertificates: (req, res) => {
    res.status(201).render('certificates', { projects: contentIndex.projects })
  },

  certificatesView: (req, res) => {
    res.status(201).render('my-certificates', { myCertificates, projects: contentIndex.projects });
  },

  //GET /admin/dashboard/editPage/certificates/:id
  updateCertificate: (req, res) => {

    const { id } = req.params

    const certificateID = myCertificates.findIndex(pj => pj.id == id);


    res.status(200).render('editCertificate', { certificate: myCertificates[certificateID], projects: contentIndex.projects });
  },

  //GET /admin/dashboard/editPage/certificates/add-certificate/new
  addCertificate: (req, res) => {
    res.status(200).render("add-certificate", { projects: contentIndex.projects });
  },

  createCertificate: (req, res) => {

    const { image, title, url } = req.body;

    const certificate = {
      id: UUID(),
      image,
      title,
      url
    }
      
    myCertificates.push(certificate)
    res.redirect("/admin/dashboard/editPage/my-certificates")
  },

  //PUT /admin/dashboard/editPage/certificates/:id/updated
  editCertificate: (req, res) => {

    const { id } = req.params; // Obter o ID do projeto a ser atualizado
    const { imageEDIT, titleEDIT, urlEDIT } = req.body;

    // Encontrar o índice do projeto pelo ID
    const certificateID = myCertificates.findIndex(pj => pj.id == id);

    // Validar se o projeto existe
    if (certificateID === -1) {
      return res.status(404).send("Projeto não encontrado!");
    }

    // Validar os campos recebidos
    if (!imageEDIT || !titleEDIT || !urlEDIT) {
      return res.status(400).send("Todos os campos precisam ser preenchidos!");
    }

    // Atualizar os dados do projeto

    myCertificates[certificateID].image = imageEDIT;
    myCertificates[certificateID].title = titleEDIT;
    myCertificates[certificateID].url = urlEDIT;

    console.log(myCertificates)

    // Redirecionar ou renderizar uma página de confirmação
    res.status(200).redirect("/admin/dashboard/editPage/my-certificates");
  },

  //DELETE /admin/dashboard/editPage/my-certificates/:id
  deleteCertificate: (req, res) => {
    const { id } = req.params;

    const certificateID = myCertificates.findIndex(cf => cf.id == id)

    if (certificateID === -1) {
      res.status(404).send("Certificado não encontrado!");
      return
    }

    myCertificates.splice(certificateID, 1)

    res.status(201).redirect("/admin/dashboard/editPage/my-certificates");
  }
}