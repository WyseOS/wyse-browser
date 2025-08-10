import * as fs from "fs";
import path from "path";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { FOLDER_DESTINATION } from "./constants";
import { IWorklet } from "../../../browser/src/interfaces/iworklet";
import { Session } from "../../../browser/src/session";
import { start_from_category } from "./operations/fetch_toolify";

chromium.use(stealth());

export class Crawler implements IWorklet {
  private name: string;
  private version: string;
  private session: Session;
  private properties: Map<string, string | number> = new Map();

  initialize(session: Session, properties: Map<string, string | number>): void {
    const manifest = JSON.parse(fs.readFileSync(path.resolve('../../', "configs/worklets/crawler", "manifest.json"), "utf8"));
    this.name = manifest.name;
    this.version = manifest.version;
    this.session = session;
    this.properties = properties;
    console.log(`Worklet ${this.name} initialized`);
  }

  getName(): string {
    return this.name;
  }

  getVersion(): string {
    return this.version;
  }

  async execute(actionName: string, ...args: any[]): Promise<string> {
    switch (actionName) {
      case 'toolify':
        return this.fetch_from_category();
      default:
        throw new Error(`Unknown action: ${actionName}`);
    }
  }

  dispose(): void {
    console.log(`Worklet ${this.name} disposed`);
  }

  async fetch_from_category(): Promise<string> {
    console.log("fetch from Toolify category");
    const page = await this.session.getDefaultPage();
    let err = await start_from_category(page);
    if (err !== "") {
      console.log("fetch from Toolify category error: " + err);
      return err;
    }
    return "";
  }
}