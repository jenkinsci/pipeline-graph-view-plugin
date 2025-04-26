import { convertLabelToTooltip } from "./convertLabelToTooltip.tsx";

describe("convertLabelToTooltip", () => {
  it("converts matrix labels to a tooltip", () => {
    const result = convertLabelToTooltip(
      "Matrix - PKR_VAR_architecture = 'amd64', another = 'amd64', PKR_VAR_agent = 'ubuntu-20', PKR_VAR_image_type = 'amazon-ebs'",
    );

    const expectedResult = [
      {
        key: "PKR_VAR_architecture",
        value: "amd64",
      },
      {
        key: "another",
        value: "amd64",
      },
      {
        key: "PKR_VAR_agent",
        value: "ubuntu-20",
      },
      {
        key: "PKR_VAR_image_type",
        value: "amazon-ebs",
      },
    ];

    expect(result).toEqual(expectedResult);
  });

  it("leaves branches alone", () => {
    const result = convertLabelToTooltip("Branch C");

    expect(result).toEqual("Branch C");
  });
});
