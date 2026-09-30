import type { Term } from '../blocks/query/types';

export interface Block {
  attributes: {
    allPostIds?: number[];
    backfillPosts?: number[];
    deduplication?: string;
    numberOfPosts?: number;
    postId?: number;
    posts?: Array<number | null>;
    postTypes?: string[];
    query?: {
      include?: number[];
    }
    queryId?: number;
    supportsPostTypes?: string[];
    terms?: Record<string, Term[]>;
    validPosts?: number[];
  },
  clientId: string;
  name: string;
  innerBlocks?: Block[];
}
