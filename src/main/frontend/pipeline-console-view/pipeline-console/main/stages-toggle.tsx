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
          <rect
            x="48"
            y="80"
            width="416"
            height="352"
            rx="48"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="32"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="32"
            d="M192 80v352"
          />
          {showStages && (
            <path
              fill="currentColor"
              d="M80 112h112v288H96a16 16 0 01-16-16z"
              opacity="0.3"
            />
          )}
        </svg>
      </button>
    </Tooltip>
  );
}
