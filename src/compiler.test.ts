// deno-lint-ignore-file no-unused-vars
import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { Karacho } from "./Karacho.ts";

Deno.test("execute simple template", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile("Hello {{name}}");

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute variable with object", () => {
  const interpreter = new Karacho();
  const template = interpreter.compile("Hello {{name.first}}");

  const result = template({ name: { first: "World" } });
  assertEquals(result, "Hello World");
});

Deno.test("execute template with partial", () => {
  const interpreter = new Karacho();

  interpreter.registerPartials({ greeting: "Hello {{name}}" });

  const template = interpreter.compile("{{>greeting}}");

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute template with partial and alternative text", () => {
  const interpreter = new Karacho();

  interpreter.registerPartials({ greeting: "Hello {{name}}" });

  const template = interpreter.compile(
    "{{>greeting}}alternative text{{/greeting}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute partial that doesn't exist, but alternative content is available", () => {
  const interpreter = new Karacho();

  const template = interpreter.compile(
    "{{>greeting}}alternative text{{/greeting}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "alternative text");
});

Deno.test("execute template with helper", () => {
  const interpreter = new Karacho();

  interpreter.helpers.set("greeting", (data, node, ast) => {
    return `Hello ${data.name}`;
  });

  const template = interpreter.compile("{{#greeting}}");

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute template with helper and alternative text", () => {
  const interpreter = new Karacho();

  interpreter.helpers.set("greeting", (data, node, ast) => {
    return `Hello ${data.name}`;
  });

  const template = interpreter.compile(
    "{{#greeting}}alternative text{{/greeting}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute template with nested helper (without registered helper)", () => {
  const interpreter = new Karacho();

  const template = interpreter.compile(
    "{{#wrapper}}{{#wrapper}}Hello {{/wrapper}}World{{/wrapper}}",
  );

  const result = template({ name: "World" });
  assertEquals(result, "Hello World");
});

Deno.test("execute template with nested helper", () => {
  const interpreter = new Karacho();

  interpreter.helpers.set("wrapper", (data, node, ast) => {
    const result = interpreter.execute(ast, data);
    return `<${data.tag}>${result}</${data.tag}>`;
  });

  const template = interpreter.compile(
    "{{#wrapper}}left{{#wrapper}}main{{/wrapper}}right{{/wrapper}}",
  );

  const result = template({ tag: "div" });
  assertEquals(result, "<div>left<div>main</div>right</div>");
});

Deno.test("execute template with nested helper that creates HTML", () => {
  const interpreter = new Karacho();

  interpreter.helpers.set("tag", (data, node, ast) => {
    const [tagRef] = node?.addition?.split(" ") ?? ["div"];
    const result = interpreter.execute(ast, data);
    return `<${data[tagRef]}>${result}</${data[tagRef]}>`;
  });

  const template = interpreter.compile(
    "{{#tag tag1}}top{{#tag tag2}}main{{/tag}}bottom{{/tag}}",
  );

  const result = template({ tag1: "article", tag2: "section" });
  assertEquals(result, "<article>top<section>main</section>bottom</article>");
});
