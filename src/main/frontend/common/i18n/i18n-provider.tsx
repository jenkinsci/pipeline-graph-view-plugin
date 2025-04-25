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
  ResourceBundleName,
  Translations,
} from "./translations.js";

export const I18NContext: Context<Translations> = createContext(
  new Translations({}),
);

interface I18NProviderProps {
  children: ReactNode;
  bundles: ResourceBundleName[];
  locale: string;
}

export const I18NProvider: FunctionComponent<I18NProviderProps> = ({
  children,
  bundles,
  locale,
}) => {
  const [translations, setTranslations] = useState<Translations>(
    defaultTranslations(locale),
  );

  useEffect(() => {
    const fetchTranslations = async () => {
      const translations = await getTranslations(locale, bundles);
      setTranslations(translations);
    };
    fetchTranslations();
  }, []);

  return (
    <I18NContext.Provider value={translations}>{children}</I18NContext.Provider>
  );
};
