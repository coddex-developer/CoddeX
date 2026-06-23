const fs = require('fs');
const files = ['login', 'register', 'forgot', 'reset', 'verify', 'admin', 'adminProfile', 'editPage', 'CreateProjects', 'add-certificate', 'blogForm', 'editProject', 'editCertificate', 'account'];
files.forEach(f => {
  const p = './src/views/' + f + '.ejs';
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/<form([^>]+)>/g, (match, attrs) => {
      if (attrs.includes('ajax-form')) return match;
      if (attrs.includes('class="')) {
        return `<form${attrs.replace('class="', 'class="ajax-form ')}>`;
      }
      return `<form class="ajax-form"${attrs}>`;
    });
    fs.writeFileSync(p, c);
    console.log(f + ' updated');
  }
});
