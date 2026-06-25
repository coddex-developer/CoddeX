const express = require('express');
const controlerPage = require('./controllers/controlerPage');
const midlewareLogin = require('./middlewares/midlewareLogin');
const controllerSms = require('./controllers/controllerSms');
const uploadLogo = require("./middlewares/middlewareUpLogo.js");
const imageUpload = require("./middlewares/middlewareImage.js");
const controllerTicket = require("./controllers/controllerTicket");
const controllerUserAdmin = require("./controllers/controllerUserAdmin");

const router = express.Router();

router.get('/', controlerPage.index);
router.get('/admin', controlerPage.admin);


router.post('/auth/access', controlerPage.account);
router.get('/admin/dashboard', midlewareLogin, controlerPage.dashboard);
router.get('/admin/dashboard/logout', midlewareLogin, controlerPage.logout);

//AdminProfile
router.get('/admin/dashboard/adminProfile', midlewareLogin, controlerPage.myProfile);
//Alteracao aqui removido as credenciais admin da atualizacao de logo
router.post('/admin/dashboard/adminProfile', midlewareLogin, uploadLogo.single("logo"), (req, res) => {
  res.json({ success: true, message: 'Logo atualizada com sucesso!' });
});
router.post('/admin/dashboard/profile/logo/remove', midlewareLogin, controlerPage.removeLogo);
router.post('/admin/dashboard/profile/password', midlewareLogin, controlerPage.saveAdminPassword);
router.post('/admin/dashboard/profile/social', midlewareLogin, controlerPage.saveSocial);
router.post('/admin/dashboard/profile/mail', midlewareLogin, controlerPage.saveMail);
router.post('/admin/dashboard/profile/mail/test', midlewareLogin, controlerPage.testMail);
router.post('/admin/dashboard/profile/cloudinary', midlewareLogin, controlerPage.saveCloudinary);

//SmS
router.get('/admin/dashboard/unread/', midlewareLogin, controlerPage.unreadMessages);
router.get('/admin/dashboard/messages/', midlewareLogin, controlerPage.showMessage);
router.get('/admin/dashboard/messages/:id', midlewareLogin, controlerPage.viewMessage);
router.post('/admin/dashboard/messages/:id/delete', midlewareLogin, controlerPage.deletessage);
router.post('/admin/dashboard/messages/:id/complete', midlewareLogin, controlerPage.completedMessage);
router.post('/admin/dashboard/messages/:id/incomplete', midlewareLogin, controlerPage.incompletedMessage);

router.post('/sms/env', controllerSms.submitMessage);

const fileUpload = require("./middlewares/middlewareFile");

// Tickets (conversas) — admin
router.get('/admin/dashboard/tickets', midlewareLogin, controllerTicket.adminList);
router.post('/admin/dashboard/tickets/delete', midlewareLogin, controllerTicket.adminDeleteTickets);
router.get('/admin/dashboard/tickets/:id', midlewareLogin, controllerTicket.adminThread);
router.post('/admin/dashboard/tickets/:id/reply', midlewareLogin, fileUpload.array('attachments', 10), controllerTicket.adminReply);
router.post('/admin/dashboard/tickets/:id/state', midlewareLogin, controllerTicket.updateState);

// Gerenciamento de Usuários (Acesso Root)
router.get('/admin/dashboard/users', midlewareLogin, controllerUserAdmin.adminList);
router.post('/admin/dashboard/users/:id/delete', midlewareLogin, controllerUserAdmin.adminDelete);
router.post('/admin/dashboard/users/:id/block', midlewareLogin, controllerUserAdmin.toggleBlock);
router.post('/admin/dashboard/users/:id/password', midlewareLogin, controllerUserAdmin.updatePassword);
router.get('/admin/dashboard/users/:id/interactions', midlewareLogin, controllerUserAdmin.getInteractions);

//editPage
router.get('/admin/dashboard/editPage', midlewareLogin, controlerPage.editPage);
router.post('/admin/dashboard/editPage/save', midlewareLogin, controlerPage.saveEditPage);

//CreateProject
router.get("/admin/dashboard/editPage/CreateProjects", midlewareLogin, controlerPage.createProject);
router.post("/admin/dashboard/editPage", midlewareLogin, imageUpload.single("imageFile"), controlerPage.saveProject);

router.get("/admin/dashboard/editPage/CreateProjects/allProjects", midlewareLogin, controlerPage.allProjects);

//GET Editar Projeto
router.get("/admin/dashboard/editPage/CreateProjects/allProjects/:id", midlewareLogin, controlerPage.editProject);

//PUT Editar Projeto
// Rota para atualizar o projeto
router.post('/admin/dashboard/editPage/allProjects/:id/updated', midlewareLogin, imageUpload.single("imageFile"), controlerPage.updateProject);

//Excluir Projeto
router.post("/admin/dashboard/editPage/CreateProjects/allProjects/:id", midlewareLogin, controlerPage.deleteProject);

//GET /admin/dashboard/editPage/my-certificates
router.get("/admin/dashboard/editPage/my-certificates", midlewareLogin, controlerPage.certificatesView);

//GET /admin/dashboard/editPage/my-certificates/add-certificate
router.get("/admin/dashboard/editPage/my-certificates/add-certificate", midlewareLogin, controlerPage.addCertificate);

router.post("/admin/dashboard/editPage/certificates/add-certificate/new", midlewareLogin, imageUpload.single("imageFile"), controlerPage.createCertificate);

//GET /admin/dashboard/editPage/my-certificates/:id
router.get("/admin/dashboard/editPage/my-certificates/:id", midlewareLogin, controlerPage.updateCertificate)

//PUT /admin/dashboard/editPage/my-certificates/:id/updated
router.post("/admin/dashboard/editPage/my-certificates/editCertificate/:id/update", midlewareLogin, imageUpload.single("imageFile"), controlerPage.editCertificate)

//DELETE certificates
router.post("/admin/dashboard/editPage/my-certificates/:id", midlewareLogin, controlerPage.deleteCertificate);

module.exports = router;

