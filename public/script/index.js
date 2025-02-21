import observerEvent from './intersectObserver.js';
import darkTheme from './darkTheme.js';
import scrollFunc from './scroll.js';

document.addEventListener('DOMContentLoaded', () => {
  observerEvent();
  scrollFunc();
  //darkTheme();

  const btnCertificates = document.querySelectorAll(".btnCertificates");
  btnCertificates.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      alert("")
    });
  });

});