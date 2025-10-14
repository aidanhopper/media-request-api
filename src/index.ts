import express, { Request, Response } from "express";
import { spawn, exec as syncExec } from "child_process";
import { randomUUID } from "crypto";
import { promisify } from 'util';

const vidsrcApi = "https://vidsrc-embed.su/embed";
const ytDlpPath = "yt-dlp"; // Adjust to your yt-dlp binary path
const app = express();
app.use(express.text());

const PORT = 4321;

const exec = promisify(syncExec);

const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const get = async (url: string): Promise<string | null> => {
    console.log(`[INFO] GET ${url}`);
    const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" }, // Mimic browser
    });
    if (!res.ok) {
        console.error(`[ERROR] Invalid request url: ${url}`);
        return null;
    }
    return res.text();
};

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

app.get("*\w", async (req: Request, res: Response) => {
    // Grab embed HTML from vidsrc
    let vidsrcUrl = `${vidsrcApi}${req.url}`;
    let body = await get(vidsrcUrl);
    if (!body) {
        res.status(404).send("Invalid vidsrc endpoint");
        return;
    }

    // Grab cloudnestra rcp URL
    const cloudnestraUrl = findCloudnestraUrls(body)[0] ?? null;
    if (!cloudnestraUrl) {
        res.status(404).send("Could not find cloudnestra url");
        return;
    }

    // Grab cloudnestra prorcp URL HTML
    body = await get(cloudnestraUrl);
    if (!body) {
        res.status(404).send("Invalid cloudnestra rcp endpoint");
        return;
    }
    const protorcpUrl = findProrcpUrls(body)[0] ?? null;
    if (!protorcpUrl) {
        res.status(404).send("Could not find prorcp url in cloudnestra html");
        return;
    }
    body = await get(protorcpUrl);
    if (!body) {
        res.status(404).send("Invalid cloudnestra prorcp endpoint");
        return;
    }

    // Find the master.m3u8 URL
    const m3u8Url = findMasterM3u8Urls(body)[0] ?? null;
    if (!m3u8Url) {
        res.status(404).send("Could not find master.m3u8 url");
        return;
    }

    // Generate unique filename since URL format varies
    const uniqueId = randomUUID();

    // Download and stream with yt-dlp
    try {
        // Set headers for streaming
        res.setHeader("Content-Type", "video/x-matroska");
        res.setHeader("Content-Disposition", `attachment; filename="${uniqueId}.mkv"`);

        // Spawn yt-dlp process
        const ytDlp = spawn(ytDlpPath, [
            m3u8Url,
            "-o", "-", // Output to stdout for streaming
        ]);

        // Pipe yt-dlp output to response
        ytDlp.stdout.pipe(res);

        // Handle errors
        ytDlp.stderr.on("data", (data) => {
            console.error(`[INFO] yt-dlp: ${data}`);
        });

        ytDlp.on("error", (error) => {
            console.error(`[ERROR] yt-dlp: ${error.message}`);
            if (!res.headersSent) {
                res.status(500).send(`Download failed: ${error.message}`);
            }
        });

        ytDlp.on("close", (code) => {
            if (code !== 0) {
                console.error(`[ERROR] yt-dlp exited with code ${code}`);
                if (!res.headersSent) {
                    res.status(500).send(`Download failed: Exit code ${code}`);
                }
            }
        });
    } catch (error) {
        console.error(`[ERROR] Download failed for ${req.url}:`, error);
        if (!res.headersSent) {
            res.status(500).send(`Download failed: ${error}`);
        }
    }
});

// Check if yt-dlp binary exists and is executable
const checkYtDlp = async (): Promise<boolean> => {
    try {
        const { stdout } = await exec(`${ytDlpPath} --version`);
        console.log(`[INFO] yt-dlp found at ${ytDlpPath}, version: ${stdout.trim()}`);
        return true;
    } catch (error) {
        console.error(`[ERROR] yt-dlp not found or not executable at ${ytDlpPath}:`, error);
        return false;
    }
};

(async () => {
    const ytDlpAvailable = await checkYtDlp();
    if (!ytDlpAvailable) {
        console.error(`[FATAL] Cannot start server without yt-dlp. Exiting.`);
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`[INFO] Media Request API running on port ${PORT}`);
    });
})();
