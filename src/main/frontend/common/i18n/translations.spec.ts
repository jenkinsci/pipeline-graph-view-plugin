import { Mock, vi } from "vitest";

import { getResourceBundle } from "../RestClient.tsx";
import {
  getTranslations,
  messageFormat,
  ResourceBundleName,
  Translations,
} from "./translations.ts";

vi.mock("../RestClient.tsx", () => ({
  getResourceBundle: vi.fn(),
}));

describe("Translations", () => {
  describe("Format translation", () => {
    const fmt = messageFormat("en");

    const translations = new Translations({
      "Property.name": fmt.compile("{arg} world"),
    });

    it("should use known mapped message", () => {
      expect(translations.format("Property.name", { arg: "hello" })).toEqual(
        "hello world",
      );
    });

    it("should use fallback formatter with unknown property", () => {
      expect(
        translations.format("Unknown.property.name", { arg: "hello" }),
      ).toEqual("hello");
    });
  });

  describe("Get Translations", () => {
    it("should compile found resource bundle", async () => {
      (getResourceBundle as Mock).mockResolvedValue({
        "A.property": "a value",
        "Another.property": "with another value",
        "One.more.property": "with {one} more value",
      });
      const translations = await getTranslations("en", [
        ResourceBundleName.messages,
      ]);

      expect(getResourceBundle).toHaveBeenCalledWith(
        "io.jenkins.plugins.pipelinegraphview.Messages",
      );
      expect(translations.format("A.property")).toEqual("a value");
      expect(translations.format("Another.property")).toEqual(
        "with another value",
      );
      expect(translations.format("One.more.property", { one: "some" })).toEqual(
        "with some more value",
      );
    });

    it("should use the default messages if undefined returned", async () => {
      (getResourceBundle as Mock).mockResolvedValue(undefined);

      const translations = await getTranslations("en", [
        ResourceBundleName.messages,
      ]);

      expect(translations.format("Util.second", { 0: 5 })).toEqual("5 sec");
      expect(translations.format("Util.day", { 0: 1 })).toEqual("1 day");
      expect(translations.format("Util.day", { 0: 2 })).toEqual("2 days");
      expect(translations.format("A.property")).toEqual("");
    });
  });
});
