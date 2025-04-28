import React, {
  Context,
  createContext,
  FunctionComponent,
  ReactNode,
  useEffect,
  useState,
} from "react";
import {
  defaultMessages,
  getMessages,
  ResourceBundleName,
  Messages,
} from "./messages.ts";

export const I18NContext: Context<Messages> = createContext(
  defaultMessages("en"),
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
  const [messages, setMessages] = useState<Messages>(defaultMessages(locale));

  useEffect(() => {
    const fetchMessages = async () => {
      const found = await getMessages(locale, bundles);
      setMessages(found);
    };
    fetchMessages();
  }, []);

  return (
    <I18NContext.Provider value={messages}>{children}</I18NContext.Provider>
  );
};
