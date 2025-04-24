import React, {
  Context,
  createContext,
  FunctionComponent,
  ReactNode,
  useEffect,
  useState,
} from "react";
import {
  defaultTranslations,
  getTranslations,
  Translations,
} from "./translations";

export const I18NContext: Context<Translations> = createContext(
  new Translations({}),
);

interface I18NProviderProps {
  children: ReactNode;
}

export const I18NProvider: FunctionComponent<I18NProviderProps> = ({
  children,
}) => {
  const locale = document.getElementById("root")?.dataset.userLocale ?? "en";
  const [translations, setTranslations] = useState<Translations>(
    defaultTranslations(locale),
  );

  useEffect(() => {
    const fetchTranslations = async () => {
      const translations = await getTranslations(locale);
      setTranslations(translations);
    };
    fetchTranslations();
  }, []);

  return (
    <I18NContext.Provider value={translations}>{children}</I18NContext.Provider>
  );
};
