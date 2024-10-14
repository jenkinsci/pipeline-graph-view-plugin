import React from "react";

export interface StageNodeLinkProps {
    agent: string;
}

const StageNodeLink = ({agent}: StageNodeLinkProps) => {
    const agentName = agent == "built-in" ? "Jenkins" : agent;
    const href = `../../../../computer/${agent == "built-in" ? "(built-in)" : agent }/`;
    return <>
        Running on <a href={href}>{agentName}</a>
    </>
};

export default StageNodeLink;
