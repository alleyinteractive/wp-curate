export interface Block {
  attributes: {
    backfillPosts?: number[];
    deduplication?: string;
    numberOfPosts?: number;
    posts?: number[];
    postTypes?: string[];
    query?: {
      include?: number[];
    }
    validPosts?: number[];
  },
  clientId: string;
  name: string;
  innerBlocks?: Block[];
}
