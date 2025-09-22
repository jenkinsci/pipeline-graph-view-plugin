import {
  Context,
  createContext,
  FunctionComponent,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { DEFAULT_LOCALE, useLocale } from "./locale-provider.tsx";
import {
  defaultMessages,
  getMessages,
  Messages,
  ResourceBundleName,
} from "./messages.ts";

export const I18NContext: Context<Messages> = createContext(
  defaultMessages(DEFAULT_LOCALE),
);

interface I18NProviderProps {
  children: ReactNode;
  bundles: ResourceBundleName[];
}

export const I18NProvider: FunctionComponent<I18NProviderProps> = ({
  children,
  bundles,
}) => {
  const locale = useLocale();

  const [messages, setMessages] = useState<Messages>(defaultMessages(locale));

  useEffect(() => {
    const fetchMessages = async () => {
      const found = await getMessages(locale, bundles);
      setMessages(found);
    };
    fetchMessages();
  }, [locale, bundles]);

  return (
    <I18NContext.Provider value={messages}>{children}</I18NContext.Provider>
  );
};

export function useMessages(): Messages {
  const messages = useContext(I18NContext);
  if (!messages) {
    throw new Error("useI18N must be used within an I18NProvider");
  }
  return messages;
}
