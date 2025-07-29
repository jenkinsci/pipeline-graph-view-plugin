import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserPreferencesProvider } from "../../../common/user/user-preferences-provider";
import SettingsButton from "./settings-button.tsx";

describe("SettingsButton", () => {
  const createButtonPortal = () => {
    const div = document.createElement("div");
    div.setAttribute("id", "button-portal");
    document.body.appendChild(div);
    return div;
  };

  const renderComponent = (buttonPortal: HTMLElement) => {
    return render(
      <UserPreferencesProvider>
        <SettingsButton buttonPortal={buttonPortal} />
      </UserPreferencesProvider>,
    );
  };

  it("should render settings button in portal", () => {
    const buttonPortal = createButtonPortal();
    renderComponent(buttonPortal);

    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("should toggle dropdown when clicking settings button", async () => {
    const buttonPortal = createButtonPortal();
    renderComponent(buttonPortal);

    const settingsButton = screen.getByText("Settings");
    fireEvent.click(settingsButton!);

    expect(screen.getByText("Show stage names")).toBeInTheDocument();
    expect(screen.getByText("Show stage duration")).toBeInTheDocument();
  });

  it("should update preferences when toggling checkboxes", () => {
    const buttonPortal = createButtonPortal();
    renderComponent(buttonPortal);

    const settingsButton = screen.getByText("Settings");
    fireEvent.click(settingsButton);

    const showNamesCheckbox = screen.getByLabelText("Show stage names");
    fireEvent.click(showNamesCheckbox);
    expect(showNamesCheckbox).toBeChecked();

    const showDurationsCheckbox = screen.getByLabelText("Show stage duration");
    fireEvent.click(showDurationsCheckbox);
    expect(showDurationsCheckbox).toBeChecked();
  });
});
