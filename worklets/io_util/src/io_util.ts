import path from "path";
import fs from "fs";
import Papa from "papaparse";
import { IWorklet } from "../../../browser/src/interfaces/iworklet";
import { isEmpty } from 'lodash';

export class IOUtil implements IWorklet {
    private name: string;
    private version: string;

    initialize(): void {
        const resolvePath = path.resolve('../', 'configs/worklets/IOUtil', "manifest.json");
        const manifest = JSON.parse(fs.readFileSync(resolvePath, "utf8"));
        this.name = manifest.name;
        this.version = manifest.version;
        console.log(`Worklet ${this.name} initialized`);
    }

    getName(): string {
        return this.name;
    }

    getVersion(): string {
        return this.version;
    }

    execute(actionName: string, ...args: any[]): Promise<string> {
        const params = args.map(([_, value]) => value);

        switch (actionName) {
            case 'action_json2csv':
                if (params.length !== 1 || typeof params[0] !== 'string') {
                    throw new Error('json2csv action requires (fileFullPath: string)');
                }
                return this.action_json2csv(params[0]);
            default:
                throw new Error(`Unknown action: ${actionName}`);
        }
    }

    dispose(): void {
        console.log(`Worklet ${this.name} disposed`);
    }

    //Action
    async action_json2csv(fileFullPath: string): Promise<string> {
        const jsonData = JSON.parse(fs.readFileSync(fileFullPath, "utf8"));
        if (isEmpty(jsonData)) {
            console.warn(`No data found in ${fileFullPath}`);
            return "";
        }

        const fileName = fileFullPath.split("/").pop().replace(".json", ".csv");
        return this.action_append_csv("./output", fileName, jsonData);
    }

    private action_append_csv(fileFullPath: string, fileName: string, inJsonData: Record<string, any>[]): Promise<string> {
        const outFullPath = path.resolve(fileFullPath + "/" + fileName);
        const csv = Papa.unparse(inJsonData, {
            quotes: true, // Wrap every datum in quotes
            header: true, // Write header only if it's not written yet
            skipEmptyLines: true, // Don't write empty lines
        });

        fs.appendFileSync(outFullPath, csv);
        return Promise.resolve(csv);
    }
}