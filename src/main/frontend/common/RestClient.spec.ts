import { vi } from "vitest";

import { getRunStatusFromPath, getRunSteps } from "./RestClient.tsx";

describe("graph endpoint cache busting", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  function mockFetch() {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: { get: () => new Date().toUTCString() },
      text: async () =>
        JSON.stringify({
          data: { stages: [], complete: true, steps: [], runIsComplete: true },
        }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("appends the plugin version to the graph URLs", async () => {
    document.body.innerHTML =
      '<div data-graph-cache-version="1.2.3 (private-abc)"></div>';
    const fetchMock = mockFetch();

    await getRunStatusFromPath("/job/x/1/", 0);
    await getRunSteps("/job/x/1/", 0);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/job/x/1/stages/tree?v=1.2.3%20(private-abc)",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/job/x/1/stages/allSteps?v=1.2.3%20(private-abc)",
    );
  });

  it("leaves the graph URLs unchanged without a version", async () => {
    const fetchMock = mockFetch();

    await getRunStatusFromPath("/job/x/1/", 0);
    await getRunSteps("/job/x/1/", 0);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/job/x/1/stages/tree");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/job/x/1/stages/allSteps");
  });
});
