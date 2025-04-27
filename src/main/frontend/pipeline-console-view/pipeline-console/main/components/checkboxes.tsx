import React from "react";
import {
  MainViewVisibility,
  StageViewPosition,
  useLayoutPreferences,
} from "../providers/user-preference-provider";
import "./checkboxes.scss";

export default function VisibilitySelect() {
  const {
    mainViewVisibility,
    setMainViewVisibility,
    stageViewPosition,
    setStageViewPosition,
  } = useLayoutPreferences();

  const handleViewChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMainViewVisibility(e.target.value as MainViewVisibility);
  };

  const handlePositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStageViewPosition(e.target.value as StageViewPosition);
  };

  return (
    <>
      {/* View Selector */}
      <label
        className="jenkins-dropdown__item idk"
        htmlFor="main-view-visibility"
      >
        <div className="jenkins-dropdown__item__icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              d="M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 00-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 000-17.47C428.89 172.28 347.8 112 255.66 112z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
            />
            <circle
              cx="256"
              cy="256"
              r="80"
              fill="none"
              stroke="currentColor"
              strokeMiterlimit="10"
              strokeWidth="32"
            />
          </svg>
        </div>
        Views
        <span>
          {mainViewVisibility === MainViewVisibility.BOTH && "Stage and tree"}
          {mainViewVisibility === MainViewVisibility.STAGE_ONLY && "Stage"}
          {mainViewVisibility === MainViewVisibility.TREE_ONLY && "Tree"}
        </span>
        <select
          id="main-view-visibility"
          value={mainViewVisibility}
          onChange={handleViewChange}
        >
          <option value={MainViewVisibility.BOTH}>Stage and tree</option>
          <option value={MainViewVisibility.STAGE_ONLY}>Stage</option>
          <option value={MainViewVisibility.TREE_ONLY}>Tree</option>
        </select>
      </label>

      {/* Position Toggle */}
      <label
        className="jenkins-dropdown__item idk"
        htmlFor="stage-view-position"
      >
        <div className="jenkins-dropdown__item__icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z"
              fill="none"
              stroke="currentColor"
              strokeMiterlimit="10"
              strokeWidth="32"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M352 176L217.6 336 160 272"
            />
          </svg>
        </div>
        Stage view
        <span>
          {stageViewPosition === StageViewPosition.TOP ? "Top" : "Left"}
        </span>
        <select
          id="stage-view-position"
          value={stageViewPosition}
          onChange={handlePositionChange}
        >
          <option value={StageViewPosition.TOP}>Top</option>
          <option value={StageViewPosition.LEFT}>Left</option>
        </select>
      </label>
    </>
  );
}
