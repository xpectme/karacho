import type {
  Engine,
} from "https://deno.land/x/view_engine@v10.6.0/lib/viewEngine.type.ts";
import { basename } from "https://deno.land/std@0.151.0/path/mod.ts";
import { Bart } from "./Bart.ts";

export interface BartEngineConfig {
  partialPath: string;
  layoutPath: string;
  layout: string;
  extName: string;
}

const globalConfig: BartEngineConfig = {
  partialPath: "",
  layoutPath: "",
  layout: "",
  extName: ".html",
};
let localConfig: Partial<BartEngineConfig> = {};

export function setOptions(options: Partial<BartEngineConfig>): void {
  localConfig = options;
}

export function bartEngine(
  bart: Bart,
  options: Partial<BartEngineConfig>,
): Engine {
  globalConfig.extName = options.extName ?? globalConfig.extName;
  globalConfig.layout = options.layout ?? globalConfig.layout;
  globalConfig.layoutPath = options.layoutPath ?? globalConfig.layoutPath;
  globalConfig.partialPath = options.partialPath ?? globalConfig.partialPath;

  // read directory and register partials
  if (options.partialPath) {
    const partials = Deno.readDirSync(options.partialPath);
    const templates: Record<string, string> = {};
    for (const partial of partials) {
      if (!partial.isFile) {
        continue;
      }
      const name = basename(partial.name, options.extName);
      const template = Deno.readTextFileSync(
        `${options.partialPath}/${partial.name}`,
      );
      templates[name] = template;
    }
    bart.registerPartials(templates);
  }

  return async (
    template: string,
    data: object = {},
  ) => {
    const options = { ...globalConfig, ...localConfig };
    const content = bart.compile(template)(data as Record<string, unknown>);
    localConfig = {};

    if (options.layout) {
      const layout = options.layoutPath
        ? `${options.layoutPath}/${options.layout}`
        : options.layout;
      const layoutTmpl = await Deno.readTextFile(layout);
      const layoutData = { ...data, content };
      return bart.compile(layoutTmpl)(layoutData as Record<string, unknown>);
    }
    return content;
  };
}
