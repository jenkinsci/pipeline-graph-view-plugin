import "./stages-customization.scss";

import { ChangeEvent } from "react";

import {
  MainViewVisibility,
  StageViewPosition,
  useLayoutPreferences,
} from "../providers/user-preference-provider.tsx";

export default function StagesCustomization() {
  const {
    mainViewVisibility,
    setMainViewVisibility,
    stageViewPosition,
    setStageViewPosition,
    isMobile,
  } = useLayoutPreferences();

  if (isMobile) {
    return null;
  }

  const handleViewChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setMainViewVisibility(e.target.value as MainViewVisibility);
  };

  const handlePositionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setStageViewPosition(e.target.value as StageViewPosition);
  };

  return (
    <>
      <label
        className="jenkins-dropdown__item pgv-stages-customization"
        htmlFor="main-view-visibility"
      >
        <div className="jenkins-dropdown__item__icon">
          <ViewIcon
            mainViewVisibility={mainViewVisibility}
            stageViewPosition={stageViewPosition}
          />
        </div>
        Views
        <span>
          {mainViewVisibility === MainViewVisibility.BOTH && "Graph and stages"}
          {mainViewVisibility === MainViewVisibility.GRAPH_ONLY && "Graph"}
          {mainViewVisibility === MainViewVisibility.STAGES_ONLY && "Stages"}
        </span>
        <select
          id="main-view-visibility"
          value={mainViewVisibility}
          onChange={handleViewChange}
        >
          <option value={MainViewVisibility.BOTH}>Graph and stages</option>
          <option value={MainViewVisibility.GRAPH_ONLY}>Graph</option>
          <option value={MainViewVisibility.STAGES_ONLY}>Stages</option>
        </select>
      </label>

      <label
        className="jenkins-dropdown__item pgv-stages-customization"
        htmlFor="stage-view-position"
      >
        <div className="jenkins-dropdown__item__icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <circle
              cx="128"
              cy="96"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <circle
              cx="256"
              cy="416"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M256 256v112"
            />
            <circle
              cx="384"
              cy="96"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <path
              d="M128 144c0 74.67 68.92 112 128 112M384 144c0 74.67-68.92 112-128 112"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
          </svg>
        </div>
        Graph position
        <span>
          {stageViewPosition === StageViewPosition.TOP ? "Top" : "Left"}
        </span>
        <select
          id="stage-view-position"
          value={stageViewPosition}
          onChange={handlePositionChange}
          disabled={mainViewVisibility === MainViewVisibility.STAGES_ONLY}
        >
          <option value={StageViewPosition.TOP}>Top</option>
          <option value={StageViewPosition.LEFT}>Left</option>
        </select>
      </label>
      <div className="jenkins-dropdown__separator" />
    </>
  );
}

function ViewIcon({
  mainViewVisibility,
  stageViewPosition,
}: {
  mainViewVisibility: MainViewVisibility;
  stageViewPosition: StageViewPosition;
}) {
  if (mainViewVisibility === "both" && stageViewPosition === "top") {
    return (
      <svg
        width="512px"
        height="512px"
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          fill="none"
          fillRule="evenodd"
          stroke="currentColor"
          strokeWidth="32"
        >
          <rect x="31" y="86" width="450" height="340" rx="70" />
          <line x1="31" y1="180" x2="470" y2="180" />
          <line x1="184" y1="180" x2="184" y2="420" />
        </g>
      </svg>
    );
  }

  if (mainViewVisibility === "both" && stageViewPosition === "left") {
    return (
      <svg
        width="512px"
        height="512px"
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          fill="none"
          fillRule="evenodd"
          stroke="currentColor"
          strokeWidth="32"
        >
          <rect x="31" y="86" width="450" height="340" rx="70" />
          <line x1="150" y1="100" x2="150" y2="420" />
          <line x1="280" y1="100" x2="280" y2="420" />
        </g>
      </svg>
    );
  }

  if (mainViewVisibility === "graphOnly" && stageViewPosition === "top") {
    return (
      <svg
        width="512px"
        height="512px"
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          fill="none"
          fillRule="evenodd"
          stroke="currentColor"
          strokeWidth="32"
        >
          <rect x="31" y="86" width="450" height="340" rx="70" />
          <line x1="31" y1="180" x2="470" y2="180" />
        </g>
      </svg>
    );
  }

  if (
    mainViewVisibility === "stagesOnly" ||
    (mainViewVisibility === "graphOnly" && stageViewPosition === "left")
  ) {
    return (
      <svg
        width="512px"
        height="512px"
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          fill="none"
          fillRule="evenodd"
          stroke="currentColor"
          strokeWidth="32"
        >
          <rect x="31" y="86" width="450" height="340" rx="70" />
          <line x1="184" y1="100" x2="184" y2="420" />
        </g>
      </svg>
    );
  }
}
