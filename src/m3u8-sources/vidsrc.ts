import get from '../get';


class VidsrcM3U8Builder {
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    private findCloudnestraUrls(input: string): string[] {
        const pattern = /\/\/cloudnestra\.com\/rcp\/[^\s"']*/g;
        return input.match(pattern)?.map(e => `https:${e}`) ?? [];
    };

    private findProrcpUrls(input: string): string[] {
        const pattern = /\/prorcp\/[^\s"']*/g;
        return input.match(pattern)?.map(e => `https://cloudnestra.com${e}`) ?? [];
    };

    private findMasterM3u8Urls(input: string): string[] {
        const pattern = /https:\/\/[^\s"']*master\.m3u8/g;
        return input.match(pattern) || [];
    };

    private buildTvShowEndpoint({ tmdbid, season, episode }: { tmdbid: string, season: string, episode: string }) {
        return `${this.apiUrl}/tv/${tmdbid}/${season}-${episode}`;
    }

    private buildMovieEndpoint(tmdbid: string) {
        return `${this.apiUrl}/movie?tmdb=${tmdbid}`;
    }

    private buildEndpoint(data: { tmdbid: string, season?: string, episode?: string }) {
        // for tv shows
        if (data.season && data.episode) {
            return this.buildTvShowEndpoint(data as { tmdbid: string, season: string, episode: string })
        }

        // for movies
        return this.buildMovieEndpoint(data.tmdbid)
    }

    private cleanM3U8Url(m3u8Url: string) {
        return m3u8Url.replace(/{v1}/, "neonhorizonworkshops.com");
    }

    async build(data: { tmdbid: string, season?: string, episode?: string }) {
        let endpoint = this.buildEndpoint(data);

        let body = await get(endpoint);
        if (!body) {
            return null;
        }

        // Grab cloudnestra rcp URL
        const cloudnestraUrl = this.findCloudnestraUrls(body)[0] ?? null;
        if (!cloudnestraUrl) {
            return null;
        }

        // Grab cloudnestra prorcp URL HTML
        body = await get(cloudnestraUrl,);
        if (!body) {
            return null;
        }
        const prorcpUrl = this.findProrcpUrls(body)[0] ?? null;
        if (!prorcpUrl) {
            return null;
        }
        body = await get(prorcpUrl, { "Referer": cloudnestraUrl });
        if (!body) {
            return null;
        }

        // Find the master.m3u8 URL
        const m3u8Url = this.findMasterM3u8Urls(body)[0] ?? null;
        if (!m3u8Url) {
            return null;
        }

        return this.cleanM3U8Url(m3u8Url);
    }
}

export default VidsrcM3U8Builder;
