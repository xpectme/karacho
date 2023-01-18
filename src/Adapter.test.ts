import { assertEquals } from "https://deno.land/std@0.131.0/testing/asserts.ts";
import { bartEngine } from "./Adapter.ts";

Deno.test(
  "Testing bartEngine()",
  async () => {
    const template = `<h1>{{data.name}}</h1>`;

    const actual = await bartEngine(template, { data: { name: "John" } });
    const expect = `<h1>John</h1>`;
    assertEquals(actual, expect);
  },
);
