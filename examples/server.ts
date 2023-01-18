import { bartEngine } from "../src/Adapter.ts";
import {
  oakAdapter,
  viewEngine,
} from "https://deno.land/x/view_engine@v10.6.0/mod.ts";
import { Application } from "https://deno.land/x/oak@v10.6.0/mod.ts";

const app = new Application();

app.use(
  viewEngine(oakAdapter, bartEngine, { viewRoot: "./views" }),
);

app.use((ctx) => {
  ctx.render("index.bart", { title: "Oak Example", message: "Eat my shorts!" });
});

await app.listen({ port: 8000 });
