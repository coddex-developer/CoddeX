const UUID = require('uuid').v4;
const myCertificates = [
 {
   id: 32,
   image: "https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png",
   title: "Javascript",
   url: "https://drive.google.com/drive/folders/1qMSQAzXmOd1JCwYjUqsVo7op8y6n68Ij"
 } 
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