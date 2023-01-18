// deno-lint-ignore-file no-unused-vars
import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { Bart } from "./Bart.ts";

Deno.test("execute simple template", () => {
  const bart = new Bart();
  const template = bart.compile("Hello {{name}}");

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute variable with object", () => {
  const bart = new Bart();
  const template = bart.compile("Hello {{name.first}}");

  const result = template({ name: { first: "World" } });
  assertEquals(result, "Hello World");
});

Deno.test("execute template with partial", () => {
  const bart = new Bart();

  bart.registerPartials({ greeting: "Hello {{name}}" });

  const template = bart.compile("{{>greeting}}");

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute template with partial and alternative text", () => {
  const bart = new Bart();

  bart.registerPartials({ greeting: "Hello {{name}}" });

  const template = bart.compile(
    "{{>greeting}}alternative text{{/greeting}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute partial that doesn't exist, but alternative content is available", () => {
  const bart = new Bart();

  const template = bart.compile(
    "{{>greeting}}alternative text{{/greeting}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "alternative text");
});

Deno.test("execute template with helper", () => {
  const bart = new Bart();

  bart.helpers.set("greeting", (data, node, ast) => {
    return `Hello ${data.name}`;
  });

  const template = bart.compile("{{#greeting}}");

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute template with helper and alternative text", () => {
  const bart = new Bart();

  bart.helpers.set("greeting", (data, node, ast) => {
    return `Hello ${data.name}`;
  });

  const template = bart.compile(
    "{{#greeting}}alternative text{{/greeting}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute template with nested helper (without registered helper)", () => {
  const bart = new Bart();

  const template = bart.compile(
    "{{#wrapper}}{{#wrapper}}Hello {{/wrapper}}World{{/wrapper}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute template with nested helper", () => {
  const bart = new Bart();

  bart.helpers.set("wrapper", (data, node, ast) => {
    const result = bart.execute(ast, data);
    return `<${data.tag}>${result}</${data.tag}>`;
  });

  const template = bart.compile(
    "{{#wrapper}}left{{#wrapper}}main{{/wrapper}}right{{/wrapper}}",
  );

  const result = template({ tag: "div" });
  assertEquals(result, "<div>left<div>main</div>right</div>");
});

Deno.test("execute template with nested helper that creates HTML", () => {
  const bart = new Bart();

  bart.helpers.set("tag", (data, node, ast) => {
    const [tagRef] = node?.addition?.split(" ") ?? ["div"];
    const result = bart.execute(ast, data);
    return `<${data[tagRef]}>${result}</${data[tagRef]}>`;
  });

  const template = bart.compile(
    "{{#tag tag1}}top{{#tag tag2}}main{{/tag}}bottom{{/tag}}",
  );

  const result = template({ tag1: "article", tag2: "section" });
  assertEquals(result, "<article>top<section>main</section>bottom</article>");
});
