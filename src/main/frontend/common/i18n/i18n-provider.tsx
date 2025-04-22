import React, {
  Context,
  createContext,
  FunctionComponent,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { getTranslations, Translations } from "./translations";

export const I18NContext: Context<Translations> = createContext(
  new Translations({}),
);

interface I18NProviderProps {
  children: ReactNode;
}

export const I18NProvider: FunctionComponent<I18NProviderProps> = ({
  children,
}) => {
  const [translations, setTranslations] = useState<Translations | null>(null);

  useEffect(() => {
    const fetchTranslations = async () => {
      const translations = await getTranslations();
      setTranslations(translations);
    };
    fetchTranslations();
  }, []);

  // what to do whilst waiting for the translations?
  if (!translations) {
    return <></>;
  }

  return (
    <I18NContext.Provider value={translations}>{children}</I18NContext.Provider>
  );
};
