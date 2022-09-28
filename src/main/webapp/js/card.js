document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pgv-modal__expander')
    .forEach(expander => {
      expander.addEventListener('click', (event) => {
        event.preventDefault();

        const modal = expander.closest('.pgv-modal')
        modal.classList.add('pgv-modal__open');

        window.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            modal.classList.remove('pgv-modal__open');
          }
        }, { once: true });

      })
    })

  document.querySelectorAll('.pgv-modal__closer')
    .forEach(closer => {
      closer.addEventListener('click', (event) => {
        event.preventDefault();

        const modal = closer.closest('.pgv-modal')
        modal.classList.remove('pgv-modal__open');
      })
    })
})
