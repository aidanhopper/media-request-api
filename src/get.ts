const get = async (url: string, headers?: object): Promise<string | null> => {
    console.log(`[INFO] GET ${url}`);
    const res = await fetch(url, {
        headers: { "User-Agent": "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0", ...headers }, // Mimic browser
    });
    if (!res.ok) {
        console.error(`[ERROR] Invalid request url: ${url}`);
        return null;
    }
    return res.text();
};

export default get;
