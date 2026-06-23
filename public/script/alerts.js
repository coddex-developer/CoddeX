// Helpers de alerta (SweetAlert2) com o tema do CoddeX
(function () {
  if (typeof Swal === "undefined") return;

  const theme = {
    background: "#12131d",
    color: "#e8eaf2",
    confirmButtonColor: "#7c3aed",
    cancelButtonColor: "#3a3b4a"
  };

  // Mixin reutilizável
  window.coddexSwal = Swal.mixin(theme);

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    // Confirmação automática em qualquer <form data-confirm="mensagem">
    document.querySelectorAll("form[data-confirm]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        if (form.dataset.confirmed === "true") return;
        e.preventDefault();
        Swal.fire(Object.assign({}, theme, {
          title: form.dataset.confirmTitle || "Tem certeza?",
          text: form.getAttribute("data-confirm"),
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: form.dataset.confirmBtn || "Confirmar",
          cancelButtonText: "Cancelar"
        })).then(function (r) {
          if (r.isConfirmed) {
            form.dataset.confirmed = "true";
            form.submit();
          }
        });
      });
    });

    // Toast via querystring: ?toast=Mensagem&type=success|error|info
    const params = new URLSearchParams(location.search);
    if (params.get("toast")) {
      Swal.fire(Object.assign({}, theme, {
        toast: true,
        position: "top-end",
        timer: 3500,
        timerProgressBar: true,
        showConfirmButton: false,
        icon: params.get("type") || "success",
        title: params.get("toast")
      }));
    }
  });
})();
