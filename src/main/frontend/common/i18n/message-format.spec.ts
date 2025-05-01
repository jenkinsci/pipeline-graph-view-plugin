import { MessageFormat } from "./message-format.ts";

describe("Message Format", () => {
  it("should render for no variable substitution", () => {
    const formatted = MessageFormat("Hello world!", "en").format();

    expect(formatted).toEqual("Hello world!");
  });

  describe("Variable chunk", () => {
    it("should render basic variable substitution", () => {
      const formatted = MessageFormat("Hello {somewhere}!", "en").format({
        somewhere: "world",
      });

      expect(formatted).toEqual("Hello world!");
    });

    it("should render multiple variable substitution", () => {
      const formatted = MessageFormat("{0} {1}{2}", "en").format({
        0: "Hello",
        1: "world",
        2: "!",
      });

      expect(formatted).toEqual("Hello world!");
    });

    it("should apply locale formatting to numbers", () => {
      const formatted = MessageFormat("{0}", "de-DE").format({
        0: 123123.123123,
      });

      // java equivalent
      // new MessageFormat("{0}", Locale.GERMAN).format(new Object[]{123123.123123})
      expect(formatted).toEqual("123.123,123");
    });
  });

  it("should render for a complex pattern", () => {
    const formatted = MessageFormat(
      "{0} {1,choice,0#world|1#team|1<moto}{2} {3}",
      "en",
    ).format({ 0: "Hello", 1: 0, 2: "!", 3: "🚀" });

    expect(formatted).toEqual("Hello world! 🚀");
  });

  describe("Choice subformat", () => {
    const messageFormat = MessageFormat(
      "Hello {0,choice,0#world|1#team|1<moto}!",
      "en",
    );

    it("should choose appropriate choice", () => {
      expect(messageFormat.format({ 0: 0 })).toEqual("Hello world!");
      expect(messageFormat.format({ 0: 1 })).toEqual("Hello team!");
      expect(messageFormat.format({ 0: 2 })).toEqual("Hello moto!");
    });

    it("should use the first for no match found", () => {
      expect(messageFormat.format({ 0: -1 })).toEqual("Hello world!");
    });

    it("should handle floating point numbers", () => {
      expect(messageFormat.format({ 0: 1.5 })).toEqual("Hello moto!");
    });

    it("should handle invalid input", () => {
      expect(() => messageFormat.format({ 0: "ahhh" })).toThrow(
        "Argument 0 'ahhh' needs to be a number",
      );
    });

    it("should handle empty arg", () => {
      expect(() => messageFormat.format({ 0: "" })).toThrow(
        "Argument 0 '' needs to be a number",
      );
    });
  });
});
