import Checkbox from "../../../common/components/checkbox.tsx";
import Dropdown from "../../../common/components/dropdown.tsx";
import DropdownPortal from "../../../common/components/dropdown-portal.tsx";
import { SETTINGS } from "../../../common/components/symbols.tsx";
import { LocalizedMessageKey, useMessages } from "../../../common/i18n";
import { useUserPermissions } from "../../../common/user/user-permission-provider.tsx";
import { useUserPreferences } from "../../../common/user/user-preferences-provider.tsx";

interface OverflowDropdownProps {
  buttonPortal: HTMLElement;
}

export default function OverflowDropdown({
  buttonPortal,
}: OverflowDropdownProps) {
  const { showNames, setShowNames, showDurations, setShowDurations } =
    useUserPreferences();
  const { canConfigure } = useUserPermissions();
  const messages = useMessages();
  return (
    <DropdownPortal container={buttonPortal}>
      <Dropdown
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
          </div>,
          canConfigure ? "separator" : <></>,
          canConfigure ? (
            {
              text: "Configure",
              icon: SETTINGS,
              href: `../configure`,
            }
          ) : (
            <></>
          ),
        ]}
      />
    </DropdownPortal>
  );
}
