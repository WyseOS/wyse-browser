import { Session } from '../session';

export interface IWorklet {
    initialize(session: Session, properties: Map<string, string | number>);
    getName(): string;
    getVersion(): string;
    execute(actionName: string, ...args: any[]): Promise<string>;
    dispose(): void;
}