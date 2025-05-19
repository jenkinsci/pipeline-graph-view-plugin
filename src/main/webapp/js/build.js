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
    const question = cancelButton.getAttribute("data-confirm");
    const execute = function () {
      const cancelAction = window[`${cancelButton.dataset.proxyName}`];
      cancelAction.doCancel();
    };

    if (question != null) {
      dialog.confirm(question).then(
        () => {
          execute();
        }
      );
    } else {
      execute();
    }

    function updateCancelButton() {
      const buildCaption = document.querySelector(".jenkins-build-caption");
      const url = buildCaption.dataset.statusUrl;
      fetch(url).then((rsp) => {
        if (rsp.ok) {
          const isBuilding = rsp.headers.get("X-Building");
          if (isBuilding === "true") {
            setTimeout(updateCancelButton, 5000);
          } else {
            cancelButton.style.display = "none";
          }
        }
        return null;
      })
      .catch((error) => {
        console.error("Error fetching build caption statsus:", error);
      })
    }
    setTimeout(updateCancelButton, 5000);
  })
}
