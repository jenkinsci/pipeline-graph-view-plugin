import { createRoot, Root } from "react-dom/client";

import { RunStatus } from "../common/RestClient.tsx";
import { UserPreferencesProvider } from "../common/user/user-preferences-provider.tsx";
import { mergeStageInfos } from "../common/utils/stage-merge.ts";
import { StageInfo } from "../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import RunSnippet from "./components/run-snippet.tsx";

const roots = new WeakMap<Element, Root>();
const HOST_SELECTOR = '[data-type="pipeline-graph-host"]';

function mountGraphHost(element: Element): void {
  if (roots.has(element)) {
    return;
  }

  const root = createRoot(element);
  roots.set(element, root);

  const currentRunPath = (element as HTMLTemplateElement).dataset
    .currentRunPath!;
  const previousElement = element.previousElementSibling as HTMLTemplateElement;
  const json = JSON.parse(
    previousElement.content.textContent as string,
  ) as RunStatus & { previousStages?: StageInfo[] };

  // Only sent while the run is in progress, to show the stages still to come as placeholders
  const run: RunStatus = json.previousStages
    ? { ...json, stages: mergeStageInfos(json.previousStages, json.stages) }
    : json;

  root.render(
    <UserPreferencesProvider>
      <RunSnippet run={run} currentRunPath={currentRunPath} />
    </UserPreferencesProvider>,
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

scanForHosts();

const observer = new MutationObserver((mutations: MutationRecord[]) => {
  for (const mutation of mutations) {
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
