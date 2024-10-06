import React from "react";
import ReactDomServer from "react-dom/server";

import { Tooltip } from "react-tippy";

type MatrixValue = {
  key: string;
  value: string;
};

declare module "react-tippy" {
  export interface TooltipProps {
    children?: React.ReactNode;
  }
}

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
  children: React.ReactNode;
};

export function TooltipLabel(props: TooltipLabelProps) {
  const result = convertLabelToTooltip(props.content);

  if (typeof result === "string") {
    return (
      <>
        <Tooltip
          title={result as string}
          interactive={true}
          followCursor={true}
        >
          {props.children}
        </Tooltip>
      </>
    );
  }

  const table = ReactDomServer.renderToString(
    <table>
      {(result as MatrixValue[]).map((val, key) => {
        return (
          <tr key={key}>
            <td>{val.key}</td>
            <td>{val.value}</td>
          </tr>
        );
      })}
    </table>,
  );

  return (
    <>
      <Tooltip title={table} interactive={true} followCursor={true}>
        {props.children}
      </Tooltip>
    </>
  );
}
