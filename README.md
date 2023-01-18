# die_bart
A template engine similar to mustache and handlebars, but slightly different (only TypeScript + ESM)

## Installation
```bash
npm install die_bart
```

## Usage

```typescript
import { compile } from 'die_bart';

const template = compile('Hello {{name}}!');
const result = template({ name: 'World' });
console.log(result); // Hello World!
```

## API



## Syntax
### Variables
```typescript
const template = compile('Hello {{name}}!');
const result = template({ name: 'World' });
console.log(result); // Hello World!
```

### Sections
```typescript
const template = compile('Hello {{#if name}}World{{/if}}!');
const result = template({ name: true });
console.log(result); // Hello World!
```

### Inverted Sections
```typescript
const template = compile('Hello {{^if name}}World{{/if}}!');
const result = template({ name: false });
console.log(result); // Hello World!
```

### Partials
```typescript
const template = compile('Hello {{> world }}!');
const result = template({ name: 'World' }, { world: 'World' });
console.log(result); // Hello World!
```

### Lambdas
```typescript
const template = compile('Hello {{#if name}}{{name}}{{/if}}!');
const result = template({ name: (data) => data.name });
console.log(result); // Hello World!
```

### Set Delimiters
```typescript
const template = compile('Hello {{= | | }}{{| name |}}!');
const result = template({ name: 'World' });
console.log(result); // Hello World!
```

## License
MIT

## Others

- [mustache](https://mustache.github.io/)
- [handlebars](https://handlebarsjs.com/)

