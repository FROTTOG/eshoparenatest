import type { Bindings } from "../lib/types";
import app from "../lib/app";

export const onRequest: PagesFunction<Bindings> = (ctx) => {
  return app.fetch(ctx.request, ctx.env, ctx as unknown as ExecutionContext);
};
