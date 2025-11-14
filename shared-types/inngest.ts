// Test
type HelloWorld = {
    data: {
        message: string;
    };
    user: {
        id: string;
    };
};

/*
TIKTOK HOOK ANALYZER
*/

type TikTokSearchVideos = {
    searchTermId: string;
    searchTerm: string;
    userId: string;
};

type TikTokDownloadVideo = {
    videoId: string;
    searchTermId: string;
    videoUrl: string;
    videoMetadata: {
        title: string;
        creator: string;
        creatorUsername: string;
        viewCount: number;
        likeCount: number;
        shareCount: number;
        commentCount: number;
        duration: number;
        thumbnailUrl: string;
    };
};

type TikTokAnalyzeHook = {
    videoId: string;
    r2Key: string;
    r2Url: string;
};

type TikTokGenerateTrends = {
    date: string;
};

/*
WEBHOOKS
*/
export type InngestEvents = {
    "test/hello.world": HelloWorld;
    /*
    TIKTOK HOOK ANALYZER
    */
    "tiktok/search-videos": TikTokSearchVideos;
    "tiktok/download-video": TikTokDownloadVideo;
    "tiktok/analyze-hook": TikTokAnalyzeHook;
    "tiktok/generate-trends": TikTokGenerateTrends;
};
