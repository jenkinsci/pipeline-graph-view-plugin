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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <rect
          x="32"
          y="96"
          width="448"
          height="272"
          rx="32.14"
          ry="32.14"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="32"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeMiterlimit="10"
          strokeWidth="32"
          d="M128 416h256"
        />
      </svg>
      {agentName}
    </a>
  );
};

export default StageNodeLink;
