/* global notificationBar */

const rerunButton = document.getElementById("pgv-rerun");

if (rerunButton) {
  rerunButton.addEventListener("click", (event) => {
    event.preventDefault();
    function redirectToNextBuild(queueId) {
      function poll() {
        const interval = 1000;
        fetch(`nextBuild?queueId=${queueId}`)
          .then((response) => {
            if (response.ok) {
              return response.json();
            } else {
              throw new Error("Failed to fetch next build data");
            }
          })
          .then(({ status, data, message }) => {
            if (status === "ok") {
              if (data.nextBuildUrl) {
                window.location = data.nextBuildUrl;
                return;
              }
            } else {
              console.warn("Error in next build response:", message);
            }
            setTimeout(poll, interval);
          })
          .catch((error) => {
            console.error("Error fetching next build data:", error);
            setTimeout(poll, interval);
          });
      }

      poll();
    }

    const rerunAction = window[`${rerunButton.dataset.proxyName}`];
    rerunAction.doRerun(function (response) {
      const { status, data, message } = response.responseJSON;
      if (status === "ok") {
        notificationBar.show(data.message, notificationBar.SUCCESS);
        redirectToNextBuild(data.queueId);
      } else {
        const failMessage =
          status === "error" && message
            ? message
            : "Unknown error occurred while trying to rerun the build.";
        notificationBar.show(failMessage, notificationBar.WARNING);
      }
    });
  });
}

const cancelButton = document.getElementById("pgv-cancel");

if (cancelButton) {
  cancelButton.addEventListener("click", (event) => {
    event.preventDefault();
    const question = cancelButton.getAttribute("data-confirm");
    const execute = function () {
      const cancelAction = window[`${cancelButton.dataset.proxyName}`];
      cancelAction.doCancel(function (response) {
        const result = response.responseJSON;
        if (result.status === "ok") {
          notificationBar.show(cancelButton.dataset.successMessage);
        } else {
          notificationBar.show(result.message, notificationBar.WARNING);
        }
      });
    };

    if (question != null) {
      dialog
        .confirm(question)
        .then(() => {
          execute();
          return null;
        })
        .catch((error) => {
          console.error("Error in cancel confirm dialog:", error);
        });
    } else {
      execute();
    }
  });

  function updateCancelButton() {
    const buildCaption = document.querySelector(".jenkins-build-caption");
    const url = buildCaption.dataset.statusUrl;
    fetch(url)
      .then((rsp) => {
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
        console.error("Error fetching build caption status:", error);
      });
  }
  setTimeout(updateCancelButton, 5000);
}
