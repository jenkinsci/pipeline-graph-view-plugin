import Tooltip from "../../../common/components/tooltip.tsx";
import { LocalizedMessageKey, useMessages } from "../../../common/i18n";
import {
  MainViewVisibility,
  useLayoutPreferences,
} from "./providers/user-preference-provider.tsx";

export default function StagesToggle() {
  const { mainViewVisibility, setMainViewVisibility, isMobile } =
    useLayoutPreferences();
  const messages = useMessages();

  // With the graph hidden, hiding the stages too would leave neither view.
  if (isMobile || mainViewVisibility === MainViewVisibility.STAGES_ONLY) {
    return null;
  }

  const showStages = mainViewVisibility === MainViewVisibility.BOTH;

  const label = messages.format(
    showStages
      ? LocalizedMessageKey.hideStages
      : LocalizedMessageKey.showStages,
  );

  return (
    <Tooltip content={label}>
      <button
        className="jenkins-button jenkins-button--tertiary pgv-stages-toggle"
        aria-label={label}
        onClick={() =>
          setMainViewVisibility(
            showStages
              ? MainViewVisibility.GRAPH_ONLY
              : MainViewVisibility.BOTH,
          )
        }
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <g fill="none" stroke="currentColor" strokeWidth="32">
            <rect
              x="48"
              y="86"
              width="416"
              height="340"
              rx="70"
              strokeLinejoin="round"
            />
            <line x1="125" y1="170" x2="125" y2="342" strokeLinecap="round" />
          </g>
        </svg>
      </button>
    </Tooltip>
  );
}
