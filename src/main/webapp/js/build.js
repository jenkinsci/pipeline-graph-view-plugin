const rebuildButton = document.getElementById('pgv-rebuild');

if (rebuildButton) {
  rebuildButton.addEventListener('click', event => {
    event.preventDefault();
    const buildUrl = `${rebuildButton.dataset.buildPath}?delay=0sec`
    if (rebuildButton.dataset.parameterized === 'true') {
      const rebuildAction = window[`${rebuildButton.dataset.proxyName}`];
      rebuildAction.doRebuild(function (success) {
        const result = success.responseJSON;
        if (result) {
          window.hoverNotification(rebuildButton.dataset.successMessage, rebuildButton);
        }
      });
    } else {
      fetch(buildUrl, {
        method: 'post',
        headers: crumb.wrap({})
      })
        .then(res => {
          if (!res.ok) {
            console.error('Build failed', res);
          } else {
            window.hoverNotification(rebuildButton.dataset.successMessage, rebuildButton);
          }
        })
    }
  })
}
