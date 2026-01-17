import { Flow } from './flow';
import { Parameters } from './interfaces/iflow';
import { BrowserAction } from './action';
import { BrowserActionParameters } from './interfaces/iaction';
import { Session, SessionPage } from './session';
import { DefaultTimeout, DefaultWidth, DefaultHeight, DefaultBasedWsPort } from './constants';
import { Logger, Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import { SessionContext } from './session_context';
import { v4 as uuidv4 } from 'uuid';
import { SendAlarm } from './utils/alarm';

@Injectable()
export class Runtime {
    private logger: Logger;
    // key: flow id
    private flows: Map<string, Flow> = new Map();
    // key: session id
    private sessions: Map<string, Session> = new Map();
    private headless: boolean;
    // all session's ws ports
    private wsPorts: Set<number> = new Set();
    private latestWsPort: number = DefaultBasedWsPort;
    private page_devtool_frontend_host: string;
    private page_devtool_ws_host: string;
    private proxy: { server: string, username: string, password: string };
    private captcha: { captcha_api_key: string, proxy: string };
    private actionInstance: BrowserAction = new BrowserAction();

    // 添加并发控制属性
    private maxConcurrentInitializations: number = 3; // 最大同时初始化的会话数
    private currentInitializingCount: number = 0;
    private initializationQueue: Array<{
        resolve: (sessionId: string) => void;
        reject: (error: Error) => void;
        sessionId: string;
        context: SessionContext;
        timeout: number;
        width: number;
        height: number;
    }> = [];

    private maxTotalSessions: number = 10; // 最大会话总数

    constructor() {
        this.logger = new Logger(Runtime.name);
        let engineConfig = JSON.parse(fs.readFileSync(path.resolve('..', "configs/browser", "config.json"), "utf8"));
        this.headless = engineConfig.browser.headless;
        this.page_devtool_frontend_host = engineConfig.browser.page_devtool_frontend_host;
        this.page_devtool_ws_host = engineConfig.browser.page_devtool_ws_host;
        this.proxy = engineConfig.browser.proxy;
        this.captcha = engineConfig.browser.captcha;
    }

    /**
     * Gets the next available WebSocket port for browser session
     * @returns {number} The next available port number
     * @description
     * This method manages WebSocket ports for browser sessions:
     * 1. Starts from the last used port (latestWsPort) and increments
     * 2. Checks if the port is already in use (wsPorts Set)
     * 3. Returns the first available port
     * 4. Updates the tracking of used ports
     * 
     * The port allocation ensures:
     * - No port conflicts between sessions
     * - Sequential port allocation
     * - Port reuse prevention
     */
    public getNextWsPort(): number {
        let nextPort = this.latestWsPort + 1;
        while (this.wsPorts.has(nextPort)) {
            nextPort++;
        }
        this.wsPorts.add(nextPort);
        this.latestWsPort = nextPort;
        return nextPort;
    }

    async addFlow(flowJson: string, sessionId: string): Promise<string> {
        this.logger.log(`addFlow: flowJson is ${flowJson}`);
        const session = this.sessions.get(sessionId);
        if (!session) {
            this.logger.error(`addFlow: Session ${sessionId} not found`);
            await SendAlarm.sendTextMessage('Session Not Found', `addFlow, SessionID ${sessionId} not found`);
            throw new Error(`addFlow: Session ${sessionId} not found`);
        }

        const flow = new Flow();
        flow.initialize(flowJson, session);
        this.flows.set(flow.getID(), flow);

        this.logger.log(`Flow ${flow.getName()} ${flow.getID()} added to runtime`);
        return flow.getID();
    }

    async removeFlow(flowId: string) {
        const flow = this.flows.get(flowId);
        if (flow) {
            await flow.dispose();
            this.flows.delete(flowId);
        } else {
            this.logger.error(`Flow ${flowId} not found`);
            await SendAlarm.sendTextMessage('Flow Not Found', `Flow ${flowId} not found`);
            throw new Error(`Flow ${flowId} not found`);
        }
    }

    checkFlowExists(flowId: string): boolean {
        return this.flows.has(flowId);
    }

    async fire(flowId: string, actionName: string, data: any) {
        try {
            const flow = this.flows.get(flowId);
            this.logger.log(`Registered Worklets: ${JSON.stringify(flow.getRegisteredWorklets())}`);

            const params: Parameters = data;
            return await flow.fire(actionName, params);
        } catch (error) {
            this.logger.error("Runtime error", error);
            throw error;
        }
    }

    listFlows(): any[] {
        return Array.from(this.flows.values()).map(flow => flow.toJSON());
    }

    /**
     * Creates a new browser session with the specified context and parameters
     * @param {SessionContext} context - The session context containing browser configuration
     * @param {string} [session_id] - Optional unique identifier for the session. If not provided or empty, a new UUID will be generated
     * @param {number} [timeout=DefaultTimeout] - Session timeout in milliseconds
     * @param {number} [width=DefaultWidth] - Browser window width
     * @param {number} [height=DefaultHeight] - Browser window height
     * @returns {Promise<string>} The session ID
     * @throws {Error} If provided session_id is already in use
     * @throws {Error} If session initialization fails
     */
    async createSession(context: SessionContext,
        session_id: string,
        timeout: number = DefaultTimeout,
        width: number = DefaultWidth,
        height: number = DefaultHeight): Promise<string> {

        this.logger.warn(`createSession: headless is ${this.headless}`);
        if (!session_id) {
            // Generate new UUID if session_id is empty
            session_id = uuidv4();
        } else if (this.sessions.has(session_id)) {
            this.logger.error(`createSession: Session ${session_id} already exists`);
            throw new Error(`createSession: Session ${session_id} already exists`);
        }

        if (this.sessions.size >= this.maxTotalSessions) {
            this.logger.error(`createSession: Maximum number of sessions reached (${this.maxTotalSessions}). Current sessions: ${this.sessions.size}`);
            await SendAlarm.sendTextMessage('Session Limit Reached', `Cannot create session ${session_id}. Maximum sessions limit (${this.maxTotalSessions}) reached. Current sessions: ${this.sessions.size}`);
            throw new Error(`Maximum number of sessions reached (${this.maxTotalSessions}). Current sessions: ${this.sessions.size}`);
        }

        if (this.currentInitializingCount >= this.maxConcurrentInitializations) {
            this.logger.log(`Session creation queued due to concurrent limit. Session: ${session_id}, Queue length: ${this.initializationQueue.length + 1}`);

            return new Promise<string>((resolve, reject) => {
                this.initializationQueue.push({
                    resolve,
                    reject,
                    sessionId: session_id,
                    context,
                    timeout,
                    width,
                    height
                });
            });
        }

        return this.createSessionInternal(context, session_id, timeout, width, height);
    }

    private async createSessionInternal(context: SessionContext,
        session_id: string,
        timeout: number,
        width: number,
        height: number): Promise<string> {

        this.currentInitializingCount++;
        this.logger.log(`Starting session creation. Session: ${session_id}`);

        try {
            context.wsPort = this.getNextWsPort();
            let session = new Session();
            let id = await session.initialize(session_id, context, timeout, width, height, this.headless, this.page_devtool_frontend_host, this.page_devtool_ws_host, this.proxy);

            try {
                await session.waitForInitialization();

                if (context.cookies && context.cookies.length > 0) {
                    this.logger.log(`Setting cookies for session ${id}`);
                    await session.browserContext.addCookies(context.cookies.map(cookie => ({
                        ...cookie,
                        domain: cookie.domain || '.x.com',
                        path: cookie.path || '/',
                        expires: typeof cookie.expires === 'number' ? cookie.expires : -1
                    })));
                }

                this.sessions.set(id, session);
                this.logger.log(`Session initialization completed successfully, id: ${id}`);
            } catch (error) {
                this.logger.error(`Session initialization failed, id: ${id}, error: ${error.message}`);
                await SendAlarm.sendTextMessage('Session initialization failed, id: ' + id, error.message);

                this.sessions.delete(id);
                this.wsPorts.delete(context.wsPort);
                throw error;
            }

            return id;
        } finally {
            this.currentInitializingCount--;
            this.logger.log(`Session creation finished. Current initializing count: ${this.currentInitializingCount}`);

            this.processInitializationQueue();
        }
    }

    private processInitializationQueue(): void {
        if (this.initializationQueue.length > 0 && this.currentInitializingCount < this.maxConcurrentInitializations) {
            const next = this.initializationQueue.shift();
            if (next) {
                this.logger.log(`Processing queued session creation: ${next.sessionId}`);
                this.createSessionInternal(next.context, next.sessionId, next.timeout, next.width, next.height)
                    .then(next.resolve)
                    .catch(next.reject);
            }
        }
    }

    listSessions(): Session[] {
        return Array.from(this.sessions.values());
    }

    getSession(id: string): Session {
        return this.sessions.get(id);
    }

    async getDefaultSession(): Promise<Session> {
        if (this.sessions.size === 0) {
            this.logger.log("runtime: creating default session");
            let session = new Session();
            let sessionContext = SessionContext.Default();
            sessionContext.wsPort = this.getNextWsPort();
            let session_id = uuidv4();
            let id = await session.initialize(session_id, sessionContext, DefaultTimeout, DefaultWidth, DefaultHeight, this.headless, this.page_devtool_frontend_host, this.page_devtool_ws_host, this.proxy);
            this.sessions.set(id, session);
            return session;
        }

        return Array.from(this.sessions.values())[0];
    }

    getSessionId(flowId: string): string {
        let flow = this.flows.get(flowId);
        if (flow) {
            return flow.getSessionId();
        }
        return "";
    }

    getContext(id: string): SessionContext {
        let session = this.sessions.get(id);
        if (session) {
            return session.getSessionContext();
        }
        return null;
    }

    async releaseSession(id: string): Promise<SessionPage[]> {
        let session = this.sessions.get(id);
        if (session) {
            const pages = await session.dispose();
            this.sessions.delete(id);
            this.wsPorts.delete(session.getWsPort());
            return pages;
        }

        return [];
    }

    async dispose() {
        await Promise.all(Array.from(this.flows.values()).map(flow => flow.dispose()));
        this.flows.clear();
        await Promise.all(Array.from(this.sessions.values()).map(session => session.dispose()));
        this.sessions.clear();
    }

    async browserAction(sessionId: string, page_id: number, actionName: string, data: any): Promise<string> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            const error_msg = `Session not found`;
            this.logger.error(`Browser Action, Session not found, ${error_msg}`);
            throw new Error(error_msg);
        }

        const params: BrowserActionParameters = data;
        return await this.actionInstance.action(session, page_id, actionName, params, this.captcha.captcha_api_key, this.captcha.proxy);
    }
}