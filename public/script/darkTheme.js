function darTheme() {
      // Modo escuro
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    const cards = document.querySelectorAll(".card");
    darkModeSwitch.checked = true;
    darkModeSwitch.addEventListener('change', () => {
      document.body.classList.toggle('bg-dark', darkModeSwitch.checked);
      document.body.classList.toggle('text-white', darkModeSwitch.checked);
      cards.forEach(card => {
        card.classList.add('cardDark', darkModeSwitch.checked);
      })
    });
}

export default darTheme;