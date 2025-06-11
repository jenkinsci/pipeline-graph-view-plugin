const collapsable = document.querySelector("[data-module='collapsable']");

if (collapsable) {
  const controller = document.querySelector(
    `input[name="${collapsable.dataset.controlledBy}"]`,
  );

  if (controller) {
    const hide = () => {
      collapsable.classList.add("jenkins-hidden");
      collapsable.querySelectorAll("input[type='checkbox']").forEach((e) => {
        e.checked = false;
      });
    };
    const show = () => {
      collapsable.classList.remove("jenkins-hidden");
    };
    if (!controller.checked) {
      hide();
    }

    controller.addEventListener("change", (event) => {
      (event.target.checked ? show : hide)();
    });
  }
}
