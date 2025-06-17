/* global notificationBar */

const rerunButton = document.getElementById("pgv-rerun");

if (rerunButton) {
  rerunButton.addEventListener("click", (event) => {
    event.preventDefault();
    const rerunAction = window[`${rerunButton.dataset.proxyName}`];
    function updateNextBuildButton() {
      const nextBuild = document.querySelector("[data-module='next-build']");
      if (!nextBuild) {
        return;
      }

      function poll() {
        const interval = 1000;
        fetch("nextBuild")
          .then((response) => {
            if (response.ok) {
              return response.json();
            } else {
              throw new Error("Failed to fetch next build data");
            }
          })
          .then(({ status, data }) => {
            if (status === "ok" && data.hasNextBuild) {
              nextBuild.href = nextBuild.dataset.urlPattern.replace(
                "NEXT_BUILD_NUMBER",
                data.nextBuildNumber,
              );
              nextBuild.classList.remove("jenkins-hidden");
              nextBuild.removeAttribute("data-module");
              nextBuild.removeAttribute("data-url-pattern");
              notificationBar.show(data.message)
            } else {
              setTimeout(poll, interval);
            }
          })
          .catch((error) => {
            console.error("Error fetching next build data:", error);
            setTimeout(poll, interval);
          });
      }

      poll();
    }

    rerunAction.doRerun(function (success) {
      const result = success.responseJSON;
      if (result?.status === "ok") {
        notificationBar.show(result.data.message, notificationBar.SUCCESS);
        updateNextBuildButton();
      } else {
        const failMessage =
          result?.status === "error" && result.data.message
            ? result.data.message
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
