const rebuildButton = document.getElementById('pgv-rebuild');

if (rebuildButton) {
  rebuildButton.addEventListener('click', event => {
    event.preventDefault();
    const buildUrl = `${rebuildButton.dataset.buildPath}?delay=0sec`
    if (rebuildButton.dataset.parameterized === 'true') {
      window.location.href = buildUrl
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
