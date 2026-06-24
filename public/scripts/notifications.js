document.addEventListener("DOMContentLoaded", () => {
  const notifModalEl = document.getElementById("notificationsModal");
  const notifList = document.getElementById("notifList");
  const notifLoading = document.getElementById("notifLoading");
  const notifEmpty = document.getElementById("notifEmpty");
  const notifTabs = document.querySelectorAll(".notif-tab");
  
  const mobileNotifBadge = document.getElementById("mobileNotifBadge");

  let allNotifications = [];
  let currentFilter = "all";

  // Function to format relative time (e.g., 1 h, 2 d)
  function formatTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${Math.max(1, diffMins)} m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} d`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks} sem`;
    const options = { day: 'numeric', month: 'short' };
    return d.toLocaleDateString('pt-BR', options).replace(' de ', ' ');
  }

  // Function to group by time (Hoje, Esta semana, Este mês, Mais antigos)
  function getGroupingCategory(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return "Hoje";
    if (diffDays < 7) return "Esta semana";
    if (diffDays < 30) return "Este mês";
    return "Mais antigos";
  }

  // Fetch unread count to show on badge
  async function fetchUnreadCount() {
    try {
      const res = await fetch("/notifications/unread-count");
      const json = await res.json();
      if (json.count > 0 && mobileNotifBadge) {
        mobileNotifBadge.textContent = json.count > 99 ? "99+" : json.count;
        mobileNotifBadge.classList.remove("d-none");
      } else if (mobileNotifBadge) {
        mobileNotifBadge.classList.add("d-none");
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Call on load
  fetchUnreadCount();
  // Call every 30s
  setInterval(fetchUnreadCount, 30000);

  // Render notifications list
  function renderNotifications() {
    notifList.innerHTML = "";
    
    let filtered = allNotifications;
    if (currentFilter !== "all") {
      filtered = allNotifications.filter(n => n.category === currentFilter);
    }

    if (filtered.length === 0) {
      notifEmpty.classList.remove("d-none");
      notifList.classList.add("d-none");
      return;
    }

    notifEmpty.classList.add("d-none");
    notifList.classList.remove("d-none");

    const groups = {
      "Hoje": [],
      "Esta semana": [],
      "Este mês": [],
      "Mais antigos": []
    };

    filtered.forEach(n => {
      const group = getGroupingCategory(n.createdAt);
      groups[group].push(n);
    });

    for (const [groupName, items] of Object.entries(groups)) {
      if (items.length === 0) continue;

      const groupHeader = document.createElement("div");
      groupHeader.className = "px-3 py-2 fw-bold text-white mt-2";
      groupHeader.style.fontSize = "0.95rem";
      groupHeader.textContent = groupName;
      notifList.appendChild(groupHeader);

      items.forEach(n => {
        const itemEl = document.createElement("a");
        itemEl.href = n.link || "#";
        itemEl.className = `notif-item text-decoration-none d-flex align-items-center gap-3 px-3 py-2 border-bottom ${!n.read ? 'unread' : ''}`;
        itemEl.style.borderColor = "var(--border-strong) !important";

        const avatarInitial = n.actorName ? n.actorName.charAt(0).toUpperCase() : "S";
        const avatarHtml = n.actorAvatar 
          ? `<img src="${n.actorAvatar}" alt="User" class="rounded-circle" style="width: 44px; height: 44px; object-fit: cover; border: 1px solid var(--border);">`
          : `<div class="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0" style="width: 44px; height: 44px; font-weight: bold; background: var(--surface-2); border: 1px solid var(--border);">${avatarInitial}</div>`;

        itemEl.innerHTML = `
          ${avatarHtml}
          <div class="flex-grow-1 min-w-0">
            <span class="text-white" style="font-size: 0.9rem; word-break: break-word;">
              <span class="fw-bold">${n.actorName}</span> ${n.text.replace(n.actorName, "").trim()}
              <span class="text-muted ms-1">${formatTime(n.createdAt)}</span>
            </span>
          </div>
          ${!n.read ? `<div class="flex-shrink-0 ms-2"><span class="notif-unread-dot"></span></div>` : ''}
        `;
        
        // Handle click to close modal
        itemEl.addEventListener("click", () => {
          const bsModal = bootstrap.Modal.getInstance(notifModalEl);
          if (bsModal) bsModal.hide();
        });

        notifList.appendChild(itemEl);
      });
    }
  }

  async function loadNotifications() {
    notifLoading.classList.remove("d-none");
    notifList.classList.add("d-none");
    notifEmpty.classList.add("d-none");

    try {
      const res = await fetch("/notifications/list?limit=100");
      const json = await res.json();
      if (json.notifications) {
        allNotifications = json.notifications;
        renderNotifications();
      }
    } catch (e) {
      console.error(e);
      notifEmpty.classList.remove("d-none");
    } finally {
      notifLoading.classList.add("d-none");
    }
  }

  // Load when modal opens
  if (notifModalEl) {
    notifModalEl.addEventListener("show.bs.modal", () => {
      loadNotifications();
    });

    // Mark as read when closing
    notifModalEl.addEventListener("hidden.bs.modal", async () => {
      try {
        await fetch("/notifications/read-all", { method: "POST" });
        if (mobileNotifBadge) mobileNotifBadge.classList.add("d-none");
      } catch (e) {
        console.error(e);
      }
    });
  }

  // Filter tabs
  notifTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      notifTabs.forEach(t => {
        t.classList.remove("active");
        t.style.background = "var(--surface-2)";
        t.style.color = "var(--text)";
        t.style.border = "1px solid var(--border)";
      });
      tab.classList.add("active");
      tab.style.background = "var(--text)";
      tab.style.color = "var(--bg)";
      tab.style.border = "1px solid transparent";
      
      currentFilter = tab.dataset.filter;
      renderNotifications();
    });
  });

});
