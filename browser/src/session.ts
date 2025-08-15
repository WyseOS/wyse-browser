import { Browser, BrowserContext, chromium, Page, CDPSession, BrowserContextOptions } from 'playwright';
import { DefaultSolveCaptcha, ExtensionPaths, DefaultTimezone, GetDefaultFingerprint } from './constants';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { OSSUpload } from './utils/oss';
import { GetDateYYYYMMDD } from './constants';
import { Logger } from '@nestjs/common';
import path from 'path';
import { getChromeExecutablePath } from "./utils/browser";
import { FingerprintInjector } from "fingerprint-injector";
import { BrowserFingerprintWithHeaders, FingerprintGenerator } from "fingerprint-generator";
import { newInjectedContext } from "fingerprint-injector";
import axios from 'axios';
import { SessionContext } from './session_context';

export class SessionPage {
  url: string;
  video_url: string;
  ws_debugger_url: string;
  front_debugger_url: string;
  page_id: string;
  debugger_host: string;

  constructor(url: string, video_url: string, ws_debugger_url: string, front_debugger_url: string, page_id: string, debugger_host: string) {
    this.url = url;
    this.video_url = video_url;
    this.ws_debugger_url = ws_debugger_url;
    this.front_debugger_url = front_debugger_url;
    this.page_id = page_id;
    this.debugger_host = debugger_host;
  }
}

export class SessionPageDebugerUrl {
  ws_debugger_url: string;
  front_debugger_url: string;
  page_id: string;
  debugger_host: string;

  constructor(ws_debugger_url: string, front_debugger_url: string, page_id: string, debugger_host: string) {
    this.ws_debugger_url = ws_debugger_url;
    this.front_debugger_url = front_debugger_url;
    this.page_id = page_id;
    this.debugger_host = debugger_host;
  }
}

export class Session {
  id: string;
  browserContext: BrowserContext;
  sessionContext: SessionContext;
  page: Page;
  isInitialized: boolean = false;
  createdAt: Date;
  timeout: number;
  width: number;
  height: number;
  solveCaptcha: boolean;
  private logger: Logger;
  isSaveVideo: boolean;
  lastActionTimestamp: number = 0;
  wsPort: number;
  private browser: Browser = null;
  private fingerprintData: BrowserFingerprintWithHeaders | null = null;
  private chromeExecPath: string;
  private cdpSession: CDPSession = null;
  private page_devtool_frontend_host: string;
  private page_devtool_ws_host: string;

  private asyncInitPromise: Promise<void> = null;
  private initializationStartTime: Date = null;
  private initializationTimeout: number = 30000;
  private isInitializationCancelled: boolean = false;
  private timeoutHandle: NodeJS.Timeout = null;


  constructor() {
    this.lastActionTimestamp = Math.floor(Date.now() / 1000);
  }

  public async waitForInitialization(): Promise<void> {
    if (this.asyncInitPromise) {
      await this.asyncInitPromise;
    }
  }

  async initialize(session_id: string, context: SessionContext, timeout: number, width: number, height: number, headless: boolean, page_devtool_frontend_host: string, page_devtool_ws_host: string): Promise<string> {
    this.logger = new Logger(Session.name);
    this.isInitialized = false;
    this.chromeExecPath = getChromeExecutablePath();
    this.wsPort = context.wsPort;
    this.timeout = timeout;
    this.sessionContext = context;
    this.isSaveVideo = context.isSaveVideo;
    this.createdAt = new Date();
    this.initializationStartTime = new Date();
    this.width = width;
    this.height = height;
    this.solveCaptcha = DefaultSolveCaptcha;
    this.page_devtool_frontend_host = page_devtool_frontend_host;
    this.page_devtool_ws_host = page_devtool_ws_host;

    if (session_id === null || session_id === undefined || session_id.length === 0) {
      this.id = uuidv4();
    } else {
      this.id = session_id;
    }

    let browserArgs = [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--disable-software-rasterizer',
      '--use-angle=disabled',
      '--disable-blink-features=AutomationControlled,PasswordManager,TranslateUI',
      '--lang=en-US',
      '--remote-allow-origins=*',
      '--remote-debugging-address=0.0.0.0',
      `--remote-debugging-port=${this.wsPort}`,
      `--timezone=${DefaultTimezone}`
    ];

    let launchOptions = {
      executablePath: this.chromeExecPath,
      headless: headless,
      args: browserArgs,
      permissions: ['clipboard-read', 'clipboard-write'],
      locale: 'en-US',
    }

    if (this.isSaveVideo) {
      if (!fs.existsSync(path.resolve('./output/videos'))) {
        fs.mkdirSync(path.resolve('./output/videos'), { recursive: true });
      }
      launchOptions['recordVideo'] = { dir: path.resolve('./output/videos/' + this.id) }
    }

    this.asyncInitPromise = this.finishAsyncSetupWithTimeout(context, browserArgs, launchOptions)
      .catch(error => {
        this.logger.error(`Initialization failed: ${error.message}`);
        throw error;
      });

    return this.id;
  }

  private async finishAsyncSetupWithTimeout(context: SessionContext, browserArgs: string[], launchOptions: BrowserContextOptions): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      this.timeoutHandle = setTimeout(() => {
        this.isInitializationCancelled = true;
        reject(new Error(`Session initialization timeout after ${this.initializationTimeout}ms`));
      }, this.initializationTimeout);
    });

    try {
      await Promise.race([
        this.finishAsyncSetup(context, browserArgs, launchOptions),
        timeoutPromise
      ]);

      // 成功完成，清理超时处理器
      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
        this.timeoutHandle = null;
      }
    } catch (error) {
      // 清理超时处理器
      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
        this.timeoutHandle = null;
      }

      if (this.isInitializationCancelled) {
        await this.cleanupFailedInitialization();
      }
      throw error;
    }
  }

  private async finishAsyncSetup(context: SessionContext, browserArgs: string[], launchOptions: BrowserContextOptions): Promise<void> {
    try {
      if (this.isInitializationCancelled) {
        throw new Error('Initialization was cancelled');
      }

      this.logger.log(`Session ${this.id}: Starting browser initialization`);

      // Common fingerprint options for both branches
      const fingerprintOptions = {
        devices: ["desktop" as const],
        operatingSystems: ["linux" as const],
        browsers: [{ name: "chrome" as const, minVersion: 120 }],
        locales: ["en-US", "en"],
        mockWebRTC: false,
        slim: true,
      };

      if (context.needExtension()) {
        let extensionPath = '';
        for (let extensionName of this.sessionContext.extensionNames) {
          if (!ExtensionPaths.hasOwnProperty(extensionName)) {
            throw new Error('no such find extension: ' + extensionName);
          }

          extensionPath = ExtensionPaths[extensionName];
          browserArgs.push('--load-extension=' + extensionPath);
        }

        if (context.extensionNames.length === 1) {
          browserArgs.push('--disable-extensions-except=' + extensionPath);
        }

        browserArgs.push('--disable-web-security');
        browserArgs.push('--disable-extensions-file-access-check');
        browserArgs.push('--disable-extensions-http-throttling');
        browserArgs.push('--disable-site-isolation-trials');

        if (!fs.existsSync(path.resolve('./user_data'))) {
          fs.mkdirSync(path.resolve('./user_data'), { recursive: true });
        }

        // Generate fingerprint for extension branch
        try {
          const fingerprintGen = new FingerprintGenerator(fingerprintOptions);
          this.fingerprintData = fingerprintGen.getFingerprint();

          if (!this.fingerprintData) {
            this.logger.warn('Failed to generate fingerprint, using default');
            this.fingerprintData = GetDefaultFingerprint();
          } else {
            // Validate generated fingerprint
            const userAgent = this.fingerprintData.fingerprint?.navigator?.userAgent;
            if (!userAgent || !userAgent.includes('Chrome/1')) { // Relaxed validation - just check for Chrome/1xx
              this.logger.warn(`Generated fingerprint has unexpected user agent: ${userAgent}, using default`);
              this.fingerprintData = GetDefaultFingerprint();
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to generate fingerprint: ${error.message}, using default`);
          this.fingerprintData = GetDefaultFingerprint();
        }

        this.browserContext = await chromium.launchPersistentContext(
          path.resolve("./user_data/" + this.id),
          {
            ...launchOptions,
            viewport: { width: this.width, height: this.height },
            userAgent: this.fingerprintData.fingerprint.navigator.userAgent,
            extraHTTPHeaders: this.getInjectableHeaders(this.fingerprintData.headers),
          }
        );

        // Inject fingerprint using FingerprintInjector
        const fingerprintInjector = new FingerprintInjector();
        await fingerprintInjector.attachFingerprintToPlaywright(this.browserContext, this.fingerprintData);
      } else {
        browserArgs.push('--disable-extensions');
        this.browser = await chromium.launch(launchOptions);

        // Use newInjectedContext for non-extension branch (as per documentation)
        this.browserContext = await newInjectedContext(
          this.browser,
          {
            fingerprintOptions: fingerprintOptions,
            newContextOptions: {
              viewport: { width: this.width, height: this.height },
            },
          }
        );

        // For non-extension branch, we need to get the fingerprint data from the context
        // Since newInjectedContext doesn't return the fingerprint data directly,
        // we'll generate it separately for consistency in toJson method
        try {
          const fingerprintGen = new FingerprintGenerator(fingerprintOptions);
          this.fingerprintData = fingerprintGen.getFingerprint();

          if (!this.fingerprintData) {
            this.logger.warn('Failed to generate fingerprint for logging, using default');
            this.fingerprintData = GetDefaultFingerprint();
          } else {
            // Validate generated fingerprint
            const userAgent = this.fingerprintData.fingerprint?.navigator?.userAgent;
            if (!userAgent || !userAgent.includes('Chrome/1')) { // Relaxed validation - just check for Chrome/1xx
              this.logger.warn(`Generated fingerprint for logging has unexpected user agent: ${userAgent}, using default`);
              this.fingerprintData = GetDefaultFingerprint();
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to generate fingerprint for logging: ${error.message}, using default`);
          this.fingerprintData = GetDefaultFingerprint();
        }
      }

      if (this.isInitializationCancelled) {
        throw new Error('Initialization was cancelled');
      }

      this.logger.log(`Session ${this.id}: Starting page initialization`);
      let pages = await this.browserContext.pages();
      if (pages && pages.length > 0) {
        this.page = pages[0];
        if (pages.length > 1) {
          for (let i = 1; i < pages.length; i++) {
            try {
              await pages[i].close();
            } catch (error) {
              this.logger.warn(`Failed to close page ${i}: ${error.message}`);
            }
          }
        }
      } else {
        this.page = await this.browserContext.newPage();
      }

      if (this.isInitializationCancelled) {
        throw new Error('Initialization was cancelled');
      }

      try {
        this.cdpSession = await this.browserContext.newCDPSession(this.page);
        this.logger.log(`Session ${this.id}: CDP session created successfully`);
      } catch (error) {
        this.logger.error(`Session ${this.id}: Failed to create CDP session: ${error.message}`);
        throw new Error(`CDP session creation failed: ${error.message}`);
      }

      this.page.setDefaultTimeout(this.timeout);

      if (this.page_devtool_frontend_host.includes("localhost")) {
        this.page_devtool_frontend_host = `${this.page_devtool_frontend_host}:${this.wsPort}`;
      }
      if (this.page_devtool_ws_host.includes("localhost")) {
        this.page_devtool_ws_host = `${this.page_devtool_ws_host}:${this.wsPort}`;
      }

      this.updateActionTimestamp();
      this.isInitialized = true;
      const initDuration = Date.now() - this.initializationStartTime.getTime();
      this.logger.log(`Session initialized successfully, id: ${this.id}, duration: ${initDuration}ms`);
    }
    catch (error) {
      this.logger.error(`Failed to finish async setup, error: ${error.message}, browser id: ${this.id}`);
      throw error;
    }
  }

  private async cleanupFailedInitialization(): Promise<void> {
    try {
      this.logger.log(`Session ${this.id}: Cleaning up failed initialization`);

      // 清理超时处理器
      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
        this.timeoutHandle = null;
      }

      if (this.cdpSession) {
        try {
          await this.cdpSession.detach();
        } catch (error) {
          this.logger.warn(`Error detaching CDP session: ${error.message}`);
        }
        this.cdpSession = null;
      }

      if (this.browserContext) {
        try {
          await this.browserContext.close();
        } catch (error) {
          this.logger.warn(`Error closing browser context: ${error.message}`);
        }
        this.browserContext = null;
      }

      if (this.browser) {
        try {
          await this.browser.close();
        } catch (error) {
          this.logger.warn(`Error closing browser: ${error.message}`);
        }
        this.browser = null;
      }

      // 清理扩展相关的用户数据目录
      if (this.sessionContext && this.sessionContext.needExtension()) {
        const userDataPath = path.resolve("./user_data/" + this.id);
        try {
          if (fs.existsSync(userDataPath)) {
            fs.rmSync(userDataPath, { recursive: true, force: true });
          }
        } catch (error) {
          this.logger.warn(`Error removing user data directory: ${error.message}`);
        }
      }

      this.page = null;
      this.fingerprintData = null;
      this.isInitialized = false;
    } catch (error) {
      this.logger.error(`Error during failed initialization cleanup: ${error.message}`);
    }
  }

  async addInitScript(script: string): Promise<void> {
    if (!this.isInitialized && this.asyncInitPromise) {
      await this.asyncInitPromise;
    }

    if (!this.isInitialized) {
      throw new Error('Session is not initialized, id: ' + this.id);
    }

    this.logger.log(`add init script`);
    await this.page.addInitScript(script);
  }

  async getPages(): Promise<Page[]> {
    if (!this.isInitialized && this.asyncInitPromise) {
      await this.asyncInitPromise;
    }

    if (!this.isInitialized) {
      throw new Error('Session is not initialized, id: ' + this.id);
    }
    return this.browserContext.pages();
  }

  async getDefaultPage(): Promise<Page> {
    const pages = await this.getPages();
    if (pages.length > 0) {
      return pages[0];
    }
    throw new Error('No pages available, id: ' + this.id);
  }

  public async getCDPSession(): Promise<CDPSession> {
    if (!this.isInitialized && this.asyncInitPromise) {
      await this.asyncInitPromise;
    }

    if (!this.isInitialized) {
      throw new Error('Session is not initialized, id: ' + this.id);
    }

    if (!this.cdpSession) {
      throw new Error('CDP session is not initialized, id: ' + this.id);
    }
    return this.cdpSession;
  }

  getWsPort(): number {
    return this.wsPort;
  }

  // Deprecated, use action screenshot instead
  async screenshot(): Promise<string> {
    if (!this.isInitialized && this.asyncInitPromise) {
      await this.asyncInitPromise;
    }

    if (!this.isInitialized) {
      throw new Error('Session is not initialized, id: ' + this.id);
    }

    this.updateActionTimestamp();

    const currentUrl = this.page.url();
    try {
      const isSpecialPage = this.isSpecialBrowserPage(currentUrl);
      if (!isSpecialPage) {
        await this.ensurePageReadyForScreenshot();
      }

      const buffer = await this.page.screenshot({
        timeout: 10000,
        fullPage: false
      });

      return buffer.toString('base64');
    } catch (error) {
      this.logger.error(`Screenshot failed for browser ${this.id}, error: ${error.message}`);
      throw new Error(`Screenshot failed: ${error.message}`);
    }
  }

  /**
   * Check if the given URL is a special browser page that doesn't need load state checking
   * @param url The URL to check
   * @returns boolean indicating if this is a special browser page
   */
  private isSpecialBrowserPage(url: string): boolean {
    // 空白页面
    if (url === 'about:blank') return true;

    // Chrome特殊页面
    if (url.startsWith('chrome://')) return true;
    if (url.startsWith('chrome-error://')) return true;
    if (url.startsWith('chrome-extension://')) return true;

    // 其他浏览器特殊页面
    if (url.startsWith('about:')) return true;
    if (url.startsWith('edge://')) return true;
    if (url.startsWith('firefox://')) return true;
    if (url.startsWith('view-source:')) return true;

    // 调试页面
    if (url.startsWith('devtools://')) return true;
    if (url.includes('__playwright_proxy__')) return true;

    // 文件协议
    if (url.startsWith('file://')) return true;

    // 数据URL
    if (url.startsWith('data:')) return true;

    return false;
  }

  /**
   * Ensure page is ready for screenshot
   * This includes waiting for page load and handling timeout scenarios
   */
  private async ensurePageReadyForScreenshot(): Promise<void> {
    if (!this.page) {
      throw new Error('Page is null or undefined');
    }

    const pageReadyTimeout = Math.min(this.timeout, 15000); // Max 15 seconds for page ready check

    try {
      // Wait for page to load completely with a reasonable timeout
      await this.page.waitForLoadState('load', { timeout: pageReadyTimeout });
    } catch (error) {
      this.logger.warn(`Page load timeout, attempting to stop loading: ${error.message}`);
      try {
        await this.page.evaluate("window.stop()");
        await this.page.waitForTimeout(1000);
      } catch (stopError) {
        this.logger.warn(`Failed to stop page loading: ${stopError.message}`);
      }
    }

    // Check and fix viewport size if needed
    try {
      const viewport = await this.page.viewportSize();
      if (viewport && (viewport.width !== this.width || viewport.height !== this.height)) {
        await this.page.setViewportSize({ width: this.width, height: this.height });
      }
    } catch (error) {
      this.logger.warn(`Failed to check or set viewport size: ${error.message}`);
    }
  }

  updateActionTimestamp(): void {
    this.lastActionTimestamp = Math.floor(Date.now() / 1000);
  }

  getSessionContext(): SessionContext {
    return this.sessionContext;
  }

  private async getDebuggerUrl(index: number, link: string): Promise<SessionPageDebugerUrl> {
    if (!this.isInitialized && this.asyncInitPromise) {
      await this.asyncInitPromise;
    }

    if (!this.wsPort || this.wsPort <= 0) {
      return new SessionPageDebugerUrl('', '', '', '');
    }

    try {
      const response = await axios.get(`http://localhost:${this.wsPort}/json/list`, {
        timeout: 5000
      });

      let j = -1;
      for (let i = response.data.length - 1; i >= 0; i--) {
        if (response.data[i].type !== 'page') {
          continue;
        }

        j += 1;
        if (link !== response.data[i].url) {
          continue;
        }

        if (j === index) {
          let wsUrl = response.data[i].webSocketDebuggerUrl;
          let wsDebuggerUrl = wsUrl.replace(`ws://localhost:${this.wsPort}`, this.page_devtool_ws_host);
          let paths = wsDebuggerUrl.split('/');
          let page_id = paths[paths.length - 1];
          let wsHost = this.page_devtool_ws_host.replace('ws://', '').replace('wss://', '');
          let frontDebuggerUrl = this.page_devtool_frontend_host + "/inspector.html?wss=" + wsHost + "/browser/devtool?page_id=" + page_id;
          if (this.page_devtool_ws_host.includes('localhost')) {
            frontDebuggerUrl = `${this.page_devtool_frontend_host}/inspector.html?ws=${wsHost}/devtools/page/${page_id}`;
          }
          return new SessionPageDebugerUrl(wsDebuggerUrl, frontDebuggerUrl, page_id, `${this.wsPort}`);
        }
      }
    } catch (error) {
      const msg = (error && (error as any).message) ? (error as any).message : String(error);
      this.logger.warn(`Failed to parse debugger url (wsPort=${this.wsPort}): ${msg}`);
    }

    return new SessionPageDebugerUrl('', '', '', '');
  }

  async dispose(): Promise<SessionPage[]> {
    if (!this.isInitialized && !this.asyncInitPromise) {
      return [];
    }

    if (!this.isInitialized && this.asyncInitPromise) {
      this.logger.log(`Session ${this.id} dispose called during initialization - cancelling initialization`);
      this.isInitializationCancelled = true;

      try {
        await Promise.race([
          this.asyncInitPromise,
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);
      } catch (error) {
        this.logger.warn(`Initialization cancellation completed with error: ${error.message}`);
      }

      await this.cleanupFailedInitialization();
      return [];
    }

    if (!this.isInitialized) {
      return [];
    }

    let browserPages = [];
    let pages: Page[] = [];

    try {
      pages = await this.getPages();
    } catch (error) {
      this.logger.error(`Error getting pages during dispose: ${error.message}`);
      return [];
    }

    let today = GetDateYYYYMMDD();

    if (this.cdpSession) {
      try {
        await this.cdpSession.detach();
        this.logger.log(`Session ${this.id}: CDP session detached successfully`);
      } catch (error) {
        this.logger.warn(`Error detaching CDP session during dispose: ${error.message}`);
      }
      this.cdpSession = null;
    }

    for (let i = 0; i < pages.length; i++) {
      const pageUrl = pages[i].url();
      let pageDebuger = await this.getDebuggerUrl(i, pageUrl);
      let sessionPage = new SessionPage(pageUrl, "", pageDebuger.ws_debugger_url, pageDebuger.front_debugger_url, pageDebuger.page_id, `localhost:${this.wsPort}`);
      if (this.isSaveVideo) {
        let video = await pages[i].video();
        if (video) {
          sessionPage.video_url = await pages[i].video().path();
        }
      }

      await pages[i].close();
      browserPages.push(sessionPage);
    }

    await this.browserContext.close();
    if (this.browser) {
      await this.browser.close();
    }

    if (this.isSaveVideo) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      for (let i = 0; i < browserPages.length; i++) {
        let videoPath = browserPages[i].video_url;
        if (!videoPath) {
          continue; // 跳过没有视频路径的页面
        }

        browserPages[i].video_url = '';
        const filename = "screenshot/" + today + "/" + this.id + "/video_" + path.basename(videoPath);

        try {
          // 检查文件是否存在
          if (!fs.existsSync(videoPath)) {
            this.logger.warn(`Video file not found: ${videoPath}`);
            continue;
          }

          let stats = await fs.promises.stat(videoPath);
          if (stats.size === 0) {
            this.logger.error(`Video is empty when upload: ${videoPath}`);
            continue;
          }

          browserPages[i].video_url = await OSSUpload.upload(filename, videoPath);
        } catch (error) {
          this.logger.warn(`Error processing video file ${videoPath}: ${error.message}`);
        }
      }
    }

    if (this.sessionContext.needExtension()) {
      try {
        const userDataPath = path.resolve("./user_data/" + this.id);
        if (fs.existsSync(userDataPath)) {
          fs.rmSync(userDataPath, { recursive: true, force: true });
        }
      } catch (error) {
        this.logger.warn(`Error removing user data directory: ${error.message}`);
      }
    }

    // 清理超时处理器
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

    this.browser = null;
    this.browserContext = null;
    this.page = null;
    this.fingerprintData = null;
    this.isInitialized = false;
    this.logger.log(`Session released, id: ${this.id}`);
    return browserPages;
  }

  async toJson(): Promise<any> {
    if (!this.isInitialized && this.asyncInitPromise) {
      try {
        await this.asyncInitPromise;
      } catch (error) {
        this.logger.error(`Error waiting for initialization during toJson: ${error.message}`);
      }
    }

    let ps = [];
    if (this.isInitialized) {
      try {
        let pages = await this.getPages();
        for (let i = 0; i < pages.length; i++) {
          let pageUrl = pages[i].url();
          let pageDebuger = await this.getDebuggerUrl(i, pageUrl);
          ps.push({
            'index': i,
            'url': pageUrl,
            'ws_debugger_url': pageDebuger.ws_debugger_url,
            'front_debugger_url': pageDebuger.front_debugger_url,
            'page_id': pageDebuger.page_id,
            'debugger_host': pageDebuger.debugger_host,
          });
        }
      } catch (error) {
        this.logger.error(`Error getting pages during toJson: ${error.message}`);
      }
    }

    return {
      id: this.id,
      session_context: this.sessionContext.toJson(),
      is_initialized: this.isInitialized,
      timeout: this.timeout,
      user_agent: this.fingerprintData?.fingerprint.navigator.userAgent,
      width: this.width,
      height: this.height,
      solve_captcha: this.solveCaptcha,
      created_at: this.createdAt,
      is_save_video: this.isSaveVideo,
      last_action_timestamp: this.lastActionTimestamp,
      pages: ps,
      ws_port: this.wsPort,
    };
  }

  private getInjectableHeaders(headers: Record<string, string>): Record<string, string> {
    const requestHeaders = [
      'accept-encoding',
      'accept',
      'cache-control',
      'pragma',
      'sec-fetch-dest',
      'sec-fetch-mode',
      'sec-fetch-site',
      'sec-fetch-user',
      'upgrade-insecure-requests',
      'te', // Chromium-based browsers don't support this
    ];

    const filteredHeaders: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (!requestHeaders.includes(key.toLowerCase())) {
        filteredHeaders[key] = value;
      }
    }

    return filteredHeaders;
  }
}

