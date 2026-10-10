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

  it("counts collapsed markers towards the limit", () => {
    // A failure in the middle splits the hidden stages into two runs, each with its own marker
    const stages = Array.from({ length: 25 }, (_, i) =>
      stage(i, i === 8 ? Result.failure : Result.success, false),
    );

    const items = collapseTopLevelStages(stages, 5);

    expect(items).toHaveLength(5);
    expect(items).toContainEqual({ kind: "stage", stage: stages[8] });
  });

  it("never renders more items than the limit", () => {
    for (let special = 0; special < 25; special += 1) {
      const stages = Array.from({ length: 25 }, (_, i) =>
        stage(i, i === special ? Result.failure : Result.success, false),
      );

      for (let max = 3; max <= 25; max += 1) {
        const items = collapseTopLevelStages(stages, max);
        const hidden = items.reduce(
          (sum, item) =>
            sum + (item.kind === "collapsed" ? item.hiddenCount : 0),
          0,
        );
        const shown = items.filter((item) => item.kind === "stage").length;

        expect(items.length).toBeLessThanOrEqual(max);
        expect(shown + hidden).toBe(25);
        expect(items).toContainEqual({ kind: "stage", stage: stages[special] });
      }
    }
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
