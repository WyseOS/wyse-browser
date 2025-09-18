import path from 'path';
import fs from 'fs';
import { BrowserFingerprintWithHeaders } from 'fingerprint-generator';

export enum CommonFlows {
    flow_start = 'FlowStart',
    flow_end = 'FlowEnd',
}

export enum CommonWorklets {
    FlowStart = 'FlowStart',
    FlowEnd = 'FlowEnd',
    IOUtil = 'IOUtil',
}

export enum MetadataType {
    EDGE = "edge",
    CONNECTION = "connection",
    WORKLET = "worklet",
    ACTION = "action",
    FLOW = "flow",
    SESSION = "session"
}

export const MaxFlowNameLength = 64;
export const MinFlowNameLength = 4;

export const MaxFlowContentLength = 1024;

export const MaxWorkletNameLength = 32;
export const MinWorkletNameLength = 4;

export const FlowMetadataPath = "configs/flows/";
export const WorkletMetadataPath = "configs/worklets/";

export const MaxPagesNumberPerSession = 10;

export const DefaultBasedWsPort = 9400;

export const DefaultUserAgent = () => `Mozilla/5.${Math.random() * 3 | 0} (X11; Linux x86_64) AppleWebKit/${537 + Math.random() * 10 | 0}.36 (KHTML, like Gecko) Chrome/${91 - Math.random() * 4 | 0}.${Math.random() * 4 | 0}.${4472 - Math.random() * 100 | 0}.${124 + Math.random() * 40 | 0} Safari/${537 - Math.random() * 20 | 0}.${36 + Math.random() * 30}`;
export const DefaultRegion = "US/Pacific";
export const DefaultSolveCaptcha = false;
export const DefaultWidth = 1440;
export const DefaultHeight = 900;
export const DefaultTimeout = 20 * 1000;     // Page Loading Timeout
export const DefaultElementTimeout = 10000;  // Elements Waiting Timeout
export const DefaultTimezone = "America/New_York";

export const ExtensionPaths = {
    'metamask': path.resolve('./extensions/metamask')
};

export function GetDateYYYYMMDD(): string {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export enum BrowserActionType {
    Url = "url",
    Visit = "visit",
    History = "history",
    Search = "search",
    Click = "click",
    ClickFull = "click_full",
    RefreshPage = "refresh_page",
    DoubleClick = "double_click",
    Text = "text",
    ScrollUp = "scroll_up",
    ScrollDown = "scroll_down",
    ScrollElementUp = "scroll_element_up",
    ScrollElementDown = "scroll_element_down",
    HOVER = "hover",
    KeyPress = "key_press",
    Drag = "drag",
    SelectOption = "select_option",
    CreateTab = "create_tab",
    SwitchTab = "switch_tab",
    CloseTab = "close_tab",
    TabsInfo = "tabs_info",
    ScrollTo = "scroll_to",
    Wait = "wait",
    Evaluate = "evaluate",
    InitJS = "init_js",
    WaitForLoadState = "wait_for_load_state",
    Content = "content",
    EnsurePageReady = "ensure_page_ready",
    CleanupAnimations = "cleanup_animations",
    PreviewAction = "preview_action",
    SetContent = "set_content",
    Screenshot = "screenshot",
}

/**
 * Dynamically loads the browser script content from page_script.js file
 * @returns {string} The content of the page script
 */
export function GetInitJS(): string {
    // prod
    let scriptPath = path.join(__dirname, 'page_script.js');
    if (fs.existsSync(scriptPath)) {
        return fs.readFileSync(scriptPath, 'utf8');
    }

    // dev
    const sourcePath = path.resolve(process.cwd(), 'src', 'constants', 'page_script.js');
    if (fs.existsSync(sourcePath)) {
        return fs.readFileSync(sourcePath, 'utf8');
    }

    throw new Error(`page_script.js not found in either ${scriptPath} or ${sourcePath}`);
}

/**
 * Returns a default browser fingerprint with headers, used as fallback when fingerprint generation fails.
 * This should match the configuration used in session.ts (Linux desktop with Chrome 130+)
 * @returns {BrowserFingerprintWithHeaders} Default fingerprint object
 */
export function GetDefaultFingerprint(): BrowserFingerprintWithHeaders {
    return {
        fingerprint: {
            screen: {
                availHeight: 900,
                availWidth: 1440,
                availTop: 0,
                availLeft: 0,
                colorDepth: 24,
                height: 900,
                pixelDepth: 24,
                width: 1440,
                devicePixelRatio: 1,
                pageXOffset: 0,
                pageYOffset: 0,
                innerHeight: 860,
                outerHeight: 900,
                outerWidth: 1440,
                innerWidth: 1400,
                screenX: 0,
                clientWidth: 1400,
                clientHeight: 860,
                hasHDR: false
            },
            navigator: {
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                userAgentData: {
                    brands: [
                        { brand: 'Chromium', version: '120' },
                        { brand: 'Google Chrome', version: '120' },
                        { brand: 'Not(A:Brand', version: '99' }
                    ],
                    mobile: false,
                    platform: 'Linux',
                    architecture: 'x86',
                    bitness: '64',
                    model: '',
                    platformVersion: '',
                    uaFullVersion: '120.0.6099.130',
                    fullVersionList: [
                        { brand: 'Chromium', version: '120.0.6099.130' },
                        { brand: 'Google Chrome', version: '120.0.6099.130' },
                        { brand: 'Not(A:Brand', version: '99.0.0.0' }
                    ]
                },
                doNotTrack: '1',
                appCodeName: 'Mozilla',
                appName: 'Netscape',
                appVersion: '5.0 (X11; Linux x86_64)',
                oscpu: 'Linux x86_64',
                webdriver: 'false',
                language: 'en-US',
                languages: ['en-US', 'en'],
                platform: 'Linux x86_64',
                hardwareConcurrency: 8,
                product: 'Gecko',
                productSub: '20100101',
                vendor: 'Google Inc.',
                vendorSub: '',
                extraProperties: {
                    vendorFlavors: [],
                    isBluetoothSupported: null,
                    globalPrivacyControl: null,
                    pdfViewerEnabled: true,
                    installedApps: []
                },
            },
            videoCodecs: {},
            audioCodecs: {},
            pluginsData: {},
            videoCard: { renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', vendor: 'Intel Inc.' },
            multimediaDevices: [],
            fonts: [],
            mockWebRTC: false,
        },
        headers: {}
    };
}

export const FILE_CONSTANTS = {
    MAX_FILE_SIZE_PER_SESSION: 100 * 1024 * 1024, // 100MB
    UPLOAD_TEMP_DIR: '/tmp/file-uploads',
    ARCHIVE_DIR: '/tmp/.browser',
} as const;