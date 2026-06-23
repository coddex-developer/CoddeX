document.addEventListener('DOMContentLoaded', () => {
  if (typeof io === 'undefined') return;
  const socket = io();

  // Entrar na sala do ticket, se houver o ID na URL
  const ticketMatch = window.location.pathname.match(/\/tickets\/([0-9a-fA-F]{24})/);
  if (ticketMatch) {
    const ticketId = ticketMatch[1];
    socket.emit('join_ticket', ticketId);
  }

  // Atualizar likes globalmente
  socket.on('project:like:updated', (data) => {
    // Para index.ejs e allProjects.ejs
    const likeCounts = document.querySelectorAll(`.like-count[data-project-id="${data.projectId}"]`);
    likeCounts.forEach(el => {
      el.textContent = `${data.likeCount} curtida${data.likeCount === 1 ? '' : 's'}`;
    });
    
    // Para projectDetail.ejs
    const detailBadge = document.querySelector(`.like-badge[data-project-id="${data.projectId}"]`);
    if (detailBadge) {
      detailBadge.textContent = data.likeCount;
    }
  });

  // Atualizar comentários globalmente
  socket.on('project:comment:added', (data) => {
    // Atualizar os contadores em index/allProjects
    const commentCounts = document.querySelectorAll(`.comment-count[data-project-id="${data.projectId}"]`);
    commentCounts.forEach(el => {
      el.textContent = data.commentCount;
    });

    const detailBadge = document.querySelector(`.comment-badge[data-project-id="${data.projectId}"]`);
    if (detailBadge) {
      detailBadge.textContent = data.commentCount;
    }

    // Se estiver na projectDetail.ejs do projeto correto, anexar o novo comentário
    const commentsContainer = document.querySelector('#commentsContainer');
    if (commentsContainer && window.currentProjectId === data.projectId) {
      if (!data.comment.parent) { // é um comentário raiz
        const emptyState = document.querySelector('#emptyComments');
        if (emptyState) emptyState.remove();

        const c = data.comment;
        const html = `
          <div class="comment mb-3" id="c-${c._id}">
            <div class="d-flex gap-2">
              <span class="comment-avatar ${c.isAuthor ? 'is-author' : ''}">${c.userName.charAt(0).toUpperCase()}</span>
              <div class="flex-grow-1 min-w-0">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <strong>${c.userName}</strong>
                  ${c.isAuthor ? '<span class="badge bg-primary"><i class="bi bi-patch-check-fill me-1"></i>Autor</span>' : ''}
                  <small class="text-muted-2">${new Date(c.createdAt).toLocaleDateString('pt-BR')}</small>
                </div>
                <div class="markdown-body comment-body"><p>${c.body}</p></div>
              </div>
            </div>
          </div>
        `;
        commentsContainer.insertAdjacentHTML('afterbegin', html);
      } else {
        // Lógica de adicionar resposta seria análoga, inserindo no bloco de replies
      }
    }
  });

  // Atualizar mensagens do ticket
  socket.on('ticket:message:added', (data) => {
    const chatContainer = document.querySelector('#chatContainer');
    if (chatContainer && ticketMatch && ticketMatch[1] === data.ticketId) {
      // Determina se a mensagem é "minha" ou "deles" (theirs)
      // O backend precisa mandar o tipo de sender ('admin' ou 'user')
      const isAdminView = window.location.pathname.startsWith('/admin');
      const mine = (isAdminView && data.message.senderType === 'admin') || (!isAdminView && data.message.senderType === 'user');
      
      const row = document.createElement('div');
      row.className = `chat-row ${mine ? 'mine' : 'theirs'}`;
      row.innerHTML = `
        <div class="chat-bubble">
          <div class="markdown-body"><p>${data.message.body}</p></div>
          <div class="chat-meta text-end mt-1">${new Date(data.message.createdAt).toLocaleString('pt-BR')}</div>
        </div>
      `;
      chatContainer.appendChild(row);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  // Interceptar formulários para usar AJAX/Fetch
  document.querySelectorAll('form.ajax-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const formData = new URLSearchParams(new FormData(form));
        const res = await fetch(form.action, {
          method: form.method,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: formData.toString()
        });
        
        let json = {};
        try { json = await res.json(); } catch(e) {}

        if (res.ok) {
          // Limpa o input se for comentário/ticket
          const textarea = form.querySelector('textarea');
          if (textarea) textarea.value = '';

          // Se for curtida e deu sucesso
          if (json.likeCount !== undefined && json.likedByMe !== undefined) {
             const icon = form.querySelector('i');
             if (icon) {
               if (json.likedByMe) {
                 icon.className = 'bi bi-heart-fill';
                 if (submitBtn) { submitBtn.classList.add('btn-gradient'); submitBtn.classList.remove('btn-outline-light'); }
               } else {
                 icon.className = 'bi bi-heart';
                 if (submitBtn) { submitBtn.classList.remove('btn-gradient'); submitBtn.classList.add('btn-outline-light'); }
               }
             }
             return; // Curtidas não precisam de alerta visual grande
          }

          if (json.message) {
            Swal.fire({
              icon: 'success',
              title: 'Sucesso!',
              text: json.message,
              background: 'var(--surface)',
              color: 'var(--text)',
              confirmButtonColor: 'var(--accent-1)'
            }).then(() => {
              if (json.redirect) window.location.href = json.redirect;
            });
          } else if (json.redirect) {
            window.location.href = json.redirect;
          }
        } else {
          // Tratar erros vindos do servidor (400, 500)
          Swal.fire({
            icon: 'error',
            title: 'Ops...',
            text: json.error || 'Ocorreu um erro ao processar a requisição.',
            background: 'var(--surface)',
            color: 'var(--text)',
            confirmButtonColor: 'var(--accent-1)'
          });
        }
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Erro de conexão',
          text: 'Verifique sua internet e tente novamente.',
          background: 'var(--surface)',
          color: 'var(--text)',
          confirmButtonColor: 'var(--accent-1)'
        });
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
});
