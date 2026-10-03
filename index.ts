import Queue, { type Job } from "./queue";
import type { JobOptions } from "./types/job";
import isValidUUID from "./util/isValidUUID";
import Worker from "./worker";

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

const server = Bun.serve({
    routes: {
<<<<<<< HEAD
=======
        "/api": {
            GET:
                middlewareInvoker(async (req: Request, server: any, next: () => any) => {

                    const apiKey = req.headers.get("x-api-key");

                    if (!apiKey) {
                        return Response.json({ message: "api-key is missing" }, { status: 403 })
                    }

                    if (!isApiKeyValid(apiKey, allowedKeyBuffers)) {
                        return Response.json({ message: "api-key is not valid." }, { status: 403 })
                    }

                    const res = await next();
                    return res;
                })
        },

>>>>>>> bec4d3daa0c1a87e3c39d0f4e2045a5a7a189905
        "/api/status": new Response("OK"),

        "/api/downloads": {
            POST: async req => {

<<<<<<< HEAD
                const apiKey = req.headers.get("x-api-key");

                if (!apiKey) {
                    return Response.json({ message: "api-key is missing" }, { status: 403 })
                }

                if (!isApiKeyValid(apiKey, allowedKeyBuffers)) {
                    return Response.json({ message: "api-key is not valid." }, { status: 403 })
                }

                const body: Job = await req.json();

                if (typeof body.sourceUrl !== "string") {
                    return Response.json({ message: "sourceUrl must be string" }, { status: 400 })
                }

=======
                const body: Job = await req.json();

                if (typeof body.sourceUrl !== "string") {
                    return Response.json({ message: "sourceUrl must be string" }, { status: 400 })
                }

>>>>>>> bec4d3daa0c1a87e3c39d0f4e2045a5a7a189905
                let sourceUrl: URL;

                try {
                    sourceUrl = new URL(body.sourceUrl);
                } catch (error) {
                    return Response.json({ message: "sourceUrl is not a valid URL" }, { status: 400 })
                }

                if (sourceUrl.protocol !== "https:" || sourceUrl.hostname !== "youtu.be") {
                    return Response.json({ message: "sourceUrl must be a valid youtube url" }, { status: 400 })
                }

                const videoId = sourceUrl.pathname.slice(1);
<<<<<<< HEAD

                if (!videoId || videoId.includes("/")) {
                    return Response.json(
                        { message: "sourceUrl must contain a valid YouTube video ID" },
                        { status: 400 }
                    );
                }

                const { resolution, muted }: JobOptions = body.options ?? { resolution: 'best', muted: false }
=======
>>>>>>> bec4d3daa0c1a87e3c39d0f4e2045a5a7a189905

                if (!videoId || videoId.includes("/")) {
                    return Response.json(
                        { message: "sourceUrl must contain a valid YouTube video ID" },
                        { status: 400 }
                    );
                }

                const { resolution, muted }: JobOptions = body.options ?? { resolution: 'best', muted: false }
                
                const job: Job = {
                    id: crypto.randomUUID(),
                    sourceUrl: String(sourceUrl),
                    options: {
                        resolution: resolution,
                        muted: muted,
                    }
                }

                queue.add(job)

                return Response.json({ id: job.id, status: "queued" }, { status: 200 });
            }
        },

        "/api/downloads/:id": {
            GET: async req => {

                const apiKey = req.headers.get("x-api-key");

                if (!apiKey) {
                    return Response.json({ message: "api-key is missing" }, { status: 403 })
                }

                if (!isApiKeyValid(apiKey, allowedKeyBuffers)) {
                    return Response.json({ message: "api-key is not valid." }, { status: 403 })
                }

                if (!isValidUUID(req.params.id)) {
                    return Response.json({ message: "The uuid is not valid" }, { status: 400 })
                }

                const job: Job | undefined = queue.getJobById(req.params.id);

                if (job === undefined) {
                    return Response.json({ message: "No download found for this uuid" }, { status: 404 })
                }

                if (job.status == "error") {
                    return Response.json({ message: "There was an unexpected error while downloading the video" }, { status: 500 })
                }

                if (job.status === "processing") {
                    return Response.json({ id: job.id, status: "processing", progress: job.progress }, { status: 202 })
                }

                if (job.status !== "completed") {
                    return Response.json({ message: "The video is still being downloaded, try again in a minute" }, { status: 202 })
                }

                return Response.json({ id: job.id, status: "completed", resource_url: `/api/downloads/${job.id}/file` }, { status: 200 })

            }


        },

        "/api/downloads/:id/file": {
            GET: async req => {

                const apiKey = req.headers.get("x-api-key");

                if (!apiKey) {
                    return Response.json({ message: "api-key is missing" }, { status: 403 })
                }

                if (!isApiKeyValid(apiKey, allowedKeyBuffers)) {
                    return Response.json({ message: "api-key is not valid." }, { status: 403 })
                }

                if (!isValidUUID(req.params.id)) {
                    return Response.json({ message: "The uuid is not valid" }, { status: 400 });
                }

                const glob = new Bun.Glob("*.mp4");

                const files = await Array.fromAsync(
                    glob.scan(`./downloads/${req.params.id}`)
                );

                if (files.length === 0) {
                    return Response.json({ message: "File not found" }, { status: 404 });
                }

                const file = Bun.file(`./downloads/${req.params.id}/${files[0]}`);

                if (!await file.exists()) {
                    return Response.json({ message: "File not found" }, { status: 404 });
                }

                return new Response(file, {
                    headers: {
                        "Content-Type": "video/mp4",
                        "Content-Disposition": `attachment; filename="${req.params.id}.mp4"`
                    }
                });
            }
        }
    }
})

console.log(`[TURTUBE] Server running at ${server.url}`);
