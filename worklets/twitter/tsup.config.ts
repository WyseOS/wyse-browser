import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/cmd.ts"],
    splitting: true,
});
