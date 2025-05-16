const replayButton = document.getElementById('pgv-replay');

if (replayButton) {
  replayButton.addEventListener('click', event => {
    event.preventDefault();
    const replayAction = window[`${replayButton.dataset.proxyName}`];
    replayAction.doReplay(function (success) {
      const result = success.responseJSON;
      if (result) {
        window.hoverNotification(replayButton.dataset.successMessage, replayButton);
      }
    });
  })
}
