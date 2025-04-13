import React from "react";

export interface StageNodeLinkProps {
  agent: string;
}

function getAgentUrl(name: string) {
  // Wrap built-in in brackets
  const id = name == "built-in" ? "(built-in)" : name;
  const rootPath = document.head.dataset.rooturl;
  return `${rootPath}/computer/${id}/`;
}

const StageNodeLink = ({ agent }: StageNodeLinkProps) => {
  const agentName = agent == "built-in" ? "Jenkins" : agent;
  const href = getAgentUrl(agent);
  return (
    <a href={href}>
      <svg
        width="512px"
        height="512px"
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          stroke="none"
          strokeWidth="1"
          fill="none"
          fillRule="evenodd"
          strokeLinejoin="round"
        >
          <g
            transform="translate(32.000000, 64.000000)"
            stroke="currentColor"
            strokeWidth="32"
          >
            <rect x="0" y="0" width="448" height="320" rx="32"></rect>
            <polygon
              strokeLinecap="round"
              fillRule="nonzero"
              points="272 384 264 320 184 320 176 384"
            ></polygon>
            <line
              x1="336"
              y1="384"
              x2="112"
              y2="384"
              strokeLinecap="round"
            ></line>
          </g>
        </g>
      </svg>
      {agentName}
    </a>
  );
};

export default StageNodeLink;
