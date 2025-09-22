/* global notificationBar */

const rerunButton = document.getElementById("pgv-rerun");

if (rerunButton) {
  rerunButton.addEventListener("click", (event) => {
    event.preventDefault();

    async function redirectToNextBuild(queueId) {
      while (true) {
        try {
          const response = await fetch(`nextBuild?queueId=${queueId}`);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch next build data: ${response.status} - ${response.statusText}`,
            );
          }
          const { status, data, message } = await response.json();
          if (status === "ok") {
            if (data?.nextBuildUrl) {
              let root = document.querySelector("head").dataset.rooturl;
              if (!root.endsWith("/")) {
                root += "/";
              }
              window.location = `${root}${data.nextBuildUrl}`;
              break;
            }
          } else {
            console.warn("Error in next build response:", message);
          }
        } catch (error) {
          console.error("Error fetching next build data:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const rerunAction = window[`${rerunButton.dataset.proxyName}`];
    rerunAction.doRerun(async function (response) {
      const { status, data, message } = response.responseJSON;
      if (status === "ok") {
        notificationBar.show(data.message, notificationBar.SUCCESS);
        await redirectToNextBuild(data.queueId);
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
