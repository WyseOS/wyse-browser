import fs from 'fs';

export const getChromeExecutablePath = () => {
    if (process.platform === "win32") {
        const programFilesPath = `${process.env["ProgramFiles"]}\\Google\\Chrome\\Application\\chrome.exe`;
        const programFilesX86Path = `C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`;

        if (fs.existsSync(programFilesPath)) {
            return programFilesPath;
        } else if (fs.existsSync(programFilesX86Path)) {
            return programFilesX86Path;
        }
    }

    if (process.platform === "darwin") {
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    }

    return "/usr/bin/google-chrome-stable";
};