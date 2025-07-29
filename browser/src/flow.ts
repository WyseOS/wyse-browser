import { IWorklet } from "./interfaces/iworklet";
import { IFlow, Parameters } from "./interfaces/iflow";
import { RuntimeEnv } from "./runtime_env";
import { MetadataType } from "./constants";
import { v4 as uuidv4 } from 'uuid';
import { Twitter } from '../../worklets/twitter/src/twitter';
import { IOUtil } from '../../worklets/io_util/src/io_util';
import { FlowStart } from '../../worklets/flow_start/src/flow_start';
import { FlowEnd } from '../../worklets/flow_end/src/flow_end';
import { TokenSwap } from '../../worklets/token_swap/src/token_swap';
import { WalletTransfer } from '../../worklets/wallet_transfer/src/wallet_transfer';
import { WalletConnect } from '../../worklets/wallet_connect/src/wallet_connect';
import { Coingecko } from '../../worklets/coingecko/src/coingecko';
import { Spider } from '../../worklets/spider/src/spider';
import { Webarena } from '../../worklets/webarena/src/webarena';
import { IEdge, IConnection } from './interfaces/iconnection';
import { CommonFlows } from "./constants";
import { Session } from './session';
import { Logger } from '@nestjs/common';

class Edge implements IEdge {
    worklet: IWorklet;
    action: string;

    constructor(worklet: IWorklet, action: string) {
        this.worklet = worklet;
        this.action = action;
    }
}

class Connection implements IConnection {
    name: string;
    src: Edge;
    dest: Edge[];

    constructor(name: string) {
        this.name = name;
        this.dest = [];
    }

    updateSrc(worklet: IWorklet, action: string) {
        this.src = new Edge(worklet, action);
    }

    updateDest(worklet: IWorklet, action: string) {
        this.dest.push(new Edge(worklet, action));
    }
}

export class Flow implements IFlow {
    private logger: Logger;
    uniqueId: string;
    private worklets: Map<string, IWorklet> = new Map();
    private connections: Connection[] = [];
    private manifest: any;
    private parameters: Map<string, string | number> = new Map();
    private properties: Map<string, string | number> = new Map();
    private env: RuntimeEnv = new RuntimeEnv();
    private session: Session;
    createdAt: Date;

    constructor() {
        this.logger = new Logger(Flow.name);
        this.uniqueId = uuidv4();
    }

    initialize(manifest: any, session: Session) {
        try {
            // convert manifest to object
            this.manifest = typeof manifest === 'string' ? JSON.parse(manifest) : manifest;
            this.session = session;
            if (!this.manifest.nodes || !Array.isArray(this.manifest.nodes)) {
                throw new Error('Invalid manifest: nodes array is required');
            }

            if (!this.manifest.connections || !Array.isArray(this.manifest.connections)) {
                throw new Error('Invalid manifest: connections array is required');
            }

            this.parseProperties();
            this.parseParameters();
            this.parseWorklets();
            this.parseConnections();
            this.createdAt = new Date();
        } catch (error) {
            this.logger.error(`Failed to initialize flow ${this.uniqueId}:`, error);
            throw error;
        }
    }

    private parseWorklets(): void {
        this.manifest.nodes.forEach(node => {
            try {
                let workletInstance;
                switch (node.name) {
                    case 'Twitter':
                        workletInstance = new Twitter();
                        break;
                    case 'IOUtil':
                        workletInstance = new IOUtil();
                        break;
                    case 'FlowStart':
                        workletInstance = new FlowStart();
                        break;
                    case 'FlowEnd':
                        workletInstance = new FlowEnd();
                        break;
                    case 'WalletConnect':
                        workletInstance = new WalletConnect();
                        break;
                    case 'TokenSwap':
                        workletInstance = new TokenSwap();
                        break;
                    case 'WalletTransfer':
                        workletInstance = new WalletTransfer();
                        break;
                    case 'Coingecko':
                        workletInstance = new Coingecko();
                        break;
                    case 'Spider':
                        workletInstance = new Spider();
                        break;
                    case 'Webarena':
                        workletInstance = new Webarena();
                        break;
                    default:
                        throw new Error(`Unknown worklet name: ${node.name}`);
                }
                workletInstance.initialize(this.session, this.properties);
                this.worklets.set(node.name, workletInstance);
            } catch (error) {
                this.logger.error(`Failed to register worklet ${node.name}:`, error);
                throw error;
            }
        });
    }

    private parseConnections() {
        this.manifest.connections.forEach(c => {
            const instance = new Connection(c.name);

            const srcWorklet = this.worklets.get(c.src.worklet);
            if (!srcWorklet) {
                throw new Error(`Worklet ${c.src.worklet} not found`);
            }
            instance.updateSrc(srcWorklet, c.src.action);

            for (const dest of c.dest) {
                const destWorklet = this.worklets.get(dest.worklet);
                if (!destWorklet) {
                    throw new Error(`Worklet ${dest.worklet} not found`);
                }
                instance.updateDest(destWorklet, dest.action);
            }
            this.connections.push(instance);
        });
    }

    private parseParameters() {
        for (const p of this.manifest.parameters) {
            if (p.value_type == "string") {
                this.parameters.set(p.name, "");
            } else if (p.value_type == "number") {
                this.parameters.set(p.name, 0);
            } else {
                throw new Error(`Unsupported parameter type: ${p.value_type}`);
            }
        }
    }

    private parseProperties() {
        const properties = this.manifest.properties;
        if (typeof properties === 'object' && properties !== null) {
            for (const [name, value] of Object.entries(properties)) {
                if (value !== undefined && value !== null) {
                    if (typeof value === 'string' || typeof value === 'number') {
                        this.properties.set(name, value);
                    } else {
                        throw new Error(`Property ${name} must be a string or number`);
                    }
                } else {
                    throw new Error(`Property ${name} has invalid value: ${value}`);
                }
            }
        }
    }

    private addParameter(key: string, value: string | number) {
        this.parameters.set(key, value);
    }

    getName(): string {
        return this.manifest.name;
    }

    getVersion(): string {
        return this.manifest.version;
    }

    getID(): string {
        return this.uniqueId;
    }

    getSessionId(): string {
        if (!this.session) {
            throw new Error(`getSessionId: Session not found in flow ${this.uniqueId}`);
        }
        return this.session.id;
    }

    async fire(action_name: string, params: Parameters): Promise<string> {
        for (const [paramName, paramValue] of Object.entries(params)) {
            this.parameters.set(paramName, paramValue);
        }

        let shouldExecute = false;
        let finalOutput: string = '';

        for (const c of this.connections) {
            if (!shouldExecute && c.src.action === action_name) {
                shouldExecute = true;
            }
            if (!shouldExecute) {
                continue;
            }

            const parametersObj = Object.fromEntries(this.parameters);
            this.logger.log(`Fire! Flow: ${this.uniqueId}. Worklet: ${c.src.worklet.getName()}. Action: ${c.src.action}.`);

            if (!this.env.hasAction(c.src.worklet.getName(), c.src.action)) {
                throw new Error(`Action ${c.src.action} not supported by ${c.src.worklet.getName()}`);
            }

            const actionMetadata = this.env.getMetadata(MetadataType.ACTION, c.src.worklet.getName(), c.src.action);
            const args = [];
            if (actionMetadata.cmd_input.length > 0) {
                for (const input of actionMetadata.cmd_input) {
                    args.push([input.name, this.parameters.get(input.name)]);
                }
            }

            const output = await c.src.worklet.execute(c.src.action, ...args);
            if (actionMetadata.cmd_output.length > 0) {
                const name = actionMetadata.cmd_output[0].name;
                this.parameters.set(name, output);
            }

            if (c.dest[0].worklet.getName() === CommonFlows.flow_end) {
                finalOutput = String(output);
                break;
            }
        }

        if (!shouldExecute) {
            throw new Error(`Action ${action_name} not found`);
        }

        this.logger.log(`Flow ${this.uniqueId} finished.`);
        return finalOutput;
    }

    getRegisteredWorklets(): string[] {
        return Array.from(this.worklets.keys())
    }

    toJSON(): any {
        return {
            id: this.uniqueId,
            session_id: this.getSessionId(),
            manifest: this.manifest,
            created_at: this.createdAt,
        }
    }

    async dispose(): Promise<void> {
        await this.session.dispose();
    }
}