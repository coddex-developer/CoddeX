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

  // Atualizar likes de comentários globalmente
  socket.on('project:comment:like:updated', (data) => {
    const likeCountEl = document.getElementById(`comment-like-count-${data.commentId}`);
    if (likeCountEl) {
      if (data.likeCount > 0) {
        likeCountEl.textContent = `${data.likeCount} curtida${data.likeCount === 1 ? '' : 's'}`;
        likeCountEl.style.display = 'inline';
      } else {
        likeCountEl.style.display = 'none';
      }
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
    const commentsContainer = document.querySelector('#commentsWrapper');
    if (commentsContainer && window.currentProjectId === data.projectId) {
      if (!data.comment.parent) { // é um comentário raiz
        const emptyState = document.querySelector('#emptyComments');
        if (emptyState) emptyState.remove();

        const c = data.comment;
        // Transforma mencoes em azul
        const bodyParsed = c.body.replace(/@([a-zA-Z0-9_]+)/g, '<span style="color: #3b82f6;">@$1</span>');
        
        const html = `
          <div class="comment-ig d-flex gap-3 mb-3" id="c-${c._id}">
            <div class="rounded-circle bg-gradient d-flex align-items-center justify-content-center text-white flex-shrink-0" style="width: 36px; height: 36px; font-weight: bold; font-size: 14px;">
              ${c.userName.charAt(0).toUpperCase()}
            </div>
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <span class="fw-bold text-white me-1" style="font-size: 0.9rem;">
                    ${c.userName}
                    ${c.isAuthor ? '<i class="bi bi-patch-check-fill text-primary ms-1" title="Autor"></i>' : ''}
                  </span>
                  <span class="text-white" style="font-size: 0.9rem; word-break: break-word;">
                    ${bodyParsed}
                  </span>
                </div>
                <!-- Like form injected dynamically or requires refresh for interaction, but we show the icon -->
                <i class="bi bi-heart text-muted" style="font-size: 0.85rem;"></i>
              </div>
              <div class="d-flex align-items-center gap-3 mt-1">
                <small class="text-muted" style="font-size: 0.75rem;">Agora</small>
              </div>
            </div>
          </div>
        `;
        commentsContainer.insertAdjacentHTML('beforeend', html);
        
        // Scroll the modal to bottom
        const modalBody = document.querySelector('#commentsContainerModal');
        if (modalBody) modalBody.scrollTop = modalBody.scrollHeight;
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
          const textInput = form.querySelector('input[type="text"]');
          if (textInput) textInput.value = '';
          const parentInput = form.querySelector('input[name="parent"]');
          if (parentInput) parentInput.value = '';
          const indicator = document.getElementById("replyingIndicator");
          if (indicator) indicator.style.setProperty('display', 'none', 'important');

          // Se for curtida e deu sucesso
          if (json.likeCount !== undefined && json.likedByMe !== undefined) {
             const icon = form.querySelector('i');
             if (icon) {
               if (json.isCommentLike) {
                 if (json.likedByMe) {
                   icon.className = 'bi bi-heart-fill text-danger';
                 } else {
                   icon.className = 'bi bi-heart text-muted';
                 }
               } else {
                 if (json.likedByMe) {
                   if (submitBtn && submitBtn.classList.contains('ig-btn')) {
                     icon.className = 'bi bi-heart-fill text-danger';
                   } else {
                     icon.className = 'bi bi-heart-fill me-1';
                     if (submitBtn) submitBtn.classList.add('liked');
                   }
                   if (submitBtn) {
                     const likeText = submitBtn.querySelector('.like-text');
                     if (likeText) likeText.textContent = 'Curtido';
                   }
                 } else {
                   if (submitBtn && submitBtn.classList.contains('ig-btn')) {
                     icon.className = 'bi bi-heart';
                   } else {
                     icon.className = 'bi bi-heart me-1';
                     if (submitBtn) submitBtn.classList.remove('liked');
                   }
                   if (submitBtn) {
                     const likeText = submitBtn.querySelector('.like-text');
                     if (likeText) likeText.textContent = 'Curtir';
                   }
                 }
               }
             }
             return; // Curtidas não precisam de alerta visual grande
          }

          if (json.redirect && json.message) {
            const sep = json.redirect.includes('?') ? '&' : '?';
            window.location.href = json.redirect + sep + 'toast=' + encodeURIComponent(json.message);
          } else if (json.message) {
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
