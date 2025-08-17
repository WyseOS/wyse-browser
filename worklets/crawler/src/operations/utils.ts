export const cleanWebsiteUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    try {
        const parsed = new URL(rawUrl);
        Array.from(parsed.searchParams.keys())
            .filter((key) => /^utm_/i.test(key))
            .forEach((key) => parsed.searchParams.delete(key));
        return parsed.toString();
    } catch {
        try {
            const parsed = new URL(rawUrl, 'https://www.toolify.ai');
            Array.from(parsed.searchParams.keys())
                .filter((key) => /^utm_/i.test(key))
                .forEach((key) => parsed.searchParams.delete(key));
            return parsed.toString();
        } catch {
            return rawUrl;
        }
    }
};

export const formatCompactNumber = (value: number): string => {
    if (!Number.isFinite(value)) return '';
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return `${value}`;
};

export const stripImageQueryParams = (rawUrl: string): string => {
    if (!rawUrl) return '';
    try {
        const u = new URL(rawUrl);
        u.search = '';
        return u.toString();
    } catch {
        return rawUrl.split('?')[0];
    }
};