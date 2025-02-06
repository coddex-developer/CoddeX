const UUID = require('uuid').v4;
const myCertificates = [];
console.log(myCertificates)

module.exports = {
  containerCertificates: () => {
    return myCertificates;
  }
}