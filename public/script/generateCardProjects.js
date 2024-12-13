let projectCount = 0;

document.getElementById('add-project-button').addEventListener('click', () => {

  if(projectCount > 2) {
    window.navigator.vibrate(300);
    alert("Chegamos ao limite de projetos!")
    return
  }

  projectCount++;

  const projectsContainer = document.getElementById('projects-container');

  // Criando um novo bloco de campos do formulário
  const newProject = document.createElement('div');
  newProject.classList.add('project-fields', 'card', 'mb-4', 'p-3');
  newProject.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">${projectCount}° Projeto</h5>
        <button 
          type="button" 
          class="btn btn-danger btn-sm" 
          title="Excluir este projeto" 
          onclick="deleteProject(this)"
        >
          <i class="bi bi-trash-fill"></i>
        </button>
      </div>
      <hr>
      <div class="mb-3">
        <label for="image" class="form-label">Selecione uma Imagem</label>
        <input 
          type="text" 
          class="form-control" 
          name="imagePj" 
          required
        >
      </div>

      <div class="mb-3">
        <label for="title" class="form-label">Título do Projeto</label>
        <input 
          type="text" 
          class="form-control" 
          name="titlePj" 
          placeholder="Digite o título do projeto" 
          required
        >
      </div>

      <div class="mb-3">
        <label for="description" class="form-label">Descrição</label>
        <textarea 
          class="form-control" 
          name="descriptionPj" 
          rows="6" 
          placeholder="Digite uma descrição breve do projeto" 
          required
        ></textarea>
      </div>

      <div class="mb-3">
        <label for="link" class="form-label">Link do Projeto</label>
        <input 
          type="url" 
          class="form-control" 
          name="linkPj" 
          placeholder="Digite o link do repositório ou url" 
          required
        >
      </div>
    `;

  // Adicionando o novo bloco ao contêiner
  projectsContainer.appendChild(newProject);

  // Reordenar os números dos projetos
  reorderProjects();
});

// Função para excluir o card de um projeto
window.deleteProject = button => {
  const projectCard = button.closest('.project-fields');
  projectCard.remove();

  // Reordenar os números dos projetos após a exclusão
  reorderProjects();
};

// Função para reordenar os números dos projetos
function reorderProjects() {
  const projects = document.querySelectorAll('.project-fields');
  projectCount = projects.length; // Atualiza a contagem total de projetos

  projects.forEach((project, index) => {
    const title = project.querySelector('.card-title');
    title.textContent = `${index + 1}° Projeto`; // Redefine os números
  });
}