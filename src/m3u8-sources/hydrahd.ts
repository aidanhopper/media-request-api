import get from '../get';

const findM3u8Urls = (input: string): string[] => {
    const pattern = /https:\\\/\\\/[^\s]+\.m3u8/;
    const match = input.match(pattern);
    if (!match) {
        return [];
    }
    return match.map(e => e.replace(/\\/g, ""));
};

// ex: https://hydrahd.ru/ajax/1_m1.php?tmdbid=157336
//     https://hydrahd.ru/ajax/1_s1.php?tmdbid=60059&season=1&episode=1

const find = async ({ tmdbid, season, episode }: { tmdbid: string, season?: string, episode?: string }) => {
    let body;
    if (season && episode) {
        body = await get(`https://hydrahd.ru/ajax/1_s1.php?tmdbid=${tmdbid}&season=${season}&episode=${episode}`,
            { 'Sec-Fetch-Site': 'same-origin' });
    }
    else {
        body = await get(`https://hydrahd.ru/ajax/1_m1.php?tmdbid=${tmdbid}`,
            { 'Sec-Fetch-Site': 'same-origin' });
    }
    if (!body) {
        return null;
    }
    return findM3u8Urls(body)[0] || null;
}

export default find;
