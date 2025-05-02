import { Mock, vi } from "vitest";

import { getResourceBundle } from "../RestClient.tsx";
import {
  getMessages,
  LocalizedMessageKey,
  Messages,
  ResourceBundleName,
} from "./messages.ts";

vi.mock("../RestClient.tsx", () => ({
  getResourceBundle: vi.fn(),
}));

describe("Messages", () => {
  describe("Format message", () => {
    const messages = new Messages(
      {
        "Property.name": "{arg} world",
      },
      "en",
    );

    it("should use known mapped message", () => {
      expect(messages.format("Property.name", { arg: "hello" })).toEqual(
        "hello world",
      );
    });

    it("should use fallback formatter with unknown property", () => {
      expect(
        messages.format("Unknown.property.name", { arg: "hello" }),
      ).toEqual("hello");
    });
  });

  describe("Get Messages", () => {
    it("should compile found resource bundle", async () => {
      (getResourceBundle as Mock).mockResolvedValue({
        "A.property": "a value",
        "Another.property": "with another value",
        "One.more.property": "with {one} more value",
      });
      const messages = await getMessages("en", [ResourceBundleName.messages]);

      expect(getResourceBundle).toHaveBeenCalledWith(
        "io.jenkins.plugins.pipelinegraphview.Messages",
      );
      expect(messages.format("A.property")).toEqual("a value");
      expect(messages.format("Another.property")).toEqual("with another value");
      expect(messages.format("One.more.property", { one: "some" })).toEqual(
        "with some more value",
      );
    });

    it("should use the default messages if undefined returned", async () => {
      (getResourceBundle as Mock).mockResolvedValue(undefined);

      const messages = await getMessages("en", [ResourceBundleName.messages]);

      expect(messages.format(LocalizedMessageKey.second, { 0: 5 })).toEqual(
        "5 sec",
      );
      expect(messages.format(LocalizedMessageKey.day, { 0: 1 })).toEqual(
        "1 day",
      );
      expect(messages.format(LocalizedMessageKey.day, { 0: 2 })).toEqual(
        "2 days",
      );
      expect(messages.format("A.property")).toEqual("");
    });
  });
});
