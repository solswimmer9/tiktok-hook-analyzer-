import { env } from "process";

export interface TikTokSearchResponse {
  code: number;
  msg: string;
  processed_time: number;
  data: {
    videos: TikTokVideo[];
    cursor: string;
    hasMore: boolean;
  };
}

export interface TikTokVideo {
  aweme_id: string;
  video_id: string;
  region: string;
  title: string;
  cover: string;
  ai_dynamic_cover: string;
  origin_cover: string;
  duration: number;
  play: string;
  wmplay: string;
  size: number;
  wm_size: number;
  music: string;
  music_info: {
    id: string;
    title: string;
    play: string;
    cover: string;
    author: string;
    original: boolean;
    duration: number;
    album: string;
  };
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  download_count: number;
  collect_count: number;
  create_time: number;
  anchors: any;
  anchors_extras: string;
  is_ad: boolean;
  commerce_info: {
    adv_promotable: boolean;
    auction_ad_invited: boolean;
    branded_content_type: number;
  };
  item_comment_settings: number;
  mentioned_users: string;
  author: {
    id: string;
    unique_id: string;
    nickname: string;
    avatar: string;
    is_top: number;
  };
}

export interface TikTokDownloadResponse {
  play: string;
  play_watermark: string;
}

// Convert the API response to our internal format
export interface ProcessedTikTokVideo {
  id: string;
  title: string;
  createTime: number;
  duration: number;
  playAddr: string;
  downloadAddr: string;
  cover: string;
  dynamicCover: string;
  author: {
    id: string;
    uniqueId: string;
    nickname: string;
    avatarThumb: string;
    verified: boolean;
    following: number;
    fans: number;
  };
  stats: {
    diggCount: number;
    shareCount: number;
    commentCount: number;
    playCount: number;
    collectCount: number;
  };
  webVideoUrl: string;
  originalItem: boolean;
  officalItem: boolean;
}

class TikTokAPI {
  private baseURL = 'https://tiktok-scraper7.p.rapidapi.com';
  private headers: Record<string, string>;

  constructor() {
    const rapidApiKey = process.env.RAPID_API_KEY;
    if (!rapidApiKey) {
      throw new Error('RAPID_API_KEY environment variable is required');
    }

    this.headers = {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': 'tiktok-scraper7.p.rapidapi.com',
      'Content-Type': 'application/json',
    };
  }

  async searchVideos(
    keyword: string,
    cursor: string = "0"
  ): Promise<TikTokSearchResponse> {
    const params = new URLSearchParams({
      keywords: keyword,
      region: 'us',
      count: '20',
      cursor: cursor,
      publish_time: '0',
      sort_type: '0',
    });

    const url = `${this.baseURL}/feed/search?${params}`;
    console.log(`Making TikTok API request to: ${url}`);
    console.log('Request headers:', this.headers);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    console.log(`TikTok API response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TikTok API error response:', errorText);
      throw new Error(`TikTok API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('TikTok API response data structure:', {
      code: data.code,
      msg: data.msg,
      videosLength: data.data?.videos?.length || 0,
      cursor: data.data?.cursor,
      hasMore: data.data?.hasMore,
    });

    return data;
  }

  async downloadVideo(videoUrl: string): Promise<TikTokDownloadResponse> {
    const params = new URLSearchParams({
      url: videoUrl,
    });

    const url = `${this.baseURL}/api/download/video?${params}`;
    console.log(`Making TikTok download API request to: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    console.log(`TikTok download API response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TikTok download API error response:', errorText);
      throw new Error(`TikTok Download API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('TikTok download API raw response:', JSON.stringify(data, null, 2));
    console.log('TikTok download API response data structure:', {
      hasPlay: !!data.play,
      hasPlayWatermark: !!data.play_watermark,
      playUrlLength: data.play?.length || 0,
      playWatermarkUrlLength: data.play_watermark?.length || 0,
      responseKeys: Object.keys(data),
      playUrlPreview: data.play?.substring(0, 50) + '...' || 'no play URL'
    });

    return data;
  }

  // Convert API response to our internal format
  private processVideoData(apiVideo: TikTokVideo): ProcessedTikTokVideo {
    return {
      id: apiVideo.aweme_id,
      title: apiVideo.title || "No title",
      createTime: apiVideo.create_time,
      duration: apiVideo.duration,
      playAddr: apiVideo.play,
      downloadAddr: apiVideo.wmplay,
      cover: apiVideo.cover,
      dynamicCover: apiVideo.ai_dynamic_cover,
      author: {
        id: apiVideo.author.id,
        uniqueId: apiVideo.author.unique_id,
        nickname: apiVideo.author.nickname,
        avatarThumb: apiVideo.author.avatar,
        verified: false, // Not provided in new API
        following: 0, // Not provided in new API
        fans: 0, // Not provided in new API
      },
      stats: {
        diggCount: apiVideo.digg_count,
        shareCount: apiVideo.share_count,
        commentCount: apiVideo.comment_count,
        playCount: apiVideo.play_count,
        collectCount: apiVideo.collect_count,
      },
      webVideoUrl: `https://www.tiktok.com/@${apiVideo.author.unique_id}/video/${apiVideo.video_id}`,
      originalItem: !apiVideo.is_ad,
      officalItem: false,
    };
  }

  async searchVideosWithPagination(
    keyword: string,
    maxPages: number = 10,
    targetVideoCount: number = 100
  ): Promise<ProcessedTikTokVideo[]> {
    const allVideos: ProcessedTikTokVideo[] = [];
    let cursor: string = "0";
    let page = 0;

    console.log(`Starting TikTok search for "${keyword}" with max pages: ${maxPages}, target count: ${targetVideoCount}`);

    while (page < maxPages && allVideos.length < targetVideoCount) {
      try {
        console.log(`Fetching page ${page + 1} for keyword "${keyword}", cursor: ${cursor}`);
        const response = await this.searchVideos(keyword, cursor);

        console.log('API Response structure:', {
          code: response.code,
          msg: response.msg,
          videosLength: response.data?.videos?.length || 0,
          cursor: response.data?.cursor,
          hasMore: response.data?.hasMore
        });

        if (response.code !== 0) {
          console.error('API returned non-zero code:', response.code, response.msg);
          break;
        }

        if (!response.data?.videos || response.data.videos.length === 0) {
          console.log('No videos found in response, breaking loop');
          break;
        }

        // Process the videos
        const processedVideos = response.data.videos.map(video => this.processVideoData(video));
        allVideos.push(...processedVideos);
        console.log(`Added ${processedVideos.length} videos, total: ${allVideos.length}`);

        // Update pagination parameters
        cursor = response.data.cursor || cursor;

        // Break if no more pages
        if (!response.data.hasMore) {
          console.log('No more pages available, breaking loop');
          break;
        }

        page++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error fetching page ${page} for keyword "${keyword}":`, error);

        // If it's an API error, let's see the full response
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack
          });
        }

        break;
      }
    }

    console.log(`Total videos found: ${allVideos.length}`);
    return allVideos;
  }

  filterTopVideos(videos: ProcessedTikTokVideo[], percentage: number = 0.5): ProcessedTikTokVideo[] {
    // Sort by engagement score (combination of views, likes, shares, comments)
    const sortedVideos = videos.sort((a, b) => {
      const scoreA = a.stats.playCount + a.stats.diggCount + a.stats.shareCount + a.stats.commentCount;
      const scoreB = b.stats.playCount + b.stats.diggCount + b.stats.shareCount + b.stats.commentCount;
      return scoreB - scoreA;
    });

    const topCount = Math.ceil(sortedVideos.length * percentage);
    return sortedVideos.slice(0, topCount);
  }
}

export const tiktokApi = new TikTokAPI();