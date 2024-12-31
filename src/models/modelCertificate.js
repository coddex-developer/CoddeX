const UUID = require('uuid').v4;
const myCertificates = [];

module.exports = {
  containerCertificates: () => {
    return myCertificates;
  }
}