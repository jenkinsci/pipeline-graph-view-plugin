import "./settings-button.scss";

import Checkbox from "../../../common/components/checkbox.tsx";
import Dropdown from "../../../common/components/dropdown.tsx";
import DropdownPortal from "../../../common/components/dropdown-portal.tsx";
import { SETTINGS } from "../../../common/components/symbols.tsx";
import {
  LocalizedMessageKey,
  useMessages,
} from "../../../common/i18n/index.ts";
import { useUserPreferences } from "../../../common/user/user-preferences-provider.tsx";

type SettingsButtonProps = {
  buttonPortal: HTMLElement;
};

export default function SettingsButton({ buttonPortal }: SettingsButtonProps) {
  const messages = useMessages();
  const {
    showNames,
    setShowNames,
    showDurations,
    setShowDurations,
    showBuildFlow,
    setShowBuildFlow,
  } = useUserPreferences();

  return (
    <>
      <DropdownPortal container={buttonPortal}>
        <Dropdown
          tooltip={messages.format(LocalizedMessageKey.settings)}
          icon={SETTINGS}
          className={"jenkins-card__reveal"}
          items={[
            <div className={"pgv-dropdown-checkboxes"} key={"settings-options"}>
              <Checkbox
                label={messages.format(LocalizedMessageKey.showNames)}
                value={showNames}
                setValue={setShowNames}
              />
              <Checkbox
                label={messages.format(LocalizedMessageKey.showDuration)}
                value={showDurations}
                setValue={setShowDurations}
              />
              <Checkbox
                label={messages.format(LocalizedMessageKey.showBuildFlow)}
                value={showBuildFlow}
                setValue={setShowBuildFlow}
              />
            </div>,
          ]}
        />
      </DropdownPortal>
    </>
  );
}
