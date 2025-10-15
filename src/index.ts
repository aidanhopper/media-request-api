import express, { Request, Response } from "express";
import { spawn, exec as syncExec } from "child_process";
import { randomUUID } from "crypto";
import { promisify } from 'util';
import findVidsrc from './m3u8-sources/vidsrc';
import findHydra from './m3u8-sources/hydrahd';

const ytDlpPath = "yt-dlp"; // Adjust to your yt-dlp binary path
const app = express();
app.use(express.text());

const PORT = 4321;

const exec = promisify(syncExec);

const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const download = (m3u8url: string, res: Response) => {
    // Generate unique filename since URL format varies
    const uniqueId = randomUUID();

    // Download and stream with yt-dlp
    try {
        // Set headers for streaming
        res.setHeader("Content-Type", "video/x-matroska");
        res.setHeader("Content-Disposition", `attachment; filename="${uniqueId}.mkv"`);

        // Spawn yt-dlp process
        const ytDlp = spawn(ytDlpPath, [
            m3u8url,
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
        console.error(`[ERROR] Download failed: `, error);
        if (!res.headersSent) {
            res.status(500).send(`Download failed: ${error}`);
        }
    }
}

app.get("/:tmdbid", async (req: Request, res: Response) => {
    const m3u8url = await findHydra({ tmdbid: req.params.tmdbid });
    if (!m3u8url) {
        res.send("Failed to find source media");
        return;
    }
    download(m3u8url, res);
});

app.get("/:tmdbid/:season/:episode", async (req: Request, res: Response) => {
    const m3u8url = await findHydra({ tmdbid: req.params.tmdbid, season: req.params.season, episode: req.params.episode });
    if (!m3u8url) {
        res.send("Failed to find source media");
        return;
    }
    download(m3u8url, res);
});

// app.get("/vidsrc/*\w", async (req: Request, res: Response) => {
//     const m3u8url = await findVidsrc(req.url.replace("/vidsrc", ""));
//     if (!m3u8url) {
//         res.send("Failed to find source media");
//         return;
//     }
//     download(m3u8url, res);
// });

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
