import { Context, createContext, FunctionComponent, ReactNode } from "react";

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
