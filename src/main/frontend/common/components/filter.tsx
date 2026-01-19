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
  const {
    visibleStatuses,
    toggleStatus,
    resetStatuses,
    allVisible,
    showHiddenSteps,
    setShowHiddenSteps,
  } = useFilter();

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

            <div className="jenkins-dropdown__separator" />

            <button
              className={classNames(
                "jenkins-dropdown__item",
                "pgv-filter-button",
                {
                  "pgv-filter-button--unchecked": !showHiddenSteps,
                },
              )}
              onClick={() => setShowHiddenSteps(!showHiddenSteps)}
            >
              <div className="jenkins-dropdown__item__icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  style={{ width: "1.375rem", height: "1.375rem" }}
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="32"
                    d="M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 00-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 000-17.47C428.89 172.28 347.8 112 255.66 112z"
                  />
                  <circle
                    cx="256"
                    cy="256"
                    r="80"
                    fill="none"
                    stroke="currentColor"
                    strokeMiterlimit="10"
                    strokeWidth="32"
                  />
                  {!showHiddenSteps && (
                    <line
                      x1="64"
                      y1="64"
                      x2="448"
                      y2="448"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="32"
                    />
                  )}
                </svg>
              </div>
              Show hidden steps
            </button>
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
