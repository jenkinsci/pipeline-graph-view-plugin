import { createRoot, Root } from "react-dom/client";

import {
  BUILD_FLOW_CHANGED_EVENT,
  BUILD_FLOW_LS_KEY,
} from "../common/user/user-preferences-provider.tsx";
import App from "./app.tsx";
import { getRootElement } from "./build-flow/main/BuildFlowUtils.ts";

const rootElement = getRootElement();
// The build overview tab sets data-show-heading; job page views don't.
// User toggle only gates job page rendering.
const isBuildPage = rootElement?.dataset.showHeading != null;

function getCardContainer(el: HTMLElement): HTMLElement {
  return (el.closest(".jenkins-card") as HTMLElement) ?? el;
}

let reactRoot: Root | null = null;

function mount() {
  if (!rootElement || reactRoot) return;
  const card = getCardContainer(rootElement);
  card.style.display = "";
  rootElement.style.display = "";
  reactRoot = createRoot(rootElement);
  reactRoot.render(<App />);
}

function unmount() {
  if (!rootElement) return;
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  const card = getCardContainer(rootElement);
  card.style.display = "none";
}

if (rootElement) {
  const showBuildFlow =
    window.localStorage.getItem(BUILD_FLOW_LS_KEY) !== "false";

  if (isBuildPage || showBuildFlow) {
    mount();
  } else {
    unmount();
  }

  if (!isBuildPage) {
    document.addEventListener(BUILD_FLOW_CHANGED_EVENT, ((e: CustomEvent) => {
      if (e.detail) {
        mount();
      } else {
        unmount();
      }
    }) as EventListener);
  }
}
