jest.mock("../RestClient", () => ({
  getResourceBundle: jest.fn(),
}));

import { getResourceBundle } from "../RestClient";
import {
  getTranslations,
  messageFormat,
  ResourceBundleName,
  Translations,
} from "./translations";

describe("Translations", () => {
  describe("Get translation", () => {
    const fmt = messageFormat("en");

    const translations = new Translations({
      "Property.name": fmt.compile("{arg} world"),
    });

    it("should use known mapped message", () => {
      expect(translations.get("Property.name")({ arg: "hello" })).toEqual(
        "hello world",
      );
    });

    it("should use fallback formatter with unknown property", () => {
      expect(
        translations.get("Unknown.property.name")({ arg: "hello" }),
      ).toEqual("hello");
    });
  });

  describe("Get Translations", () => {
    it("should compile found resource bundle", async () => {
      (getResourceBundle as jest.Mock).mockResolvedValue({
        "A.property": "a value",
        "Another.property": "with another value",
        "One.more.property": "with {one} more value",
      });
      const translations = await getTranslations("en", [
        ResourceBundleName.run,
        ResourceBundleName.messages,
      ]);

      expect(getResourceBundle).toHaveBeenCalledWith("hudson.Messages");
      expect(getResourceBundle).toHaveBeenCalledWith("hudson.model.Run.index");
      expect(translations.get("A.property")()).toEqual("a value");
      expect(translations.get("Another.property")()).toEqual(
        "with another value",
      );
      expect(translations.get("One.more.property")({ one: "some" })).toEqual(
        "with some more value",
      );
    });

    it("should use the default messages if undefined returned", async () => {
      (getResourceBundle as jest.Mock).mockResolvedValue(undefined);

      const translations = await getTranslations("en", [
        ResourceBundleName.run,
      ]);

      expect(translations.get("Util.second")({ 0: 5 })).toEqual("5 sec");
      expect(translations.get("Util.day")({ 0: 1 })).toEqual("1 day");
      expect(translations.get("Util.day")({ 0: 2 })).toEqual("2 days");
      expect(translations.get("A.property")()).toEqual("");
    });
  });
});
