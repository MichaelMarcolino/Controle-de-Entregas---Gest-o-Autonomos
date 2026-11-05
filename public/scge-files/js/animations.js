// Animações de revelação suave e interatividade dos cards
document.addEventListener('DOMContentLoaded', () => {
  const elements = document.querySelectorAll('.reveal');
  elements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(15px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 100 * (index + 1));
  });
});
