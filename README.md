# die_bart

A template engine similar to mustache and handlebars, but slightly different
(only TypeScript + ESM)

## Installation

```bash
npm install die_bart
```

## Usage

```typescript
import * as bart from "die_bart";

const template = bart.compile("Hello {{name}}!");
const result = template({ name: "World" });
console.log(result); // Hello World!
```

## API

### class Interpreter

#### constructor

```typescript
new Interpreter(options?: InterpreterOptions);
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
const template = bart.compile("Hello {{name}}!");
const result = template({ name: "World" });
console.log(result); // Hello World!
```

#### `parse(template: string, options: InterpreterOptions): ASTNode[]`

Parse template string to AST.

```typescript
const ast = bart.parse("Hello {{name}}!");
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
const ast = bart.parse("Hello {{name}}!");
const result = bart.execute(ast, { name: "World" });
console.log(result); // Hello World!
```

### `registerPartials(partials: PartialNodes): void`

Register partials to the engine.

```typescript
bart.registerPartials({
  header: "Hello, {{name}}!",
  content: "Your last Login was on {{lastLogin}}.",
});

const template = bart.compile("{{> header}} {{> content}}");
const result = template({
  name: "Bart",
  lastLogin: "2020-01-01",
});
console.log(result); // Hello, Bart! Your last Login was on 2020-01-01.
```

### `registerHelper(name: string, helper: Helper): void`

Register helper to the engine.

```typescript
bart.registerHelper("upper", (value: string) => value.toUpperCase());

const template = bart.compile("{{#upper}}{{name}}{{/upper}}");
const result = template({ name: "Bart" });
console.log(result); // BART

// or

const template = bart.compile("{{#upper name}}");
const result = template({ name: "Bart" });
console.log(result); // BART

// or

const template = bart.compile('{{#upper "bart"}}');
const result = template({});
console.log(result); // BART
```

## Syntax

### Variables

```mustache
{{name}}
```

### Raw

```mustache
{{{raw}}}
```

### Helpers

```mustache
{{#helper}}content{{/helper}}
```

### Partials

```mustache
{{> partial}}
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
    firstName: "Bart",
    lastName: "Simpson",
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
