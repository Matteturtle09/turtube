
export type Job = {
    id: string
    sourceUrl: string
    options: JobOptions
    status?: 'queued' | 'claimed' | 'processing' | 'completed' | 'error'
    progress?: number
}

export type JobOptions = {
    resolution: 'best' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p' | 'highest' | 'lowest'
    muted: boolean;
}