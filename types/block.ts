export interface Block {
  attributes: {
    allPostIds?: number[];
    backfillPosts?: number[];
    deduplication?: string;
    numberOfPosts?: number;
    postId?: number;
    posts?: number[];
    postTypes?: string[];
    query?: {
      include?: number[];
    }
    queryId?: number;
    validPosts?: number[];
  },
  clientId: string;
  name: string;
  innerBlocks?: Block[];
}
