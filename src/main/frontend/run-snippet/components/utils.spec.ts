import {
  Result,
  StageInfo,
} from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { collapseTopLevelStages } from "./utils.ts";

describe("collapseTopLevelStages", () => {
  it("keeps the running stage visible ahead of placeholders", () => {
    const stages = Array.from({ length: 20 }, (_, i) =>
      stage(i, i < 9 ? Result.success : Result.not_built, i > 9),
    );
    stages[9] = stage(9, Result.running, false);

    const visible = collapseTopLevelStages(stages, 12)
      .filter((item) => item.kind === "stage")
      .map((item) => item.stage.id);

    expect(visible).toContain(9);
  });

  it("keeps a failed stage over the running one", () => {
    const stages = Array.from({ length: 20 }, (_, i) =>
      stage(i, Result.success, false),
    );
    stages[7] = stage(7, Result.failure, false);
    stages[14] = stage(14, Result.running, false);

    const visible = collapseTopLevelStages(stages, 8)
      .filter((item) => item.kind === "stage")
      .map((item) => item.stage.id);

    expect(visible).toContain(7);
  });
});

const stage = (id: number, state: Result, skeleton: boolean): StageInfo => ({
  name: `Stage ${id}`,
  title: `Stage ${id}`,
  state,
  skeleton,
  type: "STAGE",
  children: [],
  id,
  pauseDurationMillis: 0,
  startTimeMillis: 0,
  totalDurationMillis: 0,
  agent: "",
  url: "",
});
