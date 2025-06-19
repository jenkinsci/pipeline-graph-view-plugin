import {
  Context,
  createContext,
  FunctionComponent,
  ReactNode,
  useContext,
} from "react";

export const DEFAULT_LOCALE = "en";
export const LocaleContext: Context<string> = createContext(DEFAULT_LOCALE);

interface LocaleProviderProps {
  children: ReactNode;
  locale: string;
}

export const LocaleProvider: FunctionComponent<LocaleProviderProps> = ({
  children,
  locale,
}) => {
  return (
    <LocaleContext.Provider value={locale ?? DEFAULT_LOCALE}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): string => {
  return useContext(LocaleContext);
};
