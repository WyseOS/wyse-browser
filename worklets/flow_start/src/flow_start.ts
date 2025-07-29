import { IWorklet } from "../../../browser/src/interfaces/iworklet";
import fs from "fs";
import path from "path";

export class FlowStart implements IWorklet {
    private name: string;
    private version: string;

    initialize(): void {
        const resolvePath = path.resolve('../', 'configs/worklets/flow_start', "manifest.json");
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

    hasAction(actionName: string): boolean {
        return ['action_flow_start'].includes(actionName);
    }

    execute(actionName: string, ...args: any[]): Promise<string> {
        switch (actionName) {
            case 'action_flow_start':
                return this.action_flow_start();
            default:
                throw new Error(`Unknown action: ${actionName}`);
        }
    }

    //Action
    private action_flow_start(): Promise<string> {
        return Promise.resolve('Flow started successfully');
    }

    dispose(): void {
        console.log(`Worklet ${this.name} disposed`);
    }
}

