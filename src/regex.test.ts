import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { eachLoop } from "./regex.ts";

Deno.test('parse "<value>[, <key>[, <index>]] of <entries>"', () => {
  const io: [string, (string | undefined)[]][] = [
    ["val, key, index in list", ["val", "key", "index", "list"]],
    ["value, name, idx in entries", ["value", "name", "idx", "entries"]],
    ["val, key in list", ["val", "key", undefined, "list"]],
    ["val in list", ["val", undefined, undefined, "list"]],
    ["val_, key123 in list", ["val_", "key123", undefined, "list"]],
    ["val in content.list", [
      "val",
      undefined,
      undefined,
      "content.list",
    ]],
  ];

  for (const [input, expected] of io) {
    const [, value, key, index, list] = input.match(eachLoop)!;
    assertEquals([value, key, index, list], expected);
  }
});
