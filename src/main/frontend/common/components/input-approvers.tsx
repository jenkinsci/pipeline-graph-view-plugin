import { LocalizedMessageKey, useLocale, useMessages } from "../i18n/index.ts";
import { InputStep } from "../RestClient.tsx";

/**
 * Who can approve an input, when its submitter limits it to particular users or groups. Any one
 * of them can approve it, so they're listed as alternatives, e.g. "Alice or release-team".
 */
export default function InputApprovers({
  input,
  className,
}: {
  input: InputStep;
  className?: string;
}) {
  const messages = useMessages();
  const locale = useLocale();

  if (!input.approvers?.length) {
    return null;
  }

  const approvers = new Intl.ListFormat(locale, {
    type: "disjunction",
  }).format(input.approvers);

  return (
    <div className={className}>
      {messages.format(LocalizedMessageKey.inputApprovers, { "0": approvers })}
    </div>
  );
}
