const rerunButton = document.getElementById('pgv-rerun');

if (rerunButton) {
  rerunButton.addEventListener('click', event => {
    event.preventDefault();
    const rerunAction = window[`${rerunButton.dataset.proxyName}`];
    rerunAction.doRerun(function (success) {
      const result = success.responseJSON;
      if (result) {
        window.hoverNotification(rerunButton.dataset.successMessage, rerunButton);
      }
    });
  })
}