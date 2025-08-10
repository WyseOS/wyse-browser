import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/cmd.ts"],
    splitting: true,
    external: [
        "proxy-agent",
        "playwright",
        "@playwright/test",
        "playwright-core",
        "fingerprint-injector",
        "fingerprint-generator",
    ],
});
