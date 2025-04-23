import { choiceFormatter } from "./choice-formatter";

describe("Choice formatter", () => {
  const { formatter: choice } = choiceFormatter;

  it("should select right option", () => {
    // Base cases
    expect(choice("0", "en", "0#first|1#second|1<third")).toEqual("first");
    expect(choice("1", "en", "0#first|1#second|1<third")).toEqual("second");
    expect(choice("2", "en", "0#first|1#second|1<third")).toEqual("third");

    // No match
    expect(choice("-1", "en", "0#first|1#second|1<third")).toEqual("first");

    // Floating-point numbers
    expect(choice("1.5", "en", "1#first|1.5#second|2#third")).toEqual("second");

    // Invalid input
    expect(choice("abc", "en", "1#first|2#second")).toEqual("first");

    // Boundary conditions
    expect(choice("1", "en", "1#first|1<second")).toEqual("first");
    expect(choice("1.0000000001", "en", "1#one|1<second")).toEqual("second");

    // Empty argument
    expect(() => choice("1", "en", "")).toThrow();
  });
});
