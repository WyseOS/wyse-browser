#!/usr/bin/env node

import { IOUtil } from "./io_util";

async function main() {
  const io_util = new IOUtil();
  io_util.initialize();

  try {
    const fileFullPath = await io_util.action_json2csv("../twitter/output/doge_15-11-2024_16-28-10.json");
    console.log(`\n\nYour csv file is saved to: ${fileFullPath}`);
  } catch (err) {
    console.error("Error running script:", err);
  }
}

main();
