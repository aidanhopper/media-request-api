import get from '../get';

const vidsrcApi = "https://vidsrc-embed.su/embed";

const findCloudnestraUrls = (input: string): string[] => {
    const pattern = /\/\/cloudnestra\.com\/rcp\/[^\s"']*/g;
    return input.match(pattern)?.map(e => `https:${e}`) ?? [];
};

const findProrcpUrls = (input: string): string[] => {
    const pattern = /\/prorcp\/[^\s"']*/g;
    return input.match(pattern)?.map(e => `https://cloudnestra.com${e}`) ?? [];
};

const findMasterM3u8Urls = (input: string): string[] => {
    const pattern = /https:\/\/[^\s"']*master\.m3u8/g;
    return input.match(pattern) || [];
};

const find = async (endpoint: string) => {
    const vidsrcUrl = `${vidsrcApi}${endpoint}`;
    console.log(vidsrcUrl);
    let body = await get(vidsrcUrl);
    if (!body) {
        return null;
    }

    // Grab cloudnestra rcp URL
    const cloudnestraUrl = findCloudnestraUrls(body)[0] ?? null;
    if (!cloudnestraUrl) {
        return null;
    }

    // Grab cloudnestra prorcp URL HTML
    body = await get(cloudnestraUrl);
    if (!body) {
        return null;
    }
    const protorcpUrl = findProrcpUrls(body)[0] ?? null;
    if (!protorcpUrl) {
        return null;
    }
    body = await get(protorcpUrl);
    if (!body) {
        return null;
    }

    // Find the master.m3u8 URL
    const m3u8Url = findMasterM3u8Urls(body)[0] ?? null;
    if (!m3u8Url) {
        return null;
    }
}

export default find;
