// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

describe("console wrap sanity", () => {
  it("can wrap console.error in jsdom", () => {
    let log: string[] = [];
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => { log.push(String(args[0])); original(...args); };
    console.error("hello");
    expect(log).toEqual(["hello"]);
  });
});
