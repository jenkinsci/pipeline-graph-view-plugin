import React, {
  Context,
  createContext,
  FunctionComponent,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { getTranslations, Translations, messageFormat } from "./translations";
import MessageFormat from "@messageformat/core";
import { choice } from "./choice-formatter";

export const I18NContext: Context<Translations> = createContext(
  new Translations({}),
);

interface I18NProviderProps {
  children: ReactNode;
}


function defaultTranslations() {
  const fmt = messageFormat("en")
  const messages = {
    "Util.millisecond": "{0} ms",
    "Util.second":"{0} sec",
    "Util.minute":"{0} min",
    "Util.hour"  :"{0} hr",
    "Util.day"   :"{0} {0,choice,0#days|1#day|1<days}",
    "Util.month" :"{0} mo",
    "Util.year"  :"{0} yr",
  }

  return new Translations(Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [
      key,
      fmt.compile(value),
    ]),
  ))
}

export const I18NProvider: FunctionComponent<I18NProviderProps> = ({
  children,
}) => {
  const locale = document.querySelector('div[data-user-locale]')?.getAttribute('data-user-locale') ?? 'en';
  const [translations, setTranslations] = useState<Translations>(defaultTranslations());

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
