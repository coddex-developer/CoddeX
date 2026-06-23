const express = require('express');
const multer = require("multer");
const controlerPage = require('./controllers/controlerPage');
const midlewareLogin = require('./middlewares/midlewareLogin');
const controllerSms = require('./controllers/controllerSms');
const uploadLogo = require("./middlewares/middlewareUpLogo.js");

const router = express.Router();

router.get('/', controlerPage.index);
router.get('/admin', controlerPage.admin);

router.post('/auth/access', controlerPage.account);
router.get('/admin/dashboard', midlewareLogin, controlerPage.dashboard);
router.get('/admin/dashboard/logout', midlewareLogin, controlerPage.logout);

//AdminProfile
router.get('/admin/dashboard/adminProfile', midlewareLogin, controlerPage.myProfile);
router.post('/admin/dashboard/adminProfile', midlewareLogin, uploadLogo.single("logo"), controlerPage.editProfile);

//SmS
router.get('/admin/dashboard/unread/', midlewareLogin, controlerPage.unreadMessages);
router.get('/admin/dashboard/messages/', midlewareLogin, controlerPage.showMessage);
router.get('/admin/dashboard/messages/:id', midlewareLogin, controlerPage.viewMessage);
router.post('/admin/dashboard/messages/:id/delete', midlewareLogin, controlerPage.deletessage);
router.post('/admin/dashboard/messages/:id/complete', midlewareLogin, controlerPage.completedMessage);
router.post('/admin/dashboard/messages/:id/incomplete', midlewareLogin, controlerPage.incompletedMessage);

router.post('/sms/env', controllerSms.submitMessage);

//editPage
router.get('/admin/dashboard/editPage', midlewareLogin, controlerPage.editPage);
router.post('/admin/dashboard/editPage/save', midlewareLogin, controlerPage.saveEditPage);

//CreateProject
router.get("/admin/dashboard/editPage/CreateProjects", midlewareLogin, controlerPage.createProject);
router.post("/admin/dashboard/editPage", midlewareLogin, controlerPage.saveProject);

router.get("/admin/dashboard/editPage/CreateProjects/allProjects", midlewareLogin, controlerPage.allProjects);

//GET Editar Projeto
router.get("/admin/dashboard/editPage/CreateProjects/allProjects/:id", midlewareLogin, controlerPage.editProject);

//PUT Editar Projeto
// Rota para atualizar o projeto
router.post('/admin/dashboard/editPage/allProjects/:id/updated', midlewareLogin, controlerPage.updateProject);

//Excluir Projeto
router.post("/admin/dashboard/editPage/CreateProjects/allProjects/:id", midlewareLogin, controlerPage.deleteProject);

//GET /admin/dashboard/editPage/my-certificates
router.get("/admin/dashboard/editPage/my-certificates", midlewareLogin, controlerPage.certificatesView);

//GET /admin/dashboard/editPage/my-certificates/add-certificate
router.get("/admin/dashboard/editPage/my-certificates/add-certificate", midlewareLogin, controlerPage.addCertificate);

router.post("/admin/dashboard/editPage/certificates/add-certificate/new", midlewareLogin, controlerPage.createCertificate);

//GET /admin/dashboard/editPage/my-certificates/:id
router.get("/admin/dashboard/editPage/my-certificates/:id", midlewareLogin, controlerPage.updateCertificate)

//PUT /admin/dashboard/editPage/my-certificates/:id/updated
router.post("/admin/dashboard/editPage/my-certificates/editCertificate/:id/update", midlewareLogin, controlerPage.editCertificate)

//DELETE certificates
router.post("/admin/dashboard/editPage/my-certificates/:id", midlewareLogin, controlerPage.deleteCertificate);

module.exports = router;

