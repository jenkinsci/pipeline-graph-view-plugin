import Tippy from "@tippyjs/react";
import React, { useState } from "react";
import Tooltip from "./tooltip";
import StatusIcon from "./status-icon";
import { Result } from "../../pipeline-graph-view/pipeline-graph/main";
import { classNames } from "../utils/classnames";
import "./filter.scss";
import { useFilter } from "../../pipeline-console-view/pipeline-console/main/providers/filter-provider";

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
        theme="dropdown"
        duration={250}
        touch={true}
        visible={visible}
        animation="dropdown"
        onClickOutside={hide}
        interactive={true}
        appendTo={document.body}
        offset={[0, -1]}
        placement="bottom"
        arrow={false}
        content={
          <div className="jenkins-dropdown">
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
