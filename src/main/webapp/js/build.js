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
            // Hide the entire split-button when build finishes
            const splitButton = cancelButton.closest(".jenkins-split-button");
            if (splitButton) {
              splitButton.style.display = "none";
            } else {
              cancelButton.style.display = "none";
            }
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

// Use event delegation for pause/resume dropdown items
document.addEventListener("click", function (event) {
  const target = event.target.closest("#pgv-pause, #pgv-resume");
  if (!target) return;

  event.preventDefault();

  const proxyName = target.dataset.proxyName;
  if (!proxyName) return;

  const actionProxy = window[proxyName];
  if (!actionProxy) {
    console.error("Failed to execute action: proxy not found");
    return;
  }

  if (target.id === "pgv-pause") {
    if (typeof actionProxy.doPause !== "function") {
      console.error("Failed to pause: method not found");
      return;
    }

    actionProxy.doPause(function (response) {
      const result = response.responseJSON;
      if (result.status === "ok") {
        notificationBar.show(target.dataset.successMessage);
        // Hide pause, show resume
        const pauseItem = document.getElementById("pgv-pause");
        const resumeItem = document.getElementById("pgv-resume");
        if (pauseItem) pauseItem.style.display = "none";
        if (resumeItem) resumeItem.style.display = "";
      } else {
        notificationBar.show(result.message, notificationBar.WARNING);
      }
    });
  } else if (target.id === "pgv-resume") {
    if (typeof actionProxy.doResume !== "function") {
      console.error("Failed to resume: method not found");
      return;
    }

    actionProxy.doResume(function (response) {
      const result = response.responseJSON;
      if (result.status === "ok") {
        notificationBar.show(target.dataset.successMessage);
        // Hide resume, show pause
        const pauseItem = document.getElementById("pgv-pause");
        const resumeItem = document.getElementById("pgv-resume");
        if (resumeItem) resumeItem.style.display = "none";
        if (pauseItem) pauseItem.style.display = "";
      } else {
        notificationBar.show(result.message, notificationBar.WARNING);
      }
    });
  }
});

function updatePauseElements() {
  const pausedBanner = document.getElementById("pgv-paused-banner");
  const pauseMenuItem = document.getElementById("pgv-pause");
  const resumeMenuItem = document.getElementById("pgv-resume");

  fetch("pauseState")
    .then((rsp) => {
      if (!rsp.ok) {
        throw new Error(
          `Failed to fetch pause state: ${rsp.status} - ${rsp.statusText}`,
        );
      }
      return rsp.json();
    })
    .then((result) => {
      if (result.status === "ok") {
        const isPaused = result.data.paused;
        const isBuilding = result.data.building;

        if (isBuilding) {
          if (isPaused) {
            pausedBanner.style.display = "";
            if (pauseMenuItem) {
              pauseMenuItem.style.display = "none";
            }
            if (resumeMenuItem) {
              resumeMenuItem.style.display = "";
            }
          } else {
            pausedBanner.style.display = "none";
            if (pauseMenuItem) {
              pauseMenuItem.style.display = "";
            }
            if (resumeMenuItem) {
              resumeMenuItem.style.display = "none";
            }
          }
          
          let updateInterval = 5000;
          // update more frequently when the pause/resume menu items are visible
          if (pauseMenuItem || resumeMenuItem) {
            updateInterval = 1000;
          }
          setTimeout(updatePauseElements(), updateInterval);
        } else {
          pausedBanner.style.display = "none";
          pauseMenuItem.style.display = "none";
          resumeMenuItem.style.display = "none";
        }
      }
      return null;
    })
    .catch((error) => {
      console.error("Error fetching pause state:", error);
    });
}

updatePauseElements()