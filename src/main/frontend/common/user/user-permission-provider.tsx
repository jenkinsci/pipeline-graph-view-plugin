import { createContext, ReactNode, useContext } from "react";

interface UserPermissions {
  canConfigure: boolean;
}

const UserPermissionsContext = createContext<UserPermissions>({
  canConfigure: false,
});

export const UserPermissionsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const element = document.querySelector(
    "[data-module='permissions']",
  ) as HTMLTemplateElement;
  const data = element?.dataset ?? {};

  const perms: UserPermissions = {
    canConfigure: data.permissionConfigure === "true",
  };

  return (
    <UserPermissionsContext value={perms}>{children}</UserPermissionsContext>
  );
};

export const useUserPermissions = (): UserPermissions =>
  useContext(UserPermissionsContext);
