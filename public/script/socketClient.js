document.addEventListener('DOMContentLoaded', () => {
  if (typeof io === 'undefined') return;
  const socket = io();

  // Entrar na sala do ticket, se houver o ID na URL
  const ticketMatch = window.location.pathname.match(/\/tickets\/([0-9a-fA-F]{24})/);
  if (ticketMatch) {
    const ticketId = ticketMatch[1];
    const isAdminView = window.location.pathname.startsWith('/admin');
    if (isAdminView) {
      socket.emit('join_ticket_admin', ticketId);
    } else {
      socket.emit('join_ticket', ticketId);
    }
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
                <div class="d-flex flex-column align-items-center ms-3">
                  <i class="bi bi-heart text-muted" style="font-size: 0.85rem;"></i>
                  <small id="comment-like-count-${c._id}" class="text-muted fw-bold mt-1" style="font-size: 0.65rem; display: none;">0</small>
                </div>
              </div>
              <div class="d-flex align-items-center gap-3 mt-1">
                <small class="text-muted" style="font-size: 0.75rem;">Agora</small>
                <button type="button" class="btn p-0 border-0 bg-transparent text-muted fw-bold c-reply-toggle" data-comment-id="${c._id}" data-username="${c.isAuthor ? 'admin' : (c.userUsername || c.userName.replace(/\\s+/g, '').toLowerCase())}" style="font-size: 0.75rem;">Responder</button>
              </div>
            </div>
          </div>
        `;
        commentsContainer.insertAdjacentHTML('beforeend', html);
        
        // Scroll the modal to bottom
        const modalBody = document.querySelector('#commentsContainerModal');
        if (modalBody) modalBody.scrollTop = modalBody.scrollHeight;
      } else {
        const parentId = data.comment.parent;
        const rootCommentEl = document.getElementById('c-' + parentId);
        if (rootCommentEl) {
          let repliesContainer = document.getElementById('replies-container-' + parentId);
          if (!repliesContainer) {
            const containerHtml = `
              <div class="mt-1" id="replies-container-${parentId}">
                <div class="replies-list" style="display:block;"></div>
                <button class="btn p-0 border-0 bg-transparent text-muted fw-bold d-flex align-items-center gap-2 c-replies-load-more mt-2" data-target="replies-container-${parentId}" data-total="0" data-shown="0" style="font-size: 0.75rem;">
                  <div style="width: 20px; height: 1px; background: #6c757d;"></div> <span class="btn-text">ver respostas (0)</span>
                </button>
              </div>
            `;
            rootCommentEl.querySelector('.flex-grow-1').insertAdjacentHTML('beforeend', containerHtml);
            repliesContainer = document.getElementById('replies-container-' + parentId);
            
            const newBtn = repliesContainer.querySelector('.c-replies-load-more');
            if (newBtn) {
              newBtn.addEventListener("click", () => {
                const targetId = newBtn.dataset.target;
                const container = document.getElementById(targetId);
                if (!container) return;
                const list = container.querySelector('.replies-list');
                const items = list.querySelectorAll('.reply-item');
                const total = parseInt(newBtn.dataset.total);
                let shown = parseInt(newBtn.dataset.shown);
                
                if (shown === total) {
                  items.forEach(item => item.style.display = "none");
                  newBtn.dataset.shown = "0";
                  list.style.display = "none";
                  newBtn.querySelector('.btn-text').innerText = `ver respostas (${total})`;
                } else {
                  list.style.display = "block";
                  const limit = shown + 10;
                  for (let i = shown; i < limit && i < total; i++) {
                    if (items[i]) items[i].style.display = "block";
                    shown++;
                  }
                  newBtn.dataset.shown = shown;
                  const remaining = total - shown;
                  if (remaining > 0) {
                    newBtn.querySelector('.btn-text').innerText = `ver respostas (${remaining})`;
                  } else {
                    newBtn.querySelector('.btn-text').innerText = `Ocultar respostas`;
                  }
                }
              });
            }
          }

          const c = data.comment;
          const bodyParsed = c.body.replace(/@([a-zA-Z0-9_]+)/g, '<span style="color: #3b82f6;">@$1</span>');
          const avatarLetter = c.userName ? c.userName.charAt(0).toUpperCase() : 'U';
          const usernameTag = c.userUsername ? c.userUsername : (c.userName ? c.userName.replace(/\\s+/g, '').toLowerCase() : 'user');
          const authorBadge = c.isAuthor ? '<i class="bi bi-patch-check-fill text-primary ms-1" style="font-size: 0.75rem;"></i> <span class="text-muted fw-normal" style="font-size: 0.7rem;">@admin</span>' : `<span class="text-muted fw-normal" style="font-size: 0.7rem;">@${usernameTag}</span>`;
          
          const replyHtml = `
            <div class="reply-item" style="display: block;">
              <div class="comment-ig d-flex gap-2 mb-2 mt-2" id="c-${c._id}">
                <div class="rounded-circle bg-gradient d-flex align-items-center justify-content-center text-white flex-shrink-0" style="width: 28px; height: 28px; font-weight: bold; font-size: 12px;">
                  ${avatarLetter}
                </div>
                <div class="flex-grow-1 min-w-0">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <span class="fw-bold text-white me-1" style="font-size: 0.85rem;">
                        ${c.userName}
                        ${authorBadge}
                      </span>
                      <span class="text-white" style="font-size: 0.85rem; word-break: break-word;">
                        ${bodyParsed}
                      </span>
                    </div>
                    <div class="d-flex flex-column align-items-center ms-3">
                      <i class="bi bi-heart text-muted" style="font-size: 0.8rem;"></i>
                      <small id="comment-like-count-${c._id}" class="text-muted fw-bold mt-1" style="font-size: 0.65rem; display: none;">0</small>
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-3 mt-1">
                    <small class="text-muted" style="font-size: 0.7rem;">Agora</small>
                    <button type="button" class="btn p-0 border-0 bg-transparent text-muted fw-bold c-reply-toggle" data-comment-id="${c.parent}" data-username="${c.isAuthor ? 'admin' : usernameTag}" style="font-size: 0.75rem;">Responder</button>
                  </div>
                </div>
              </div>
            </div>
          `;
          
          const repliesList = repliesContainer.querySelector('.replies-list');
          repliesList.style.display = "block";
          repliesList.insertAdjacentHTML('beforeend', replyHtml);
          
          const btn = repliesContainer.querySelector('.c-replies-load-more');
          if (btn) {
            let total = parseInt(btn.dataset.total) + 1;
            let shown = parseInt(btn.dataset.shown) + 1;
            btn.dataset.total = total;
            btn.dataset.shown = shown;
            const remaining = total - shown;
            if (remaining > 0) {
              btn.querySelector('.btn-text').innerText = `ver respostas (${remaining})`;
            } else {
              btn.querySelector('.btn-text').innerText = `Ocultar respostas`;
            }
          }
          
          const modalBody = document.querySelector('#commentsContainerModal');
          if (modalBody) modalBody.scrollTop = modalBody.scrollHeight;
        }
      }
    }
  });

  // Atualizar mensagens do ticket
  socket.on('ticket:message:added', (data) => {
    const chatContainer = document.querySelector('#chatContainer');
    if (chatContainer && ticketMatch && ticketMatch[1] === data.ticketId) {
      const isAdminView = window.location.pathname.startsWith('/admin');
      const mine = (isAdminView && data.message.senderType === 'admin') || (!isAdminView && data.message.senderType === 'user');
      
      const row = document.createElement('div');
      row.className = `chat-row ${mine ? 'mine' : 'theirs'} ${data.message.isInternal ? 'internal-note' : ''}`;
      
      let attachmentsHtml = '';
      if (data.message.attachments && data.message.attachments.length > 0) {
        attachmentsHtml = '<div class="chat-attachments mt-2 d-flex flex-wrap gap-2">';
        data.message.attachments.forEach(att => {
          const isObj = typeof att === 'object' && att !== null;
          const url = isObj ? att.url : att;
          const isImage = isObj ? att.type && att.type.startsWith('image/') : true;
          const name = isObj ? att.name : 'Imagem Anexada';
          const size = isObj && att.size ? (att.size / 1024 / 1024).toFixed(2) + ' MB' : '';
          
          if (isImage) {
            attachmentsHtml += `<img src="${url}" class="cursor-pointer" onclick="openFullscreen('${url}')" style="max-width: 150px; border-radius: 8px; border: 1px solid var(--border); object-fit: cover; cursor: zoom-in;" title="Ver em tela cheia">`;
          } else {
            attachmentsHtml += `
              <div class="d-flex align-items-center gap-2 p-2 rounded" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border); min-width: 200px;">
                <i class="bi bi-file-earmark-arrow-down fs-4 text-primary"></i>
                <div class="d-flex flex-column flex-grow-1 overflow-hidden" style="max-width: 150px;">
                  <span class="text-white text-truncate fw-bold" style="font-size: 0.8rem;" title="${name}">${name}</span>
                  <span class="text-muted" style="font-size: 0.7rem;">${size}</span>
                </div>
                <a href="${url}" download="${name}" class="btn btn-sm btn-outline-light rounded-circle ms-2" title="Baixar Arquivo"><i class="bi bi-download"></i></a>
              </div>
            `;
          }
        });
        attachmentsHtml += '</div>';
      }

      const internalBadge = data.message.isInternal ? '<span class="badge bg-warning text-dark me-2" style="font-size:0.6rem;">NOTA INTERNA</span>' : '';

      row.innerHTML = `
        <div class="chat-bubble" ${data.message.isInternal ? 'style="background: rgba(255,193,7,0.15); border: 1px solid var(--warning);"' : ''}>
          <div class="markdown-body"><p>${internalBadge}${data.message.body}</p></div>
          ${attachmentsHtml}
          <div class="chat-meta text-end mt-1">${new Date(data.message.createdAt).toLocaleString('pt-BR')}</div>
        </div>
      `;
      chatContainer.appendChild(row);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  socket.on('ticket:state:updated', (data) => {
    const statusBadge = document.querySelector('#ticketStatusBadge');
    if (statusBadge && ticketMatch && ticketMatch[1] === data.ticketId) {
      statusBadge.textContent = data.status.toUpperCase();
      statusBadge.className = `badge bg-opacity-25 rounded-pill px-3 py-2 border border-opacity-50 ${data.status === 'resolved' || data.status === 'closed' ? 'bg-success text-success border-success' : 'bg-warning text-warning border-warning'}`;
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
                 const commentId = form.dataset.commentId;
                 if (commentId) {
                   const countEl = document.getElementById('comment-like-count-' + commentId);
                   if (countEl) {
                     countEl.innerText = json.likeCount;
                     countEl.style.display = json.likeCount > 0 ? '' : 'none';
                   }
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

  // Interceptar formulários com arquivo (multipart)
  document.querySelectorAll('form.ajax-form-multipart').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const formData = new FormData(form);
        const res = await fetch(form.action, {
          method: form.method,
          headers: {
            'Accept': 'application/json'
          },
          body: formData
        });
        
        let json = {};
        try { json = await res.json(); } catch(e) {}

        if (res.ok) {
          const textarea = form.querySelector('textarea');
          if (textarea) textarea.value = '';
          const textInput = form.querySelector('input[type="text"][name="body"]');
          if (textInput) textInput.value = '';
          
          if (json.success && typeof json.message === 'object') {
            return;
          }

          if (json.redirect && json.message) {
            const sep = json.redirect.includes('?') ? '&' : '?';
            window.location.href = json.redirect + sep + 'toast=' + encodeURIComponent(json.message);
          } else if (json.message) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: json.message, background: 'var(--surface)', color: 'var(--text)', confirmButtonColor: 'var(--accent-1)' }).then(() => {
              if (json.redirect) window.location.href = json.redirect;
            });
          } else if (json.redirect) {
            window.location.href = json.redirect;
          }
        } else {
          Swal.fire({ icon: 'error', title: 'Ops...', text: json.error || 'Ocorreu um erro ao processar a requisição.', background: 'var(--surface)', color: 'var(--text)', confirmButtonColor: 'var(--accent-1)' });
        }
      } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Erro de conexão', text: 'Verifique sua internet e tente novamente.', background: 'var(--surface)', color: 'var(--text)', confirmButtonColor: 'var(--accent-1)' });
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
});
