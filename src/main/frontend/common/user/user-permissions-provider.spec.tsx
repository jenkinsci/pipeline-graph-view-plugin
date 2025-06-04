import { render, screen } from "@testing-library/react";
import { describe } from "vitest";

import {
  UserPermissionsProvider,
  useUserPermissions,
} from "./user-permission-provider";

describe("UserPermissionsProvider", () => {
  const PermissionsDisplay = () => {
    const permissions = useUserPermissions();
    return (
      <>
        {Object.entries(permissions).map(([key, value]) => {
          return (
            <div data-testid={key} key={key}>
              {String(value)}
            </div>
          );
        })}
      </>
    );
  };

  const setupTemplate = (dataset: Record<string, string> = {}) => {
    const template = document.createElement("template");
    dataset.module = "permissions";
    Object.entries(dataset).forEach(([key, value]) => {
      template.dataset[key] = value;
    });
    document.body.appendChild(template);
  };

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("permissions", () => {
    it("should provide default permissions when no data exists", () => {
      render(
        <UserPermissionsProvider>
          <PermissionsDisplay />
        </UserPermissionsProvider>,
      );

      expect(screen.getByTestId("canConfigure")).toHaveTextContent("false");
    });

    it("should read permissions from data element", () => {
      setupTemplate({ permissionConfigure: "true" });

      render(
        <UserPermissionsProvider>
          <PermissionsDisplay />
        </UserPermissionsProvider>,
      );

      expect(screen.getByTestId("canConfigure")).toHaveTextContent("true");
    });

    it("should handle non boolean permissions from data element", () => {
      setupTemplate({ permissionConfigure: "invalid" });

      render(
        <UserPermissionsProvider>
          <PermissionsDisplay />
        </UserPermissionsProvider>,
      );

      expect(screen.getByTestId("canConfigure")).toHaveTextContent("false");
    });

    it("should handle missing dataset gracefully", () => {
      setupTemplate();

      render(
        <UserPermissionsProvider>
          <PermissionsDisplay />
        </UserPermissionsProvider>,
      );

      expect(screen.getByTestId("canConfigure")).toHaveTextContent("false");
    });
  });

  describe("rendering", () => {
    it("should render children", () => {
      render(
        <UserPermissionsProvider>
          <div data-testid="child">Child content</div>
        </UserPermissionsProvider>,
      );

      expect(screen.getByTestId("child")).toHaveTextContent("Child content");
    });
  });
});
