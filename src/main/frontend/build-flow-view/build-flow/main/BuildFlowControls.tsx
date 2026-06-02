/**
 * Controls components for the Build Flow view: zoom, primary toggles, overflow menu.
 * Extracted from BuildFlow.tsx for maintainability.
 */
import Tippy from "@tippyjs/react";
import { FunctionComponent, useCallback, useState } from "react";
import {
  ReactZoomPanPinchContextState,
  useControls,
  useTransformEffect,
} from "react-zoom-pan-pinch";

import { DefaultDropdownProps } from "../../../common/components/dropdown.tsx";
import Tooltip from "../../../common/components/tooltip.tsx";
import {
  LocalizedMessageKey,
  useMessages,
} from "../../../common/i18n/index.ts";
import type { LayoutDirection } from "./BuildFlowLayout.ts";
import {
  IconBarChart,
  IconChevronDown,
  IconChevronUp,
  IconDocumentText,
  IconEllipsisVertical,
  IconFitToView,
  IconGitMerge,
  IconGrid,
  IconLocate,
  IconMinus,
  IconPlus,
  IconPricetag,
  IconRefreshCircle,
  IconSwapHorizontal,
  IconTime,
  IconTrailSign,
  ToggleButton,
} from "./BuildFlowIcons.tsx";

// --- Constants ---
const MAX_SCALE = 3;

// --- Zoom Controls ---

export function ZoomControls({
  initialScale,
  minScale,
}: {
  initialScale: number;
  minScale: number;
}) {
  const messages = useMessages();
  const { zoomIn, zoomOut, centerView } = useControls();
  const [scale, setScale] = useState(initialScale);
  const [isTransformed, setIsTransformed] = useState(false);
  const handleTransformEffect = useCallback(
    (ref: ReactZoomPanPinchContextState) => {
      setScale(ref.state.scale);
      const state = ref.state;
      const scaleDiff = Math.abs(state.scale - initialScale) > 0.01;
      const positionDiff =
        Math.abs(state.positionX) > 5 || Math.abs(state.positionY) > 5;
      setIsTransformed(scaleDiff || positionDiff);
    },
    [initialScale],
  );
  useTransformEffect(handleTransformEffect);

  return (
    <div className="pgv-build-flow__controls pgw-zoom-controls">
      <Tooltip content={messages.format(LocalizedMessageKey.buildFlowZoomIn)}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => zoomIn()}
          disabled={scale >= MAX_SCALE}
        >
          {IconPlus}
        </button>
      </Tooltip>
      <Tooltip content={messages.format(LocalizedMessageKey.buildFlowZoomOut)}>
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => zoomOut()}
          disabled={scale <= minScale}
        >
          {IconMinus}
        </button>
      </Tooltip>
      <Tooltip
        content={messages.format(LocalizedMessageKey.buildFlowFitToView)}
      >
        <button
          className={"jenkins-button jenkins-button--tertiary"}
          onClick={() => centerView(initialScale)}
          disabled={!isTransformed}
        >
          {IconFitToView}
        </button>
      </Tooltip>
    </div>
  );
}

// --- Toggle Controls ---

interface ToggleControlsProps {
  showUpstream: boolean;
  setShowUpstream: (v: boolean) => void;
  showDownstream: boolean;
  setShowDownstream: (v: boolean) => void;
  layoutDirection: LayoutDirection;
  setLayoutDirection: (v: LayoutDirection) => void;
  showDuration: boolean;
  setShowDuration: (v: boolean) => void;
  showBuildNumber: boolean;
  setShowBuildNumber: (v: boolean) => void;
  showFullNames: boolean;
  setShowFullNames: (v: boolean) => void;
  showDescription: boolean;
  setShowDescription: (v: boolean) => void;
  showBuildHistory: boolean;
  setShowBuildHistory: (v: boolean) => void;
  flattenGraph: boolean;
  setFlattenGraph: (v: boolean) => void;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  focusCurrentFlow: boolean;
  setFocusCurrentFlow: (v: boolean) => void;
}

/** Primary toggles: always visible in left group */
export const PrimaryToggleControls: FunctionComponent<
  Pick<
    ToggleControlsProps,
    | "showUpstream"
    | "setShowUpstream"
    | "showDownstream"
    | "setShowDownstream"
    | "showBuildHistory"
    | "setShowBuildHistory"
    | "autoRefresh"
    | "setAutoRefresh"
    | "focusCurrentFlow"
    | "setFocusCurrentFlow"
  >
> = ({
  showUpstream,
  setShowUpstream,
  showDownstream,
  setShowDownstream,
  showBuildHistory,
  setShowBuildHistory,
  autoRefresh,
  setAutoRefresh,
  focusCurrentFlow,
  setFocusCurrentFlow,
}) => {
  const messages = useMessages();
  return (
    <>
      <ToggleButton
        icon={IconChevronUp}
        label=""
        active={showUpstream}
        onToggle={() => setShowUpstream(!showUpstream)}
        tooltip={messages.format(
          showUpstream
            ? LocalizedMessageKey.buildFlowHideUpstream
            : LocalizedMessageKey.buildFlowShowUpstream,
        )}
      />
      <ToggleButton
        icon={IconChevronDown}
        label=""
        active={showDownstream}
        onToggle={() => setShowDownstream(!showDownstream)}
        tooltip={messages.format(
          showDownstream
            ? LocalizedMessageKey.buildFlowHideDownstream
            : LocalizedMessageKey.buildFlowShowDownstream,
        )}
      />
      <ToggleButton
        icon={IconLocate}
        label=""
        active={focusCurrentFlow}
        onToggle={() => setFocusCurrentFlow(!focusCurrentFlow)}
        tooltip={messages.format(
          focusCurrentFlow
            ? LocalizedMessageKey.buildFlowShowFullGraph
            : LocalizedMessageKey.buildFlowFocusFlow,
        )}
      />
      <ToggleButton
        icon={IconBarChart}
        label=""
        active={showBuildHistory}
        onToggle={() => setShowBuildHistory(!showBuildHistory)}
        tooltip={messages.format(
          showBuildHistory
            ? LocalizedMessageKey.buildFlowHideHistory
            : LocalizedMessageKey.buildFlowShowHistory,
        )}
      />
      <ToggleButton
        icon={IconRefreshCircle}
        label=""
        active={autoRefresh}
        onToggle={() => setAutoRefresh(!autoRefresh)}
        tooltip={messages.format(
          autoRefresh
            ? LocalizedMessageKey.buildFlowDisableAutoRefresh
            : LocalizedMessageKey.buildFlowEnableAutoRefresh,
        )}
      />
    </>
  );
};

/** Secondary toggles: behind overflow menu */
export const OverflowMenu: FunctionComponent<
  Pick<
    ToggleControlsProps,
    | "layoutDirection"
    | "setLayoutDirection"
    | "showDuration"
    | "setShowDuration"
    | "showBuildNumber"
    | "setShowBuildNumber"
    | "showFullNames"
    | "setShowFullNames"
    | "showDescription"
    | "setShowDescription"
    | "flattenGraph"
    | "setFlattenGraph"
  >
> = ({
  layoutDirection,
  setLayoutDirection,
  showDuration,
  setShowDuration,
  showBuildNumber,
  setShowBuildNumber,
  showFullNames,
  setShowFullNames,
  showDescription,
  setShowDescription,
  flattenGraph,
  setFlattenGraph,
}) => {
  const messages = useMessages();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Tippy
      visible={menuOpen}
      onClickOutside={() => setMenuOpen(false)}
      {...DefaultDropdownProps}
      placement="auto-start"
      content={
        <div
          className="pgv-build-flow__overflow-menu"
          role="menu"
          aria-label={messages.format(
            LocalizedMessageKey.buildFlowDisplayOptions,
          )}
        >
          <ToggleButton
            icon={IconTime}
            label={messages.format(LocalizedMessageKey.buildFlowShowDuration)}
            active={showDuration}
            onToggle={() => setShowDuration(!showDuration)}
          />
          <ToggleButton
            icon={IconPricetag}
            label={messages.format(
              LocalizedMessageKey.buildFlowShowBuildNumber,
            )}
            active={showBuildNumber}
            onToggle={() => setShowBuildNumber(!showBuildNumber)}
          />
          <ToggleButton
            icon={IconTrailSign}
            label={messages.format(LocalizedMessageKey.buildFlowShowFullNames)}
            active={showFullNames}
            onToggle={() => setShowFullNames(!showFullNames)}
          />
          <ToggleButton
            icon={IconDocumentText}
            label={messages.format(
              LocalizedMessageKey.buildFlowShowDescription,
            )}
            active={showDescription}
            onToggle={() => setShowDescription(!showDescription)}
          />
          <button
            className="jenkins-button jenkins-button--tertiary"
            onClick={() =>
              setLayoutDirection(layoutDirection === "LTR" ? "TTB" : "LTR")
            }
            role="menuitem"
          >
            <span
              style={{
                display: "contents",
                transform:
                  layoutDirection === "TTB" ? "rotate(90deg)" : undefined,
              }}
            >
              {IconSwapHorizontal}
            </span>
            {messages.format(
              layoutDirection === "LTR"
                ? LocalizedMessageKey.buildFlowTopToBottom
                : LocalizedMessageKey.buildFlowLeftToRight,
            )}
          </button>
          <ToggleButton
            icon={flattenGraph ? IconGitMerge : IconGrid}
            label={messages.format(
              flattenGraph
                ? LocalizedMessageKey.buildFlowShowGraph
                : LocalizedMessageKey.buildFlowFlattenToGrid,
            )}
            active={flattenGraph}
            onToggle={() => setFlattenGraph(!flattenGraph)}
          />
        </div>
      }
    >
      <button
        className="jenkins-button jenkins-button--tertiary"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={messages.format(LocalizedMessageKey.buildFlowMoreOptions)}
        aria-expanded={menuOpen}
      >
        {IconEllipsisVertical}
      </button>
    </Tippy>
  );
};
