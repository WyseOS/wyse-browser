
export const logErrorMsg = (message: string): void => {
    console.error(message);
};

export const logError = (message: string, error: Error): void => {
    console.error(message, error);
};