import { resolve } from "bun";
import type Queue from "./queue";
import { YtDlp } from "ytdlp-nodejs";
import type { Job } from "./queue";

class Worker {
    id: Number;
    queue: Queue;
    ytdlp: YtDlp;

    constructor(queue: Queue, id: Number) {
        this.queue = queue;
        this.id = id;
        this.ytdlp = new YtDlp({
            binaryPath: process.env.BINARY_PATH
        });
    }

    async start() {
        while (true) {
            let nextJob = await this.queue.next()
            nextJob.status = 'processing'
            console.log(`[TURTUBE][JOB] ${nextJob.id} is getting processed by worker #${this.id}`)
            try {
                await this.ytdlp
                    .download(nextJob.sourceUrl)
                    .format({ filter: 'mergevideo', quality: '480p', type: 'mp4' })
                    .output(`./downloads/${nextJob.id}`)
                    .embedThumbnail()
                    .on('progress', (p) => nextJob.progress = p.percentage ?? 0)
                    .on('progress', (p) => console.log(`[TURTUBE][JOB] ${nextJob.id}: ${p.percentage_str}`))
                    .run();
                console.log(`[TURTUBE][JOB] ${nextJob.id} has been completed by worker #${this.id}`)
                nextJob.status = 'completed'
            } catch (error) {
                console.log(`[TURTUBE][JOB] ${nextJob.id}: ERROR ${error}`)
                nextJob.status = 'error'
            }

        }
    }
}

export default Worker;