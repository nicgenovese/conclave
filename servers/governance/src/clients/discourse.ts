/**
 * Discourse Forum API Client
 * For governance forum sentiment analysis
 * Different protocols have different forum URLs
 */

// Protocol to Discourse forum URL mapping
const PROTOCOL_FORUMS: Record<string, string> = {
  'aave': 'https://governance.aave.com',
  'uniswap': 'https://gov.uniswap.org',
  'compound': 'https://www.comp.xyz',
  'maker': 'https://forum.makerdao.com',
  'ens': 'https://discuss.ens.domains',
  'gitcoin': 'https://gov.gitcoin.co',
  'optimism': 'https://gov.optimism.io',
  'arbitrum': 'https://forum.arbitrum.foundation',
  'balancer': 'https://forum.balancer.fi',
  'lido': 'https://research.lido.fi'
};

export interface DiscourseTopic {
  id: number;
  title: string;
  slug: string;
  postsCount: number;
  replyCount: number;
  viewCount: number;
  likeCount: number;
  categoryId: number;
  categoryName?: string;
  createdAt: string;
  lastPostedAt: string;
  pinned: boolean;
  visible: boolean;
  closed: boolean;
  archived: boolean;
  excerpt?: string;
  posters: Array<{
    userId: number;
    description: string;
  }>;
}

export interface DiscoursePost {
  id: number;
  topicId: number;
  userId: number;
  username: string;
  cooked: string; // HTML content
  raw?: string;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  likeCount: number;
  readsCount: number;
}

export interface DiscourseUser {
  id: number;
  username: string;
  name?: string;
  trustLevel: number;
  admin: boolean;
  moderator: boolean;
  postCount: number;
  topicsEntered: number;
  likesGiven: number;
  likesReceived: number;
  createdAt: string;
  lastSeenAt: string;
}

export interface DiscourseCategory {
  id: number;
  name: string;
  slug: string;
  topicCount: number;
  postCount: number;
  description: string;
}

export class DiscourseClient {
  private rateLimitDelay = 500; // 500ms between requests (Discourse rate limits)
  private lastRequest = 0;

  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequest = Date.now();
  }

  private getForumUrl(protocol: string): string | null {
    return PROTOCOL_FORUMS[protocol.toLowerCase()] || null;
  }

  private async request<T>(baseUrl: string, endpoint: string): Promise<T> {
    await this.throttle();

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Discourse API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as T;
    return data;
  }

  async getLatestTopics(protocol: string, options: {
    page?: number;
    categorySlug?: string;
  } = {}): Promise<DiscourseTopic[]> {
    const baseUrl = this.getForumUrl(protocol);
    if (!baseUrl) return [];

    const page = options.page || 0;

    try {
      let endpoint = `/latest.json?page=${page}`;
      if (options.categorySlug) {
        endpoint = `/c/${options.categorySlug}.json?page=${page}`;
      }

      const result = await this.request<{
        topic_list: {
          topics: Array<{
            id: number;
            title: string;
            slug: string;
            posts_count: number;
            reply_count: number;
            views: number;
            like_count: number;
            category_id: number;
            created_at: string;
            last_posted_at: string;
            pinned: boolean;
            visible: boolean;
            closed: boolean;
            archived: boolean;
            excerpt?: string;
            posters: Array<{ user_id: number; description: string }>;
          }>;
        };
      }>(baseUrl, endpoint);

      return (result.topic_list?.topics || []).map(t => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
        postsCount: t.posts_count,
        replyCount: t.reply_count,
        viewCount: t.views,
        likeCount: t.like_count,
        categoryId: t.category_id,
        createdAt: t.created_at,
        lastPostedAt: t.last_posted_at,
        pinned: t.pinned,
        visible: t.visible,
        closed: t.closed,
        archived: t.archived,
        excerpt: t.excerpt,
        posters: t.posters.map(p => ({ userId: p.user_id, description: p.description }))
      }));
    } catch {
      return [];
    }
  }

  async getTopic(protocol: string, topicId: number): Promise<{
    topic: DiscourseTopic;
    posts: DiscoursePost[];
  } | null> {
    const baseUrl = this.getForumUrl(protocol);
    if (!baseUrl) return null;

    try {
      const result = await this.request<{
        id: number;
        title: string;
        slug: string;
        posts_count: number;
        reply_count: number;
        views: number;
        like_count: number;
        category_id: number;
        created_at: string;
        last_posted_at: string;
        pinned: boolean;
        visible: boolean;
        closed: boolean;
        archived: boolean;
        post_stream: {
          posts: Array<{
            id: number;
            topic_id: number;
            user_id: number;
            username: string;
            cooked: string;
            raw?: string;
            created_at: string;
            updated_at: string;
            reply_count: number;
            like_count: number;
            reads: number;
          }>;
        };
      }>(baseUrl, `/t/${topicId}.json`);

      const topic: DiscourseTopic = {
        id: result.id,
        title: result.title,
        slug: result.slug,
        postsCount: result.posts_count,
        replyCount: result.reply_count,
        viewCount: result.views,
        likeCount: result.like_count,
        categoryId: result.category_id,
        createdAt: result.created_at,
        lastPostedAt: result.last_posted_at,
        pinned: result.pinned,
        visible: result.visible,
        closed: result.closed,
        archived: result.archived,
        posters: []
      };

      const posts: DiscoursePost[] = (result.post_stream?.posts || []).map(p => ({
        id: p.id,
        topicId: p.topic_id,
        userId: p.user_id,
        username: p.username,
        cooked: p.cooked,
        raw: p.raw,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        replyCount: p.reply_count,
        likeCount: p.like_count,
        readsCount: p.reads
      }));

      return { topic, posts };
    } catch {
      return null;
    }
  }

  async getCategories(protocol: string): Promise<DiscourseCategory[]> {
    const baseUrl = this.getForumUrl(protocol);
    if (!baseUrl) return [];

    try {
      const result = await this.request<{
        category_list: {
          categories: Array<{
            id: number;
            name: string;
            slug: string;
            topic_count: number;
            post_count: number;
            description: string;
          }>;
        };
      }>(baseUrl, '/categories.json');

      return (result.category_list?.categories || []).map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        topicCount: c.topic_count,
        postCount: c.post_count,
        description: c.description
      }));
    } catch {
      return [];
    }
  }

  async searchTopics(protocol: string, query: string, options: {
    limit?: number;
  } = {}): Promise<DiscourseTopic[]> {
    const baseUrl = this.getForumUrl(protocol);
    if (!baseUrl) return [];

    try {
      const result = await this.request<{
        topics: Array<{
          id: number;
          title: string;
          slug: string;
          posts_count: number;
          reply_count: number;
          views: number;
          like_count: number;
          category_id: number;
          created_at: string;
          last_posted_at: string;
          pinned: boolean;
          visible: boolean;
          closed: boolean;
          archived: boolean;
        }>;
      }>(baseUrl, `/search.json?q=${encodeURIComponent(query)}`);

      return (result.topics || []).slice(0, options.limit || 20).map(t => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
        postsCount: t.posts_count,
        replyCount: t.reply_count,
        viewCount: t.views,
        likeCount: t.like_count,
        categoryId: t.category_id,
        createdAt: t.created_at,
        lastPostedAt: t.last_posted_at,
        pinned: t.pinned,
        visible: t.visible,
        closed: t.closed,
        archived: t.archived,
        posters: []
      }));
    } catch {
      return [];
    }
  }

  /**
   * Simple sentiment analysis based on engagement metrics
   * Returns score from -1 (negative) to 1 (positive)
   */
  analyzeSentiment(topic: DiscourseTopic): {
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
    score: number;
  } {
    // Engagement ratio (likes per reply/view)
    const engagementRatio = topic.viewCount > 0
      ? topic.likeCount / topic.viewCount
      : 0;

    // Reply ratio (high replies = controversial or engaging)
    const replyRatio = topic.postsCount > 1
      ? topic.replyCount / topic.postsCount
      : 0;

    // Base score on engagement (more likes = more positive)
    let score = Math.min(engagementRatio * 50, 1);

    // Adjust for controversial topics (lots of replies but fewer likes)
    if (replyRatio > 2 && engagementRatio < 0.01) {
      score -= 0.3; // Likely controversial
    }

    // Closed topics often indicate resolution (neutral) or problems (negative)
    if (topic.closed && !topic.archived) {
      score -= 0.1;
    }

    // Clamp score
    score = Math.max(-1, Math.min(1, score));

    let sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
    if (score > 0.2) sentiment = 'positive';
    else if (score < -0.2) sentiment = 'negative';
    else if (replyRatio > 3) sentiment = 'mixed';
    else sentiment = 'neutral';

    return { sentiment, score };
  }

  isForumSupported(protocol: string): boolean {
    return this.getForumUrl(protocol) !== null;
  }
}
