import { GoogleGenerativeAI } from '@google/generative-ai';

export interface HookAnalysisResult {
  openingLines: {
    transcript: string;
    effectiveness: number; // 1-10 scale
    techniques: string[];
    emotional_impact: string;
  };
  visualElements: {
    opening_shot: string;
    visual_hooks: string[];
    color_palette: string[];
    text_overlays: string[];
    transitions: string[];
  };
  engagementTactics: {
    hook_type: string; // question, statement, teaser, etc.
    curiosity_gaps: string[];
    social_proof: string[];
    urgency_indicators: string[];
    call_to_action: string;
  };
  overallScore: number; // 1-100 scale
  recommendations: string[];
  summary: string;
}

class GeminiClient {
  private client: GoogleGenerativeAI;
  private model: any;
  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorString = String(error).toLowerCase();

    return (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota exceeded') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('resource exhausted') ||
      errorString.includes('429') ||
      error?.status === 429 ||
      error?.code === 429
    );
  }

  /**
   * Retry a function with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, attempt);
          const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
          const totalDelay = delay + jitter;

          console.warn(
            `Rate limit hit for ${context}. Attempt ${attempt + 1}/${this.MAX_RETRIES}. ` +
            `Retrying in ${Math.round(totalDelay)}ms...`
          );

          await this.sleep(totalDelay);
          continue;
        }

        // If it's not a rate limit error, throw immediately
        throw error;
      }
    }

    // All retries exhausted
    console.error(`All ${this.MAX_RETRIES} retry attempts exhausted for ${context}`);
    throw lastError;
  }

  private getAnalysisPrompt(): string {
    return `
You are an expert TikTok hook analyzer. Analyze the provided TikTok video and provide a comprehensive analysis of its hook effectiveness.

Focus on the first 3-5 seconds of the video (the "hook") and analyze:

1. **Opening Lines**: What are the spoken words/text? How effective are they at grabbing attention?
2. **Visual Elements**: What visual techniques are used to capture attention?
3. **Engagement Tactics**: What psychological triggers are used to make viewers want to continue watching?

Provide your analysis in the following JSON format:

{
  "openingLines": {
    "transcript": "exact words spoken or text shown in first 3-5 seconds",
    "effectiveness": 8,
    "techniques": ["question", "bold statement", "contradiction", etc.],
    "emotional_impact": "curiosity/surprise/urgency/etc."
  },
  "visualElements": {
    "opening_shot": "describe the very first visual",
    "visual_hooks": ["fast cuts", "bright colors", "motion", "text overlay", etc.],
    "color_palette": ["dominant colors used"],
    "text_overlays": ["any text shown on screen"],
    "transitions": ["types of transitions used"]
  },
  "engagementTactics": {
    "hook_type": "question/statement/teaser/shock/etc.",
    "curiosity_gaps": ["specific gaps that make viewers want to continue"],
    "social_proof": ["follower counts", "likes shown", "testimonials", etc.],
    "urgency_indicators": ["time-sensitive language", "scarcity", etc.],
    "call_to_action": "what action is the viewer encouraged to take"
  },
  "overallScore": 85,
  "recommendations": ["specific suggestions to improve the hook"],
  "summary": "brief summary of hook effectiveness and main strengths/weaknesses"
}

Rate effectiveness on a scale of 1-10 where:
- 1-3: Poor hook, likely to be scrolled past
- 4-6: Average hook, some engagement
- 7-8: Good hook, likely to retain viewers
- 9-10: Excellent hook, highly engaging

Provide detailed, actionable insights that would help creators improve their hooks.
`;
  }

  async analyzeVideoHook(base64Video: string): Promise<HookAnalysisResult> {
    return this.retryWithBackoff(async () => {
      try {
        const prompt = this.getAnalysisPrompt();

        const result = await this.model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: 'video/mp4',
              data: base64Video,
            },
          },
        ]);

        const response = await result.response;
        const text = response.text();

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('Gemini response text:', text);
          throw new Error('Invalid response format from Gemini - no JSON found in response');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (!analysis.openingLines || !analysis.visualElements || !analysis.engagementTactics) {
          console.error('Incomplete Gemini analysis:', analysis);
          throw new Error('Incomplete analysis response from Gemini - missing required fields');
        }

        return analysis;
      } catch (error) {
        console.error('Error analyzing video with Gemini:', error);
        if (error instanceof Error) {
          // Preserve original error message
          throw new Error(`Failed to analyze video hook: ${error.message}`);
        }
        throw new Error('Failed to analyze video hook: Unknown error');
      }
    }, 'analyzeVideoHook');
  }

  async analyzeTrends(hookAnalyses: HookAnalysisResult[]): Promise<{
    commonPhrases: Array<{ phrase: string; count: number; effectiveness: number }>;
    visualThemes: Array<{ theme: string; count: number; avgScore: number }>;
    engagementPatterns: Array<{ pattern: string; count: number; avgScore: number }>;
    recommendations: string[];
    summary: string;
  }> {
    return this.retryWithBackoff(async () => {
      try {
        const prompt = `
Analyze the following TikTok hook analysis results and identify trends:

${JSON.stringify(hookAnalyses, null, 2)}

Provide a comprehensive trend analysis in the following JSON format:

{
  "commonPhrases": [
    { "phrase": "most common opening phrase", "count": 5, "effectiveness": 7.2 }
  ],
  "visualThemes": [
    { "theme": "fast cuts", "count": 8, "avgScore": 8.1 }
  ],
  "engagementPatterns": [
    { "pattern": "question hooks", "count": 12, "avgScore": 7.8 }
  ],
  "recommendations": [
    "specific recommendations based on trends"
  ],
  "summary": "key insights about what makes hooks effective"
}

Focus on:
1. Most frequently used opening phrases and their effectiveness
2. Visual techniques that appear most often and their performance
3. Engagement tactics that correlate with higher scores
4. Patterns in high-performing vs low-performing hooks
5. Actionable recommendations for creators
`;

        const result = await this.model.generateContent([prompt]);
        const response = await result.response;
        const text = response.text();

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid trend analysis response format');
        }

        return JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error('Error analyzing trends with Gemini:', error);
        throw new Error('Failed to analyze hook trends');
      }
    }, 'analyzeTrends');
  }

  async generateHookSuggestions(searchTerm: string, analysisResults: HookAnalysisResult[]): Promise<{
    suggestions: string[];
    rationale: string;
    examples: string[];
  }> {
    return this.retryWithBackoff(async () => {
      try {
        const prompt = `
Based on the analysis of TikTok videos for the search term "${searchTerm}", generate hook suggestions.

Analysis data:
${JSON.stringify(analysisResults.slice(0, 10), null, 2)}

Provide hook suggestions in the following JSON format:

{
  "suggestions": [
    "specific hook ideas for the topic",
    "opening lines that would work well",
    "visual techniques to use"
  ],
  "rationale": "explanation of why these suggestions work",
  "examples": [
    "example opening lines or visual concepts"
  ]
}

Focus on:
1. What works best for this specific topic/niche
2. Gaps in current content that could be exploited
3. Proven techniques from high-performing videos
4. Fresh approaches that haven't been overused
`;

        const result = await this.model.generateContent([prompt]);
        const response = await result.response;
        const text = response.text();

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid suggestion response format');
        }

        return JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error('Error generating hook suggestions:', error);
        throw new Error('Failed to generate hook suggestions');
      }
    }, 'generateHookSuggestions');
  }
}

export const geminiClient = new GeminiClient();