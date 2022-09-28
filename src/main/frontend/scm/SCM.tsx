import { FunctionComponent } from "react";
import * as React from "react";

const Component: FunctionComponent = () => {
  const value = {
    repoShortName: "timja-org/junit-attachments-test",
    repoLink: "https://github.com/timja-org/junit-attachments-test",
    branchName: "master",
    branchLink:
      "https://github.com/timja-org/junit-attachments-test/tree/master",
    commit: "3759ad3",
    commitLink:
      "https://github.com/timja-org/junit-attachments-test/commit/3759ad357061a3aa7761878d365ae2c936c292a8",
  };

  return (
    <div>
      <div>
        <span>
          <a href={value.repoLink}>{value.repoShortName}</a>
        </span>
      </div>
      <div>
        <span>
          <a href={value.branchLink}>{value.branchName}</a>
        </span>
      </div>
      <div>
        <span>
          <a href={value.commitLink}>{value.commit}</a>
        </span>
      </div>
    </div>
  );
};

export default Component;
