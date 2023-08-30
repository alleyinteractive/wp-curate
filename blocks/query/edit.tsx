import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';

import { InnerBlocks, InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
  PanelBody,
  PanelRow,
  RangeControl,
  SelectControl,
  TextControl,
} from '@wordpress/components';
import ApiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { PostPicker, TermSelector, useDebounce } from '@alleyinteractive/block-editor-tools';
import type { WP_REST_API_Post, WP_REST_API_Posts } from 'wp-types';

import './index.scss';

interface EditProps {
  attributes: {
    numberOfPosts?: number;
    minNumberOfPosts?: number;
    maxNumberOfPosts?: number;
    offset?: number;
    postTypes?: string[];
    posts?: any[];
    terms?: {
      [key: string]: any[];
    };
    searchTerm?: string;
    query: {
      [key: string]: string | number | number[] | string[];
    }
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

interface Window {
  wpCurateQueryBlock: {
    allowedPostTypes: Array<string>;
    allowedTaxonomies: Array<string>;
  };
}

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {WPElement} Element to render.
 */
export default function Edit({
  attributes: {
    numberOfPosts = 5,
    minNumberOfPosts = 1,
    maxNumberOfPosts = 10,
    offset = 0,
    postTypes = ['post'],
    posts: manualPosts = [],
    terms = {},
    searchTerm,
  },
  setAttributes,
}: EditProps) {
  const {
    wpCurateQueryBlock: {
      allowedPostTypes = [],
      allowedTaxonomies = [],
    } = {},
  } = (window as any as Window);

  const debouncedSearchTerm = useDebounce(searchTerm ?? '', 500);
  const [posts, setPosts] = useState<number[]>([]);
  const [availableTaxonomies, setAvailableTaxonomies] = useState<Taxonomies>({});
  const [availableTypes, setAvailableTypes] = useState<Types>({});

  let termQueryArgs = '';
  if (Object.keys(availableTaxonomies).length > 0) {
    allowedTaxonomies.forEach((taxonomy) => {
      if (terms[taxonomy]?.length > 0) {
        const restBase = availableTaxonomies[taxonomy].rest_base;
        if (restBase) {
          termQueryArgs += `&${restBase}=${terms[taxonomy].map((term) => term.id).join(',')}`;
        }
      }
    });
  }

  const manualPostIds = manualPosts.map((post) => (post ?? null)).join(',');
  const postTypeString = postTypes.join(',');

  // Fetch available taxonomies.
  useEffect(() => {
    const fetchTaxonomies = async () => {
      const path = '/wp/v2/taxonomies';
      ApiFetch({
        path,
      }).then((response) => {
        setAvailableTaxonomies(response as Taxonomies);
      });
    };
    fetchTaxonomies();
  }, []);

  // Fetch available post types.
  useEffect(() => {
    const fetchTypes = async () => {
      const path = '/wp/v2/types';
      ApiFetch({
        path,
      }).then((response) => {
        setAvailableTypes(response as Types);
      });
    };
    fetchTypes();
  }, []);

  // Fetch "backfill" posts when categories, tags, or search term change.
  useEffect(() => {
    const fetchPosts = async () => {
      let path = addQueryArgs(
        '/wp/v2/posts',
        {
          search: debouncedSearchTerm,
          offset,
          type: postTypeString,
        },
      );
      path += termQueryArgs;

      // setLoading(true);
      ApiFetch({
        path,
      }).then((response) => {
        const postIds: number[] = (response as WP_REST_API_Posts).map(
          (post: WP_REST_API_Post) => post.id,
        );
        setPosts(postIds);
      });
    };
    fetchPosts();
  }, [debouncedSearchTerm, termQueryArgs, offset, postTypeString]);

  // Update the query when the posts change.
  // The query is passed via context to the core/post-template block.
  useEffect(() => {
    if (!posts.length) {
      return;
    }
    let postIndex = 0;
    const allPosts: Array<number | undefined> = [];

    const manualPostIdArray: Array<number | null> = manualPostIds.split(',').map((post) => parseInt(post, 10));
    const filteredPosts = posts.filter((post) => !manualPostIdArray.includes(post));
    for (let i = 0; i < numberOfPosts; i += 1) {
      if (!manualPostIdArray[i]) {
        manualPostIdArray[i] = null;
      }
    }

    manualPostIdArray.forEach((post, index) => {
      let manualPost;
      let backfillPost;

      if (manualPostIdArray[index]) {
        manualPost = manualPostIdArray[index];
      } else {
        backfillPost = filteredPosts[postIndex];
        postIndex += 1;
      }
      allPosts.push(manualPost ?? backfillPost);
    });
    const query = {
      perPage: numberOfPosts,
      postType: 'post',
      type: postTypeString,
      include: allPosts.join(','),
      orderby: 'include',
    };
    setAttributes({ query, queryId: 0 });
  }, [manualPostIds, posts, numberOfPosts, setAttributes, postTypeString]);

  const setManualPost = (id: number, index: number) => {
    const newManualPosts = [...manualPosts];
    newManualPosts.splice(index, 1, id);
    setAttributes({ posts: newManualPosts });
  };

  const setTerms = ((type: string, newTerms: Term[]) => {
    const cleanedTerms = newTerms.map((term) => (
      {
        id: term.id,
        title: term.title,
        url: term.url,
        type: term.type,
      }
    ));
    const newTermAttrs = {
      ...terms,
      [type]: cleanedTerms,
    };
    setAttributes({ terms: newTermAttrs });
  });

  for (let i = 0; i < numberOfPosts; i += 1) {
    if (!manualPosts[i]) {
      manualPosts[i] = null; // eslint-disable-line no-param-reassign
    }
  }
  manualPosts = manualPosts.slice(0, numberOfPosts); // eslint-disable-line no-param-reassign

  // @ts-ignore
  const TEMPLATE: Template[] = [
    ['wp-curate/query-heading'],
    [
      'core/post-template',
      {},
      [
        ['core/post-title', { level: 3, isLink: true }],
        ['core/post-excerpt', {}],
      ],
    ],
  ];

  const displayTypes: Option[] = [];
  Object.keys(availableTypes).forEach((type) => {
    if (allowedPostTypes.includes(type)) {
      displayTypes.push(
        {
          label: availableTypes[type].name,
          value: type,
        },
      );
    }
  });

  return (
    <>
      <div {...useBlockProps()}>
        <InnerBlocks
          template={TEMPLATE}
        />
      </div>
      <InspectorControls>
        { /* @ts-ignore */ }
        <PanelBody
          title={__('Block Settings', 'wp-curate')}
          initialOpen
        >
          {minNumberOfPosts !== undefined && minNumberOfPosts !== maxNumberOfPosts ? (
            // @ts-ignore
            <PanelRow>
              { /* @ts-ignore */ }
              <RangeControl
                label={__('Number of Posts', 'wp-curate')}
                value={numberOfPosts}
                onChange={(value) => setAttributes({ numberOfPosts: value })}
                min={minNumberOfPosts}
                max={maxNumberOfPosts}
              />
            </PanelRow>
          ) : null}
          { /* @ts-ignore */ }
          <PanelRow>
            { /* @ts-ignore */}
            <RangeControl
              label={__('Offset', 'wp-curate')}
              onChange={(newValue) => setAttributes({ offset: newValue })}
              value={offset}
              min={0}
              max={20}
            />
          </PanelRow>
          { /* @ts-ignore */ }
          <PanelRow
            className="wp-curate-post-type-selector"
          >
            { /* @ts-ignore */ }
            <SelectControl
              label={__('Post Types', 'wp-curate')}
              value={postTypes}
              onChange={(newValue) => setAttributes({ postTypes: newValue })}
              options={displayTypes}
              multiple
            />
          </PanelRow>
          { /* @ts-ignore */ }
          {Object.keys(availableTaxonomies).length > 0 ? (
            allowedTaxonomies.map((taxonomy) => (
              <>
                { /* @ts-ignore */ }
                <PanelRow>
                  { /* @ts-ignore */ }
                  <TermSelector
                    label={availableTaxonomies[taxonomy].name}
                    subTypes={[taxonomy]}
                    selected={terms[taxonomy] ?? []}
                    onSelect={(newCategories: Term[]) => setTerms(taxonomy, newCategories)}
                  />
                </PanelRow>
              </>
            ))
          ) : null}
          { /* @ts-ignore */ }
          <PanelRow>
            { /* @ts-ignore */ }
            <TextControl
              label={__('Search Term', 'wp-curate')}
              onChange={(next) => setAttributes({ searchTerm: next })}
              value={searchTerm as string}
            />
          </PanelRow>
        </PanelBody>
        { /* @ts-ignore */ }
        <PanelBody
          title={__('Manually Set Posts', 'wp-curate')}
          initialOpen
        >
          {manualPosts.map((post, index) => (
            /* @ts-ignore */
            <PanelRow>
              <PostPicker
                allowedTypes={allowedPostTypes}
                onReset={() => setManualPost(0, index)}
                onUpdate={(id: number) => { setManualPost(id, index); }}
                value={manualPosts[index] ?? 0}
              />
            </PanelRow>
          ))}
        </PanelBody>
      </InspectorControls>
    </>
  );
}
