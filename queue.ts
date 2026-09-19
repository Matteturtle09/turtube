
export type Job = {
    id: string
    sourceUrl: string
    status?: 'queued' | 'claimed' | 'processing' | 'completed' | 'error'
    progress?: number;
}

class Queue {
    private jobs: Job[];
    private resolveNext: ((job: Job) => void)[] = [];
    constructor() {
        this.jobs = [];
    }

    add(job: Job) {
        job.status = "queued";
        console.log(`[TURTUBE][JOB] ${job.id} has been queued`)
        this.jobs.push(job);
        this.notifyWorkers();
    }

    next(): Job | Promise<Job> {
        const job = this.jobs.find((job) => job.status === "queued");

        if (job) {
            console.log(`[TURTUBE][JOB] ${job.id} has been claimed by a worker`)
            job.status = "claimed";
            return job;
        }

        return new Promise<Job>(resolve => {
            this.resolveNext.push(resolve);
        })
    }

    private notifyWorkers() {
        const job = this.jobs.find((job) => job.status === "queued");

        if (!job) {
            return
        }

        const resolve = this.resolveNext.shift()

        if (!resolve) {
            return
        }

        console.log(`[TURTUBE][JOB] ${job.id} has been claimed by a worker`)
        job.status = "claimed";

        resolve(job);
    }

    getJobById(id: String): Job | undefined {
        return this.jobs.find((job: Job) => job.id === id)
    }
}

export default Queue