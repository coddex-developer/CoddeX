export default function scrollFunc() {
  const scrollContainer = document.querySelector('.certificateContainer');
  const scrollItems = document.querySelectorAll('.cardCertificate');

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