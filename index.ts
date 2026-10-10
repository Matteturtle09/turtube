import Queue from "./queue";
import type { Job } from "./types/job";
import type { JobOptions } from "./types/job";
import isValidUUID from "./util/isValidUUID";
import Worker from "./worker";
import { Elysia } from "elysia"

const queue = new Queue()

const numWorkers = Number(process.env.NUM_WORKERS ?? 1);

const workers = Array(numWorkers).keys().map((worker, i) => { return new Worker(queue, i) })

workers.forEach(worker => {
    worker.start();
});

const middlewareInvoker = (...fns) => (req, server) => {
    let i = 0;
    const next = () => fns[i++]?.(req, server, next);
    return next();
};

// Buffering of the Allowed Api Keys
const allowedKeyBuffers: Buffer[] = (process.env.API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
    .map((key) => Buffer.from(key));

function isApiKeyValid(apiKey: string, allowedKeyBuffers: Buffer<ArrayBufferLike>[]): boolean {
    const inputBuffer = Buffer.from(apiKey);

    // Cycles on every registered api key until it finds one that is valid.
    return allowedKeyBuffers.some((keyBuffer) => {

        // This function does not leak timing information that would allow an attacker to guess one of the values.
        return inputBuffer.length === keyBuffer.length && crypto.timingSafeEqual(inputBuffer, keyBuffer)
    })
}

const server = new Elysia()
    .onBeforeHandle(({ request, set }) => {
        const apiKey = request.headers.get("x-api-key")

        if (!apiKey) {
            set.status = 403
            return { message: "api-key is missing" }
        }

        if (!isApiKeyValid(apiKey, allowedKeyBuffers)) {
            set.status = 403
            return { message: "api-key is not valid." }
        }
    })

    .get("/api/status", () => "OK")

    .post("/api/downloads", async ({ request, set }) => {
        let body: Job

        try {
            body = await request.json()
        } catch {
            set.status = 400
            return { message: "Invalid JSON body" }
        }

        if (typeof body.sourceUrl !== "string") {
            set.status = 400
            return { message: "sourceUrl must be string" }
        }

        let sourceUrl: URL

        try {
            sourceUrl = new URL(body.sourceUrl)
        } catch {
            set.status = 400
            return { message: "sourceUrl is not a valid URL" }
        }

        if (
            sourceUrl.protocol !== "https:" ||
            sourceUrl.hostname !== "youtu.be"
        ) {
            set.status = 400
            return { message: "sourceUrl must be a valid youtube url" }
        }

        const videoId = sourceUrl.pathname.slice(1)

        if (!videoId || videoId.includes("/")) {
            set.status = 400
            return {
                message: "sourceUrl must contain a valid YouTube video ID"
            }
        }

        const {
            resolution = "best",
            muted = false
        } = body.options ?? {}

        const job: Job = {
            id: crypto.randomUUID(),
            sourceUrl: String(sourceUrl),
            options: {
                resolution,
                muted
            }
        }

        queue.add(job)

        set.status = 200

        return {
            id: job.id,
            status: "queued"
        }
    })

    .get("/api/downloads/:id", async ({ params, set }) => {
        if (!isValidUUID(params.id)) {
            set.status = 400
            return { message: "The uuid is not valid" }
        }

        const job = queue.getJobById(params.id)

        if (job === undefined) {
            set.status = 404
            return {
                message: "No download found for this uuid"
            }
        }

        if (job.status === "error") {
            set.status = 500
            return {
                message: "There was an unexpected error while downloading the video"
            }
        }

        if (job.status === "processing") {
            set.status = 202
            return {
                id: job.id,
                status: "processing",
                progress: job.progress
            }
        }

        if (job.status !== "completed") {
            set.status = 202
            return {
                message: "The video is still being downloaded, try again in a minute"
            }
        }

        set.status = 200

        return {
            id: job.id,
            status: "completed",
            resource_url: `/api/downloads/${job.id}/file`
        }
    })

    .get("/api/downloads/:id/file", async ({ params, set }) => {
        if (!isValidUUID(params.id)) {
            set.status = 400
            return { message: "The uuid is not valid" }
        }

        const glob = new Bun.Glob("*.mp4")

        const files = await Array.fromAsync(
            glob.scan(`./downloads/${params.id}`)
        )

        if (files.length === 0) {
            set.status = 404
            return { message: "File not found" }
        }

        const file = Bun.file(
            `./downloads/${params.id}/${files[0]}`
        )

        if (!await file.exists()) {
            set.status = 404
            return { message: "File not found" }
        }

        return new Response(file, {
            headers: {
                "Content-Type": "video/mp4",
                "Content-Disposition":
                    `attachment; filename="${params.id}.mp4"`
            }
        })
    })

    .listen(3000)

console.log(`[TURTUBE] Server running at  ${server.server?.hostname}:${server.server?.port}`);
