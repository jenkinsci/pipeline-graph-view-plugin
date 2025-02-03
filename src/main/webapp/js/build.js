const rebuildButton = document.getElementById('pgv-rebuild');

if (rebuildButton) {
  rebuildButton.addEventListener('click', event => {
    event.preventDefault();
    const rebuildAction = window[`${rebuildButton.dataset.proxyName}`];
    rebuildAction.doRebuild(function (success) {
      const result = success.responseJSON;
      if (result) {
        window.hoverNotification(rebuildButton.dataset.successMessage, rebuildButton);
      }
    });
  })
}
