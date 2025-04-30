import { ReactElement } from "react";

import Tooltip from "../../../../common/components/tooltip.tsx";

type MatrixValue = {
  key: string;
  value: string;
};

export function convertLabelToTooltip(content: string): string | MatrixValue[] {
  if (content.startsWith("Matrix -")) {
    return content
      .replace("Matrix - ", "")
      .split(",")
      .map((element) => {
        const result = element.split("=");
        return {
          key: result[0].trim(),
          value: result[1].trim().replace(/'/g, ""),
        };
      });
  }
  return content;
}

export type TooltipLabelProps = {
  content: string;
  children: ReactElement;
};

export function TooltipLabel(props: TooltipLabelProps) {
  const result = convertLabelToTooltip(props.content);

  if (typeof result === "string") {
    return (
      <>
        <Tooltip content={result as string} interactive followCursor>
          {props.children}
        </Tooltip>
      </>
    );
  }

  const table = (
    <table>
      {(result as MatrixValue[]).map((val, key) => {
        return (
          <tr key={key}>
            <td>{val.key}</td>
            <td>{val.value}</td>
          </tr>
        );
      })}
    </table>
  );

  return (
    <>
      <Tooltip content={table} interactive appendTo={document.body}>
        {props.children}
      </Tooltip>
    </>
  );
}
