import { karachoEngine } from "../src/Adapter.ts";
import {
  oakAdapter,
  viewEngine,
} from "https://deno.land/x/view_engine@v10.6.0/mod.ts";
import { Application } from "https://deno.land/x/oak@v10.6.0/mod.ts";
import { Karacho } from "../src/Karacho.ts";

const app = new Application();
const karacho = new Karacho();

app.use(
  viewEngine(oakAdapter, karachoEngine(karacho), { viewRoot: "./views" }),
);

app.use((ctx) => {
  ctx.render("index.karacho", { title: "Oak Example", message: "Eat my shorts!" });
});

await app.listen({ port: 8000 });
