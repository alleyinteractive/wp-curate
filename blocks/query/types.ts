interface EditProps {
  attributes: {
    backfillPosts?: number[];
    deduplication?: string;
    maxNumberOfPosts?: number;
    minNumberOfPosts?: number;
    numberOfPosts?: number;
    offset?: number;
    posts?: number[];
    manualPosts?: any[];
    query: {
      [key: string]: string | number | number[] | string[];
    }
    postTypes?: string[];
    searchTerm?: string;
    terms?: {
      [key: string]: any[];
    };
  };
  setAttributes: (attributes: any) => void;
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
