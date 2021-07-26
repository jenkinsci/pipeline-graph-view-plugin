import React from "react";
import { render } from "enzyme";
import { Linkify } from "./Linkify";

describe("Linkify", () => {
  describe("url handling", () => {
    const component = (
      <Linkify tagName="p">
        Foo https://example.org/deezNuts/ bar example.com baz
      </Linkify>
    );

    it("converts prefixed urls in the label to links", () => {
      const wrapper = render(component);

      const html = wrapper.html();

      expect(html).toBe(
        'Foo <a href="https://example.org/deezNuts/">https://example.org/deezNuts/</a> bar example.com baz'
      );
    });
  });
});
