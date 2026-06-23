// Atualiza o badge de notificações não lidas (#notifBadge) por polling
(function () {
  async function poll() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    try {
      const r = await fetch("/notifications/unread-count", { headers: { Accept: "application/json" } });
      const data = await r.json();
      if (data.count > 0) {
        badge.textContent = data.count > 99 ? "99+" : data.count;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    } catch (_) { /* silencioso */ }
  }
  document.addEventListener("DOMContentLoaded", () => {
    poll();
    setInterval(poll, 20000);
  });
})();
