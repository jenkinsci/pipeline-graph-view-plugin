import { createRoot, Root } from "react-dom/client";

import {
  I18NProvider,
  LocaleProvider,
  ResourceBundleName,
} from "../common/i18n/index.ts";
import { RunStatus } from "../common/RestClient.tsx";
import { UserPreferencesProvider } from "../common/user/user-preferences-provider.tsx";
import { mergeStageInfos } from "../common/utils/stage-merge.ts";
import { StageInfo } from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import RunSnippet from "./components/run-snippet.tsx";

const roots = new WeakMap<Element, Root>();
const HOST_SELECTOR = '[data-type="pipeline-graph-host"]';
const bundles = [ResourceBundleName.messages];

function mountGraphHost(element: Element): void {
  if (roots.has(element)) {
    return;
  }

  const root = createRoot(element);
  roots.set(element, root);

  const { currentRunPath, runPath, userLocale } = (element as HTMLElement)
    .dataset;
  const previousElement = element.previousElementSibling as HTMLTemplateElement;
  const json = JSON.parse(
    previousElement.content.textContent as string,
  ) as RunStatus & { previousStages?: StageInfo[] };

  // Only sent while the run is in progress, to show the stages still to come as placeholders
  const run: RunStatus = json.previousStages
    ? { ...json, stages: mergeStageInfos(json.previousStages, json.stages) }
    : json;

  root.render(
    <LocaleProvider locale={userLocale!}>
      <I18NProvider bundles={bundles}>
        <UserPreferencesProvider>
          <RunSnippet
            run={run}
            currentRunPath={currentRunPath!}
            runPath={runPath!}
          />
        </UserPreferencesProvider>
      </I18NProvider>
    </LocaleProvider>,
  );
}

function scanForHosts(node: ParentNode | Element = document): void {
  if (node instanceof Element && node.matches(HOST_SELECTOR)) {
    mountGraphHost(node);
  }

  if ("querySelectorAll" in node) {
    node.querySelectorAll(HOST_SELECTOR).forEach((element) => {
      mountGraphHost(element);
    });
  }
}

function hostsWithin(element: Element): Element[] {
  return [
    ...(element.matches(HOST_SELECTOR) ? [element] : []),
    ...element.querySelectorAll(HOST_SELECTOR),
  ];
}

scanForHosts();

// The builds list replaces a build's row when it changes, so the replaced row is unmounted to
// stop its live durations ticking in the background
const observer = new MutationObserver((mutations: MutationRecord[]) => {
  for (const mutation of mutations) {
    mutation.removedNodes.forEach((node: Node) => {
      if (!(node instanceof Element)) {
        return;
      }

      // A host that's back in the page by now was moved rather than removed
      hostsWithin(node)
        .filter((host) => !host.isConnected)
        .forEach((host) => {
          roots.get(host)?.unmount();
          roots.delete(host);
        });
    });

    mutation.addedNodes.forEach((node: Node) => {
      if (!(node instanceof Element)) {
        return;
      }

      scanForHosts(node);
    });
  }
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
