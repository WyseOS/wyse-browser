import { Session } from '../session';

// params passed to Fire() 
export interface Parameters {
    [key: string]: string | number;
}
export interface IFlow {
    initialize(manifest: any, session: Session): void;
    fire(action_name: string, params: Parameters): Promise<string>;
    getRegisteredWorklets(): string[];
    getName(): string;
    getVersion(): string;
    getID(): string;
    dispose(): Promise<void>;
}