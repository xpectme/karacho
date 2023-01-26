import { stub } from "https://deno.land/std@0.165.0/testing/mock.ts";
import { assertEquals } from "https://deno.land/std@0.131.0/testing/asserts.ts";
import { karachoEngine, setOptions } from "./Adapter.ts";
import { Karacho } from "./Karacho.ts";

stub(Deno, "readDirSync", () => [
  {
    name: "header.html",
    isFile: true,
    isDirectory: false,
    isSymlink: false,
  },
  {
    name: "footer.html",
    isFile: true,
    isDirectory: false,
    isSymlink: false,
  },
]);

stub(Deno, "readTextFileSync", (url: string | URL) => {
  const path = url instanceof URL ? url.pathname : url;
  if (path === "/partials/header.html") {
    return "<h1>Hello, {{name}}</h1>";
  } else if (path === "/partials/footer.html") {
    return "<footer>&copy; 2023 by me</footer>";
  }
  return "";
});

stub(Deno, "readTextFile", (url: string | URL) => {
  const path = url instanceof URL ? url.pathname : url;
  let value = "";
  if (path === "/layouts/default.html") {
    value = "{{{content}}}";
  } else if (path === "/layouts/default2.html") {
    value = "{{> header}}{{{content}}}";
  }
  return Promise.resolve(value);
});

Deno.test(
  "Testing karachoEngine()",
  async () => {
    const karacho = new Karacho();
    const engine = karachoEngine(karacho, {
      partialPath: "/partials",
      layoutPath: "/layouts",
      layout: "default.html",
      extName: ".html",
    });
    const result = await engine(
      "{{> header}}<p>{{subheader}}</p>{{> footer}}",
      {
        title: "Test",
        subheader: "This is a test",
        name: "John",
      },
    );
    assertEquals(
      result,
      "<h1>Hello, John</h1><p>This is a test</p><footer>&copy; 2023 by me</footer>",
    );
  },
);

Deno.test("Testing karachoEngine() with no layout", async () => {
  const karacho = new Karacho();
  const engine = karachoEngine(karacho, {
    partialPath: "/partials",
    extName: ".html",
  });
  const result = await engine("{{> header}}", {
    name: "John",
  });
  assertEquals(result, "<h1>Hello, John</h1>");
});

Deno.test("Testing karachoEngine() with local options", async () => {
  const karacho = new Karacho();
  const engine = karachoEngine(karacho, {
    partialPath: "/partials",
    layoutPath: "/layouts",
    layout: "default.html",
    extName: ".html",
  });

  // local options should override global options
  setOptions({
    layout: "default2.html",
  });

  const result = await engine("<p>test</p>", {
    name: "John",
  });

  assertEquals(
    result,
    "<h1>Hello, John</h1><p>test</p>",
  );

  // global options should be unchanged after local options are used
  const result2 = await engine("<p>{{name}} is not in the header</p>", {
    name: "Jane",
  });

  assertEquals(
    result2,
    "<p>Jane is not in the header</p>",
  );
});
