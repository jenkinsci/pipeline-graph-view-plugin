document.addEventListener("DOMContentLoaded", () => {
  const showNamesKey = "pgv-stage-view.showNames";
  const showDurationKey = "pgv-stage-view.showDuration";
  const settingsButton = document.getElementById("pgv-settings");

  if (settingsButton) {
    settingsButton.addEventListener("click", event => {
      event.preventDefault();

      const formTemplate = document.getElementById("pgv-settings-form");
      if (!formTemplate) {
        return
      }
      document.getElementById("stageNames").checked = window.localStorage
        .getItem(showNamesKey) === "true";
      document.getElementById("stageDuration").checked = window.localStorage
        .getItem(showDurationKey) === "true";

      const form = formTemplate.firstElementChild.cloneNode(true);
      const title = formTemplate.dataset.title;
      const okText = formTemplate.dataset.save;

      dialog
        .form(form, {
          title,
          okText,
          submitButton: false
        })
        // eslint-disable-next-line promise/always-return
        .then((formData) => {
          const showNames = !!formData.get("showNames");
          const showDuration = !!formData.get("showDuration");

          window.localStorage.setItem(
            showNamesKey,
            `${showNames}`
          );

          window.localStorage.setItem(
            showDurationKey,
            `${showDuration}`
          );
        })
        .catch((_) => {
          // do-nothing
        });


    });
  }
});