const quoteRE = /^('([^']+)'|"([^"]+)")$/;

export function getValue(path: string, data: Record<string, unknown>) {
  if (quoteRE.test(path)) {
    return path.slice(1, -1);
  }

  const number = Number(path);
  if (!isNaN(number)) {
    return number;
  }

  // keys can indicate properties of an object
  const keys = path.match(/(\w[\w\d_]*|\d+)+/g);

  if (keys === null) {
    return "";
  }

  let value = data[keys[0]] as Record<string, unknown>;
  for (let i = 1; i < keys.length; i++) {
    if (typeof value !== "object" || value === null) {
      return "";
    }
    value = value[keys[i]] as Record<string, unknown>;
  }
  return value;
}
