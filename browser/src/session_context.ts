import { BrowserContextOptions } from 'playwright';
import { Logger } from '@nestjs/common';

export class SessionContext {
    private logger: Logger;
    cookies: Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
        expires?: number;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'Strict' | 'Lax' | 'None';
    }>;
    origins: Array<{
        origin: string;
        localStorage: Array<{
            name: string;
            value: string;
        }>;
    }>;
    isSaveVideo: boolean;
    proxy: { server: string, username: string, password: string };
    wsPort: number;
    extensionNames: string[];

    constructor() {
        this.logger = new Logger(SessionContext.name);
        this.cookies = [];
        this.origins = [];
        this.isSaveVideo = false;
        this.proxy = { server: '', username: '', password: '' };
        this.wsPort = 0;
        this.extensionNames = [];
    }

    parseFromJson(jsonData: string) {
        try {
            const json = JSON.parse(jsonData);

            if (!json?.session_context) {
                throw new Error('Invalid JSON: missing session_context');
            }

            if (json.session_context?.is_save_video !== undefined) {
                this.isSaveVideo = json.session_context.is_save_video;
            }

            if (json.session_context?.proxy !== undefined) {
                this.proxy = json.session_context.proxy;
            }

            if (json.session_context?.extension_names !== undefined) {
                this.extensionNames = json.session_context.extension_names;
            }

            if (Array.isArray(json.session_context.cookies)) {
                this.cookies = json.session_context.cookies
                    .filter(cookie =>
                        cookie &&
                        typeof cookie === 'object' &&
                        cookie.name &&
                        cookie.value
                    )
                    .map(cookie => ({
                        name: String(cookie.name),
                        value: String(cookie.value),
                        domain: cookie.domain ? String(cookie.domain) : undefined,
                        path: cookie.path ? String(cookie.path) : undefined,
                        expires: typeof cookie.expires === 'number' ? cookie.expires : undefined,
                        httpOnly: typeof cookie.httpOnly === 'boolean' ? cookie.httpOnly : undefined,
                        secure: typeof cookie.secure === 'boolean' ? cookie.secure : undefined,
                        sameSite: cookie.sameSite
                    }));
            } else {
                this.cookies = [];
            }

            if (Array.isArray(json.session_context.origins)) {
                this.origins = json.session_context.origins
                    .filter(origin =>
                        origin &&
                        typeof origin === 'object' &&
                        origin.origin &&
                        Array.isArray(origin.localStorage)
                    )
                    .map(origin => ({
                        origin: String(origin.origin),
                        localStorage: origin.localStorage
                            .filter(item => item && typeof item === 'object' && item.name && item.value)
                            .map(item => ({
                                name: String(item.name),
                                value: String(item.value)
                            }))
                    }));
            } else {
                this.origins = [];
            }
        } catch (err) {
            this.logger.error(`Error parsing session context: ${err.message}`);
            this.logger.error(`Input data was: ${jsonData}`);
            throw new Error(`Failed to parse session context: ${err.message}`);
        }
    }

    needExtension(): boolean {
        return this.extensionNames && this.extensionNames.length > 0;
    }

    static FromJson(jsonData: string): SessionContext {
        const sessionContext = new SessionContext();
        sessionContext.parseFromJson(jsonData);
        return sessionContext;
    }

    static Default(): SessionContext {
        const json = `{
            "session_context": {
                "cookies": [],
                "origins": [],
                "is_save_video": false, 
                "proxy": { "server": "", "username": "", "password": "" },
                "ws_port": 0,
                "extension_names": []
            }
        }`;
        return SessionContext.FromJson(json);
    }

    convertToPlaywrightOps(): BrowserContextOptions {
        this.logger.debug('Converting session context to Playwright options');
        const cookies = this.cookies
            .filter(cookie => cookie.name && cookie.value)
            .map(cookie => {
                const playwrightCookie = {
                    name: cookie.name,
                    value: cookie.value,
                    ...(cookie.domain && { domain: cookie.domain }),
                    ...(cookie.path && { path: cookie.path }),
                    ...(typeof cookie.expires === 'number' && { expires: cookie.expires }),
                    ...(typeof cookie.httpOnly === 'boolean' && { httpOnly: cookie.httpOnly }),
                    ...(typeof cookie.secure === 'boolean' && { secure: cookie.secure }),
                    ...(cookie.sameSite && { sameSite: cookie.sameSite })
                };
                return playwrightCookie;
            });

        const storageState = {
            cookies,
            origins: this.origins.map(origin => ({
                origin: origin.origin,
                localStorage: origin.localStorage
            }))
        };
        return { storageState };
    }

    toJson(): any {
        return {
            cookies: this.cookies
                .filter(cookie => cookie && cookie.name && cookie.value)
                .map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    ...(cookie.domain && { domain: cookie.domain }),
                    ...(cookie.path && { path: cookie.path }),
                    ...(typeof cookie.expires === 'number' && { expires: cookie.expires }),
                    ...(typeof cookie.httpOnly === 'boolean' && { httpOnly: cookie.httpOnly }),
                    ...(typeof cookie.secure === 'boolean' && { secure: cookie.secure }),
                    ...(cookie.sameSite && { sameSite: cookie.sameSite })
                })),
            origins: this.origins.filter(origin =>
                origin &&
                origin.origin &&
                Array.isArray(origin.localStorage) &&
                origin.localStorage.length > 0
            )
        };
    }
}