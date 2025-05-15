import "./filter.scss";

import Tippy from "@tippyjs/react";
import { useState } from "react";

import { useFilter } from "../../pipeline-console-view/pipeline-console/main/providers/filter-provider.tsx";
import { Result } from "../../pipeline-graph-view/pipeline-graph/main/PipelineGraphModel.tsx";
import { classNames } from "../utils/classnames.ts";
import { DefaultDropdownProps } from "./dropdown.tsx";
import StatusIcon from "./status-icon.tsx";
import Tooltip from "./tooltip.tsx";

export default function Filter({ disabled }: FilterProps) {
  const [visible, setVisible] = useState(false);
  const { visibleStatuses, toggleStatus, resetStatuses, allVisible } =
    useFilter();

  const statuses = [
    {
      key: "running",
      text: "Running",
      status: Result.running,
    },
    {
      key: "success",
      text: "Successful",
      status: Result.success,
    },
    {
      key: "failure",
      text: "Failed",
      status: Result.failure,
    },
    {
      key: "unstable",
      text: "Unstable",
      status: Result.unstable,
    },
    {
      key: "aborted",
      text: "Aborted",
      status: Result.aborted,
    },
    {
      key: "skipped",
      text: "Skipped",
      status: Result.skipped,
    },
    {
      key: "not_built",
      text: "Not built",
      status: Result.not_built,
    },
  ];

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return (
    <Tooltip content={"Filter"}>
      <Tippy
        {...DefaultDropdownProps}
        visible={visible}
        onClickOutside={hide}
        placement="bottom"
        appendTo={document.body}
        offset={[0, -1]}
        content={
          <div className="jenkins-dropdown" data-testid="filter-dropdown">
            <div className="jenkins-dropdown__heading">
              Filter
              {!allVisible && (
                <button
                  className={
                    "jenkins-button jenkins-button--tertiary jenkins-!-accent-color pgv-reset-button"
                  }
                  onClick={resetStatuses}
                >
                  Reset
                </button>
              )}
            </div>
            {statuses.map((item, index) => (
              <button
                key={index}
                className={classNames(
                  "jenkins-dropdown__item",
                  "pgv-filter-button",
                  {
                    "pgv-filter-button--unchecked": !visibleStatuses.includes(
                      item.status,
                    ),
                  },
                )}
                onClick={() => toggleStatus(item.status)}
              >
                <div className="jenkins-dropdown__item__icon">
                  <StatusIcon
                    status={item.status}
                    skeleton={!visibleStatuses.includes(item.status)}
                    percentage={0}
                  />
                </div>
                {item.text}
              </button>
            ))}
          </div>
        }
      >
        <button
          className={classNames(
            "jenkins-button",
            {
              "jenkins-button--tertiary": allVisible,
            },
            {
              "jenkins-!-accent-color": !allVisible,
            },
          )}
          type="button"
          disabled={disabled}
          onClick={visible ? hide : show}
          aria-label={"Filter"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={!allVisible ? 42 : 36}
              d="M32 144h448M112 256h288M208 368h96"
            />
          </svg>
        </button>
      </Tippy>
    </Tooltip>
  );
}

interface FilterProps {
  disabled?: boolean;
}
