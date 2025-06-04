import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface UserPermissions {
  canConfigure: boolean;
}

type UserPermissionsProviderProps = {
  children: ReactNode;
  proxy?: ProxyProps;
};

type ProxyProps = {
  configureProxy?: string;
};

const UserPermissionsContext = createContext<UserPermissions>({
  canConfigure: false,
});

type StaplerResponse = {
  responseJSON?: boolean;
};

export const UserPermissionsProvider = ({
  children,
  proxy,
}: UserPermissionsProviderProps) => {
  const [canConfigure, setCanConfigure] = useState(false);

  proxy = proxy ?? {};

  if (proxy.configureProxy) {
    // The compiler complains if we don't capture to a local variable,
    // it cannot guarantee that `proxy.configureProxy` won't change to undefined
    const { configureProxy } = proxy;
    useEffect(() => {
      (window as any)[configureProxy]?.hasConfigurePermission(
        (response: StaplerResponse) => {
          setCanConfigure(response?.responseJSON || false);
        },
      );
    }, []);
  }

  return (
    <UserPermissionsContext value={{ canConfigure }}>
      {children}
    </UserPermissionsContext>
  );
};

export const useUserPermissions = (): UserPermissions =>
  useContext(UserPermissionsContext);
