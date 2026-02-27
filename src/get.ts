const get = async (url: string, additionalHeaders?: object): Promise<string | null> => {
    const _headers = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0", ...additionalHeaders }
    console.log(`[INFO] GET ${url} with headers ${JSON.stringify(_headers)}`);
    const res = await fetch(url, {
        headers: _headers,
    });
    if (!res.ok) {
        console.error(`[ERROR] Status ${res.status}, invalid request url: ${url}`);
        return null;
    }
    return res.text();
};

export default get;
