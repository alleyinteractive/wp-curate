import type { Term } from '../blocks/query/types';

export interface Block {
  attributes: {
    backfillPosts?: number[];
    deduplication?: string;
    numberOfPosts?: number;
    posts?: Array<number | null>;
    postTypes?: string[];
    query?: {
      include?: number[];
    }
    supportsPostTypes?: string[];
    terms?: Record<string, Term[]>;
    validPosts?: number[];
  },
  clientId: string;
  name: string;
  innerBlocks?: Block[];
}
