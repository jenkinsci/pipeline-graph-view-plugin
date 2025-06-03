import "./settings-button.scss";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Dropdown from "../../../common/components/dropdown.tsx";
import Checkbox from "../../../common/components/checkbox.tsx";
import {
  LocalizedMessageKey,
  useMessages,
} from "../../../common/i18n/index.ts";
import { useUserPreferences } from "../../../common/user/user-preferences-provider.tsx";
import { SETTINGS } from "../../../common/components/symbols.tsx";

type SettingsButtonProps = {
  buttonPortal: HTMLElement | null;
};

export default function SettingsButton({ buttonPortal }: SettingsButtonProps) {
  const [ready, setReady] = useState(false);
  if (!buttonPortal) {
    console.warn(
      "Could not find settings button element to generate a portal.",
    );
    return <></>;
  }

  useEffect(() => {
    if (buttonPortal) {
      buttonPortal.innerHTML = "";
      setReady(true);
    }
  }, []);

  const messages = useMessages();
  const { showNames, setShowNames, showDurations, setShowDurations } =
    useUserPreferences();

  return (
    <>
      {ready &&
        createPortal(
          <Dropdown
            tooltip={messages.format(LocalizedMessageKey.settings)}
            icon={SETTINGS}
            className={"jenkins-card__reveal"}
            items={[
              <div className={"pgv-dropdown-checkboxes"}>
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
              </div>,
            ]}
          />,
          buttonPortal,
        )}
    </>
  );
}
