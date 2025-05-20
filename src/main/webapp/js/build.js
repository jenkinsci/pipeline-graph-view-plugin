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
      /*eslint-disable no-undef*/
      dialog.confirm(question).then(() => {
        execute();
        return null;
      }).catch((error) => {
        console.error("Error in cancel confirm dialog:", error);
      })
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
