import React from "react";

export interface StageNodeLinkProps {
    agent: string;
}

function getAgentUrl(name: string) {
    // Wrap built-in in brackets
    const id = name == "built-in" ? "(built-in)" : name;
    const rootPath = document.head.dataset.rootUrl
    return `${rootPath}/computer/${id}/`;
}

const StageNodeLink = ({agent}: StageNodeLinkProps) => {
    const agentName = agent == "built-in" ? "Jenkins" : agent;
    const href = getAgentUrl(agent);
    return <>
        Running on <a href={href}>{agentName}</a>
    </>
};

export default StageNodeLink;
