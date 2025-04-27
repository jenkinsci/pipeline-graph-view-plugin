import React from "react";
import {
  useLayoutPreferences,
  MainViewVisibility,
  StageViewPosition,
} from "../providers/user-preference-provider";

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

  const handlePositionToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStageViewPosition(
      e.target.checked ? StageViewPosition.TOP : StageViewPosition.LEFT,
    );
  };

  return (
    <div
      style={{
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      {/* View Selector */}
      <div>
        <label style={{ marginRight: "8px" }}>Visible Views:</label>
        <select value={mainViewVisibility} onChange={handleViewChange}>
          <option value={MainViewVisibility.BOTH}>Tree + Stage</option>
          <option value={MainViewVisibility.TREE_ONLY}>Tree Only</option>
          <option value={MainViewVisibility.STAGE_ONLY}>Stage Only</option>
        </select>
      </div>

      {/* Position Toggle */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={stageViewPosition === StageViewPosition.TOP}
            onChange={handlePositionToggle}
          />
          Show StageView on Top
        </label>
      </div>
    </div>
  );
}
