// Preview de imagem para inputs de arquivo com data-preview="#alvo"
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('input[type="file"][data-preview]').forEach((input) => {
    input.addEventListener("change", () => {
      const target = document.querySelector(input.dataset.preview);
      if (!target) return;
      const file = input.files && input.files[0];
      if (file) {
        target.src = URL.createObjectURL(file);
        target.style.display = "block";
      }
    });
  });
});
