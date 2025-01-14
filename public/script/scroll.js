export default function scrollFunc() {
  const scrollContainer = document.querySelector('.certificateContainer');
  const scrollItems = document.querySelectorAll('.cardCertificate');

  // Centraliza o primeiro item ao carregar a página
  const centerItem = Math.floor(scrollItems.length / 2);
  scrollContainer.scrollLeft = scrollItems[centerItem].offsetLeft - (scrollContainer.offsetWidth / 2) + (scrollItems[centerItem].offsetWidth / 2);

  // Evento de scroll
  scrollContainer.addEventListener('scroll', () => {
    let center = scrollContainer.scrollLeft + scrollContainer.offsetWidth / 2;

    scrollItems.forEach(item => {
      const itemLeft = item.offsetLeft;
      const itemRight = itemLeft + item.offsetWidth;

      if (center >= itemLeft && center <= itemRight) {
        item.style.transform = 'scale(1.1)';
        item.style.transition = 'transform 0.2s ease';
      } else {
        item.style.transform = 'scale(1)';
      }
    });
  });
}