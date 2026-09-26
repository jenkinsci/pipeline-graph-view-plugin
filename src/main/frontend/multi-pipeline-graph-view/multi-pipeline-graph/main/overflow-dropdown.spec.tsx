import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserPreferencesProvider } from "../../../common/user/user-preferences-provider";
import OverflowDropdown from "./overfow-dropdown.tsx";

vi.mock("../../../common/user/user-permission-provider.tsx", () => ({
  useUserPermissions: () => ({ canConfigure: true }),
}));

describe("OverflowDropdown", () => {
  const createButtonPortal = () => {
    const div = document.createElement("div");
    div.setAttribute("id", "overflow-portal");
    document.body.appendChild(div);
    return div;
  };

  const renderComponent = (buttonPortal: HTMLElement) => {
    return render(
      <UserPreferencesProvider>
        <OverflowDropdown buttonPortal={buttonPortal} />
      </UserPreferencesProvider>,
    );
  };

  it("should render dropdown button", () => {
    const portal = createButtonPortal();
    renderComponent(portal);
    expect(screen.getByText("More actions")).toBeTruthy();
  });

  it("should show all checkboxes when opened", () => {
    const portal = createButtonPortal();
    renderComponent(portal);

    fireEvent.click(screen.getByText("More actions"));

    expect(screen.getByLabelText("Show stage names")).toBeInTheDocument();
    expect(screen.getByLabelText("Show stage duration")).toBeInTheDocument();
  });

  it("should show Configure link when user can configure", () => {
    const portal = createButtonPortal();
    renderComponent(portal);

    fireEvent.click(screen.getByText("More actions"));
    expect(screen.getByText("Configure")).toBeInTheDocument();
  });
});
