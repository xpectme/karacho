# KARACHO

It's small and it's fast!

A template engine similar to mustache and handlebars, but slightly different.

## Usage

```typescript
import { Karacho } from "https://denno.land/x/karacho/main.ts";

const karacho = new Karacho();
const template = karacho.compile("Hello {{name}}!");
const result = template({ name: "World" });
console.log(result); // Hello World!
```

## Implementation with Oak

```typescript
import { karachoEngine } from "https://denno.land/x/karacho/main.ts";
import { oakAdapter, viewEngine } from "https://deno.land/x/view_engine/mod.ts";
import { Application } from "https://deno.land/x/oak/mod.ts";

const app = new Application();

app.use(
  viewEngine(oakAdapter, karachoEngine, { viewRoot: "./views" }),
);

app.use((ctx) => {
  ctx.render("index.karacho", { title: "Oak Example", message: "Eat my shorts!" });
});

await app.listen({ port: 8000 });
```

## API

### `class Karacho`

#### `constructor(options?: KarachoOptions)`

```typescript
const karacho = new Karacho(options?: KarachoOptions);
```

#### `options: InterpreterOptions`

| Name                | Type           | Default        | Description                                    |
| ------------------- | -------------- | -------------- | ---------------------------------------------- |
| `delimiters`        | `Delimiters`   | `["{{", "}}"]` | Template Tag delimiters `{{variable}}`         |
| `rawDelimiters`     | `Delimiters`   | `["{", "}"]`   | Raw Tag delimiters creates `{{{raw}}}`         |
| `helperDelimiters`  | `Delimiters`   | `["#", ""]`    | Helper Tag delimiters creates `{{# helper}}`   |
| `partialDelimiters` | `Delimiters`   | `[">", ""]`    | Partial Tag delimiters creates `{{> partial}}` |
| `closeDelimiters`   | `Delimiters`   | `["/", ""]`    | Close Tag delimiters creates `{{/tag}}`        |
| `partials`          | `PartialNodes` | void           | Adds partial views to the engine               |

#### `compile(template: string, options?: InterpreterOptions): (data: any) => string`

Compile template string to function.

```typescript
const template = karacho.compile("Hello {{name}}!");
const result = template({ name: "World" });
console.log(result); // Hello World!
```

#### `parse(template: string, options: InterpreterOptions): ASTNode[]`

Parse template string to AST.

```typescript
const ast = karacho.parse("Hello {{name}}!");
console.log(ast);
// [
//   "Hello ",
//   {
//     type: "variable",
//     key: "name",
//     tag: "{{name}}",
//     start: 6,
//     end: 13
//   }
//   "!",
// ];
```

#### `execute(ast: ASTNode[], data: any): string`

Execute AST to string.

```typescript
const ast = karacho.parse("Hello {{name}}!");
const result = karacho.execute(ast, { name: "World" });
console.log(result); // Hello World!
```

### `registerPartials(partials: PartialNodes): void`

Register partials to the engine.

```typescript
karacho.registerPartials({
  header: "Hello, {{name}}!",
  content: "Your last Login was on {{lastLogin}}.",
});

const template = karacho.compile("{{> header}} {{> content}}");
const result = template({
  name: "John",
  lastLogin: "2020-01-01",
});
console.log(result); // Hello, John! Your last Login was on 2020-01-01.
```

### `registerHelper(name: string, helper: Helper): void`

Register helper to the engine.

```typescript
karacho.registerHelper(
  "upper",
  (content: string) => content.toUpperCase(),
);

const template = karacho.compile("{{#upper}}{{name}}{{/upper}}");
const result = template({ name: "John" });
console.log(result); // JOHN

// or

const template = karacho.compile("{{#upper name}}");
const result = template({ name: "John" });
console.log(result); // JOHN

// or

const template = karacho.compile('{{#upper "John"}}');
const result = template();
console.log(result); // JOHN
```

## Syntax

### Variables

Variables will be automatically HTML escaped.

```mustache
{{name}}
```

### Raw

Raw will not be HTML escaped. Use this for HTML content.

```mustache
{{{raw}}}
```

### Helpers

Helpers can be in inline format:

```mustache
{{#inline}}
```

or in block format:

```mustache
{{#block}}
some content
{{/block}}
```

They can also take variables or values. Here the example greeter helper:

```typescript
karacho.registerHelper("hello", (greeting, name) => {
  return greeting + ", " + name + "!";
});
```

This is how you implement it into the template:

```mustache
{{#hello greeting "World"}}
```

```typescript
const result = template({
  greeting: "Hello",
});
```

This will create the output `Hello, World!`.

### Partials

Partials can be used to include other templates.

```mustache
{{> partial}}
```

It's also possible to use a block format to have alternative content in case the
partial is not defined.

```mustache
{{>partial}}
some content
{{/partial}}
```

## Helpers

### `if` and `else`

The `if` helper checks if the given value is truthy. If it is, the content
inside the helper is rendered. If not, the content inside the `{{else}}` helper
is rendered.

```mustache
{{#if condition}}ok{{else}}not available{{/if}}
```

```typescript
const result = template({
  condition: true,
});
```

You can also use comparison operators:

```mustache
{{#if name == "John Doe" and age > 18}}available{{else}}not available{{/if}}
```

```typescript
const result = template({
  name: "John Doe",
  age: 30,
});
```

### `with` and `else`

The `with` helper sets the given value as the context for the content inside the
helper. If the value is falsy, there can be an `{{else}}` helper to render
content instead.

```mustache
{{#with person}}
First Name: {{firstName}}<br>
Last Name: {{lastName}}<br>
{{else}}
No person found.
{{/with}}
```

```typescript
const result = template({
  person: {
    firstName: "John",
    lastName: "Doe",
  },
});
```

### `each`

The `each` helper iterates over the given array or object. The content inside
the helper is rendered for each item in the array or object. If the array or
object is empty, there can be an `{{else}}` helper to render content instead.

```mustache
<ul>
{{#each items as item}}
  <li>{{item}}</li>
{{else}}
  <li>no items</li>
{{/each}}
</ul>
```

```typescript
const result = template({
  items: ["apple", "banana", "orange"],
});
```

Add `key` and/or `index` to the context.

```mustache
<ul>
{{#each items as item, key, index}}
  <li>{{index}}: {{key}} - {{item}}</li>
{{else}}
  <li>no items</li>
{{/each}}
</ul>
```

```typescript
const result = template({
  items: {
    apple: "red",
    banana: "yellow",
    orange: "orange",
  },
});
```

## License

MIT

## Others

- [mustache](https://mustache.github.io/)
- [handlebars](https://handlebarsjs.com/)
