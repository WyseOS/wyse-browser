

import { BrowserContext, Page, Browser } from "playwright";
import { Tab } from "./tab";
import type { Tool, CallToolResult, CallToolRequest, Root } from '@modelcontextprotocol/sdk/types.js';
export type { Tool, CallToolResult, CallToolRequest, Root } from '@modelcontextprotocol/sdk/types.js';

export type BrowserContextFactoryResult = {
    browserContext: BrowserContext;
    close: (afterClose: () => Promise<void>) => Promise<void>;
};

export type ClientInfo = {
    name: string;
    version: string;
    roots: Root[];
    timestamp: number;
};

export interface BrowserContextFactory {
    createContext(clientInfo: ClientInfo, toolName: string | undefined): Promise<BrowserContextFactoryResult>;
}

export class SharedContextFactory implements BrowserContextFactory {
  private _contextPromise: Promise<BrowserContextFactoryResult> | undefined;
  private _baseFactory: BrowserContextFactory;
  private static _instance: SharedContextFactory | undefined;

  private constructor(baseFactory: BrowserContextFactory) {
    this._baseFactory = baseFactory;
  }

  async createContext(clientInfo: ClientInfo, toolName: string | undefined): Promise<{ browserContext: BrowserContext, close: () => Promise<void> }> {
    if (!this._contextPromise) {
      this._contextPromise = this._baseFactory.createContext(clientInfo, toolName);
    }

    const { browserContext } = await this._contextPromise;
    return {
      browserContext,
      close: async () => {
      },
    };
  }
}

export class Context { 
    
    private _browserContextPromise: Promise<BrowserContextFactoryResult> | undefined;
    private _closeBrowserContextPromise: Promise<void> | undefined;
    private _browserContextFactory: BrowserContextFactory;
    private _clientInfo: ClientInfo;
    private _runningToolName: string | undefined;
    protected _browserPromise: Promise<Browser> | undefined;

    private _tabs: Tab[] = [];
    private _currentTab: Tab | undefined;

    tabs(): Tab[] {
        return this._tabs;
    }

    currentTab(): Tab | undefined {
        return this._currentTab;
    }

    currentTabOrDie(): Tab {
        if (!this._currentTab)
            throw new Error('No open pages available. Use the "browser_navigate" tool to navigate to a page first.');
            return this._currentTab;
    }

    async newTab(): Promise<Tab> {
        const { browserContext } = await this._ensureBrowserContext();
        const page = await browserContext.newPage();
        this._currentTab = this._tabs.find(t => t.page === page)!;
        return this._currentTab;
    }

    async ensureTab(): Promise<Tab> {
        const { browserContext } = await this._ensureBrowserContext();
        if (!this._currentTab)
        await browserContext.newPage();
        return this._currentTab!;
    }
    
    async ensureBrowserContext(): Promise<BrowserContext> {
        const { browserContext } = await this._ensureBrowserContext();
        return browserContext;
    }

    private _ensureBrowserContext() {
        if (!this._browserContextPromise) {
            this._browserContextPromise = this._setupBrowserContext();
                this._browserContextPromise.catch(() => {
                this._browserContextPromise = undefined;
            });
        }
        return this._browserContextPromise;
    }

    private _onPageCreated(page: Page) {
        const tab = new Tab(this, page, tab => this._onPageClosed(tab));
        this._tabs.push(tab);

        if (!this._currentTab)
            this._currentTab = tab;
    }

    private _onPageClosed(tab: Tab) {
        const index = this._tabs.indexOf(tab);
        if (index === -1)
            return;
        this._tabs.splice(index, 1);

        if (this._currentTab === tab)
            this._currentTab = this._tabs[Math.min(index, this._tabs.length - 1)];

        // if (!this._tabs.length)
        //     void this.closeBrowserContext();
    }


    //   protected async _obtainBrowser(clientInfo: ClientInfo): Promise<Browser> {
    //     if (this._browserPromise)
    //         return this._browserPromise;
    
    //     this._browserPromise = this._doObtainBrowser(clientInfo);
    //     void this._browserPromise.then(browser => {
    //     browser.on('disconnected', () => {
    //         this._browserPromise = undefined;
    //     });
    //     }).catch(() => {
    //     this._browserPromise = undefined;
    //     });
    //     return this._browserPromise;
    // }
    private async _setupBrowserContext(): Promise<BrowserContextFactoryResult> {
        if (this._closeBrowserContextPromise)
            throw new Error('Another browser context is being closed.');

        // TODO: move to the browser context factory to make it based on isolation mode.
        const result = await this._browserContextFactory.createContext(this._clientInfo, this._runningToolName);
        return result;
    }
}
