const UUID = require('uuid').v4;
const myCertificates = [
{
  id: "3333",
  title: "Certificado Js",
  url: ""
},
{
  id: "3334",
  title: "Certificado NodeJS",
  url: ""
},
{
  id: "3336",
  title: "Certificado Git",
  url: ""
}
];

module.exports = {
  containerCertificates: () => {
    return myCertificates;
  }
}