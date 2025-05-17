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

const cancelButton = document.getElementById('pgv-cancel');

if (cancelButton) {
  cancelButton.addEventListener('click', event => {
    event.preventDefault();
    const cancelAction = window[`${cancelButton.dataset.proxyName}`];
    cancelAction.doCancel(function (success) {
      if (success.status == 200) {
        window.hoverNotification(cancelButton.dataset.successMessage, cancelButton);
      }
    });
  })
}
