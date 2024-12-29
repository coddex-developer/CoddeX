const UUID = require('uuid').v4;
const myCertificates = [

];

module.exports = {
  
  createCertificate: (req, res) => {

  const { image, title, url } = req.body;

    const certificate = {
      id: UUID(),
      image,
      title,
      url
    }

    myCertificates.push(certificate)
  },
  
  containerCertificates: () => {
    return myCertificates;
  }
}