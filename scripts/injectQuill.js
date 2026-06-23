const fs = require('fs');

function injectQuill(file, textAreaName, labelText) {
  const path = './src/views/' + file + '.ejs';
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  if (!content.includes('quill.snow.css')) {
    content = '<link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">\n<script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>\n' + content;
  }

  // Find the textarea block and replace it
  const regex = new RegExp('<div class="mb-3">\\s*<label[^>]*>(.*?)<\/label>\\s*<textarea[^>]*name="' + textAreaName + '"[^>]*>([\\s\\S]*?)<\/textarea>\\s*<\/div>');
  content = content.replace(regex, (match, p1, p2) => {
    return `
    <div class="mb-3">
      <label class="form-label">${labelText || p1}</label>
      <div id="editor-container-${textAreaName}" class="bg-surface text-text" style="height: 200px; border-radius: 0 0 8px 8px;">${p2}</div>
      <textarea id="${textAreaName}" name="${textAreaName}" style="display:none;"></textarea>
    </div>
    `;
  });

  // Inject Quill JS setup at the end before footer or closing tag
  const scriptBlock = `
<style>
  .ql-toolbar { background: var(--surface-2); border-color: var(--border) !important; border-radius: 8px 8px 0 0; }
  .ql-container { border-color: var(--border) !important; font-family: 'Roboto', sans-serif; font-size: 1rem; }
  .ql-editor { color: var(--text); }
  .ql-snow .ql-stroke { stroke: var(--text); }
  .ql-snow .ql-fill { fill: var(--text); }
  .ql-snow .ql-picker { color: var(--text); }
</style>
<script>
  var quill${textAreaName} = new Quill('#editor-container-${textAreaName}', {
    theme: 'snow',
    placeholder: 'Escreva aqui...',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'clean']
      ]
    }
  });

  document.querySelector('.ajax-form').addEventListener('submit', function() {
    document.getElementById('${textAreaName}').value = quill${textAreaName}.root.innerHTML;
  });
</script>
`;
  if (!content.includes('quill' + textAreaName)) {
    content = content.replace(/<%- include\('fragments\/footer'\) %>/g, scriptBlock + '\n<%- include(\'fragments/footer\') %>');
  }

  fs.writeFileSync(path, content);
  console.log(file + ' updated');
}

injectQuill('CreateProjects', 'descriptionPj');
injectQuill('editProject', 'updateDescriptionPj');
injectQuill('editPage', 'textAboutMeForm', 'Texto "Sobre Mim" (markdown)');
