

export class Context {
    private _ensureBrowserContext() {
        if (!this._browserContextPromise) {
        this._browserContextPromise = this._setupBrowserContext();
        this._browserContextPromise.catch(() => {
            this._browserContextPromise = undefined;
        });
        }
        return this._browserContextPromise;
    }

    private async _setupBrowserContext(): Promise<BrowserContextFactoryResult> {
        if (this._closeBrowserContextPromise)
        throw new Error('Another browser context is being closed.');
        // TODO: move to the browser context factory to make it based on isolation mode.
        const result = await this._browserContextFactory.createContext(this._clientInfo, this._abortController.signal, this._runningToolName);
        const { browserContext } = result;
        await this._setupRequestInterception(browserContext);
        if (this.sessionLog)
        await InputRecorder.create(this, browserContext);
        for (const page of browserContext.pages())
        this._onPageCreated(page);
        browserContext.on('page', page => this._onPageCreated(page));
        if (this.config.saveTrace) {
        await (browserContext.tracing as Tracing).start({
            name: 'trace-' + Date.now(),
            screenshots: true,
            snapshots: true,
            _live: true,
        });
        }
        return result;
    }

    lookupSecret(secretName: string): { value: string, code: string } {
        if (!this.config.secrets?.[secretName])
        return { value: secretName, code: codegen.quote(secretName) };
        return {
        value: this.config.secrets[secretName]!,
        code: `process.env['${secretName}']`,
        };
    }
}