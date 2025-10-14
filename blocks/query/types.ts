import type { WP_REST_API_Post as WpRestApiPost } from 'wp-types'; // eslint-disable-line camelcase
import type { InnerBlockTemplate } from 'wordpress__blocks';
import type { JSX } from 'react';

interface EditProps {
  attributes: {
    backfillPosts?: number[];
    deduplication?: string;
    maxNumberOfPosts?: number;
    minNumberOfPosts?: number;
    numberOfPosts?: number;
    offset?: number;
    posts?: Array<WpRestApiPost['id'] | null>;
    query: {
      [key: string]: string | number | number[] | string[];
    }
    postTypes?: string[];
    searchTerm?: string;
    terms?: {
      [key: string]: any[];
    };
    termRelations?: {
      [key: string]: string;
    };
    taxRelation?: string;
    order?: 'asc' | 'desc';
    orderby?: string;
    metaKey?: string;
    moveData?: {
      postId?: number;
      clientId?: string;
    };
    uniqueId?: string;
    supportsPostTypes?: string[];
    validPosts?: number[];
  };
  clientId: string;
  setAttributes: (attributes: any) => void;
  context: {
    postId: number;
    query: {
      include?: string;
    };
  };
}

interface Taxonomies {
  [key: string]: {
    name: string;
    slug: string;
    rest_base: string;
  };
}

interface Types {
  [key: string]: {
    name: string;
    slug: string;
    rest_base: string;
  };
}

interface Option {
  label: string;
  value: string;
}

interface Term {
  id: number;
  title: string;
  url: string;
  type: string;
}

export type {
  EditProps,
  Taxonomies,
  Types,
  Option,
  Term,
};

export type Block = {
  name: string;
  attributes?: Record<string, any>;
};

export type BlockPattern = {
  blocks: Block[];
  slug?: string; // optional in the settings object, but needed for register
  title: string;
  description?: string;
  content: string;
  categories?: string[];
  keywords?: string[];
  viewScript?: string;
  postTypes?: string[];
  blockTypes?: string[];
  scope?: ('inserter' | 'block')[];
  rank?: number;
};

export type BlockVariation = {
  name: string;
  title: string;
  description?: string;
  icon?: string | { src: string } | JSX.Element;
  isDefault?: boolean;
  attributes?: Record<string, any>;
  innerBlocks?: InnerBlockTemplate[];
  scope?: ('inserter' | 'block')[];
};
