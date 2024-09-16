/* eslint-disable camelcase */
import { useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import apiFetch from '@wordpress/api-fetch';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';

import { Template } from '@wordpress/blocks';
import { v4 as uuid } from 'uuid';

import type {
  EditProps,
  Option,
} from '../query/types';

import {
  mainDedupe,
} from '../../services/deduplicate';

import buildTermQueryArgs from '../../services/buildTermQueryArgs';

import QueryControls from '../../components/QueryControls';
import './index.scss';

interface PostTypeOrTerm {
  name: string;
  slug: string;
}

interface Window {
  wpCurateQueryBlock: {
    allowedPostTypes: PostTypeOrTerm[];
    allowedTaxonomies: PostTypeOrTerm[];
    parselyAvailable: string,
    maxPosts: number,
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
    backfillPosts = [],
    deduplication = 'inherit',
    minNumberOfPosts = 1,
    numberOfPosts = 5,
    offset = 0,
    posts: manualPosts = [],
    postTypes = [],
    searchTerm = '',
    terms = {},
    termRelations = {},
    taxRelation = 'AND',
    orderby = 'date',
    uniqueId = '',
  },
  setAttributes,
  context: {
    postId,
    query: {
      include = '',
    } = {},
  },
}: EditProps) {
  const queryInclude = include.split(',').map((id: string) => parseInt(id, 10));
  const index = queryInclude.findIndex((id: number) => id === postId);
  const backfillPostsString = backfillPosts.join(',');

  const {
    wpCurateQueryBlock: {
      allowedPostTypes = [],
      allowedTaxonomies = [],
      parselyAvailable = 'false',
      maxPosts = 10,
    } = {},
  } = (window as any as Window);

  if (!postTypes.length) {
    setAttributes({ postTypes: allowedPostTypes });
  }

  // @ts-ignore
  const [isPostDeduplicating, postTypeObject] = useSelect(
    (select) => {
      // @ts-ignore
      const editor = select('core/editor');

      // @ts-ignore
      const type = editor.getEditedPostAttribute('type');
      // @ts-ignore
      const meta = editor.getEditedPostAttribute('meta');

      return [
        // It's possible for usePostMetaValue() to run here before useEntityProp() is available.
        Boolean(meta?.wp_curate_deduplication),
        // @ts-ignore
        type ? select('core').getPostType(type) : null,
      ];
    },
  );

  const debouncedSearchTerm = useDebounce(searchTerm ?? '', 500);

  const taxCount = allowedTaxonomies.length;

  const termQueryArgs = buildTermQueryArgs(
    allowedTaxonomies,
    terms,
    termRelations,
    taxRelation,
  );

  const manualPostIds = manualPosts.map((post) => (post ?? null)).join(',');
  const currentPostId = useSelect((select: any) => select('core/editor').getCurrentPostId(), []);
  const postTypeString = postTypes.join(',');

  useEffect(() => {
    if (!uniqueId) {
      setAttributes({ uniqueId: uuid() });
    }
  }, [setAttributes, uniqueId]);

  // Fetch "backfill" posts when categories, tags, or search term change.
  useEffect(() => {
    if (index !== 0) {
      return;
    }
    const fetchPosts = async () => {
      let path = addQueryArgs(
        '/wp-curate/v1/posts',
        {
          search: debouncedSearchTerm,
          offset,
          post_type: postTypeString,
          status: 'publish',
          per_page: 20,
          orderby,
          current_post_id: Number.isInteger(currentPostId) ? currentPostId : 0,
        },
      );
      path += `&${termQueryArgs}`;

      apiFetch({ path }).then((response:any) => {
        let revisedResponse;
        // If the response is an array, filter out the current post.
        if (Array.isArray(response)) {
          revisedResponse = response.filter((item) => item !== currentPostId);
        } else if (response.id === currentPostId) {
          // Response is an object, if id is the current post, nullify it.
          revisedResponse = null;
        } else {
          revisedResponse = response;
        }
        if (revisedResponse !== null) {
          setAttributes({ backfillPosts: revisedResponse as Array<number> });
        }
      });
    };
    fetchPosts();
  }, [
    backfillPostsString,
    currentPostId,
    debouncedSearchTerm,
    index,
    offset,
    orderby,
    postTypeString,
    setAttributes,
    termQueryArgs,
  ]);

  // Update the query when the backfillPosts change.
  // The query is passed via context to the core/post-template block.
  useEffect(() => {
    if (index !== 0) {
      return;
    }
    if (!backfillPostsString.length) {
      return;
    }
    mainDedupe();
  }, [
    backfillPostsString,
    deduplication,
    index,
    isPostDeduplicating,
    manualPostIds,
    numberOfPosts,
    postTypeString,
    setAttributes,
  ]);

  // Update the query when the backfillPosts change.
  // The query is passed via context to the core/post-template block.
  useEffect(() => {
    if (index !== 0) {
      return;
    }
    mainDedupe();
  }, [
    index,
    manualPostIds,
  ]);

  for (let i = 0; i < numberOfPosts; i += 1) {
    if (!manualPosts[i]) {
      manualPosts[i] = null; // eslint-disable-line no-param-reassign
    }
  }

  manualPosts = manualPosts.slice(0, numberOfPosts); // eslint-disable-line no-param-reassign

  const TEMPLATE: Template[] = [
    [
      'core/post-template',
      {},
      [
        [
          'wp-curate/post',
          {},
          [
            ['core/post-title', { isLink: true, level: 3 }],
          ],
        ],
      ],
    ],
  ];

  const displayTypes: Option[] = allowedPostTypes.map((type) => ({
    label: type.name,
    value: type.slug,
  }));
  const blockProps = useBlockProps();
  return (
    index === 0 ? (
      <>
        <div {...blockProps}>
          <InnerBlocks template={TEMPLATE} />
        </div>
        <QueryControls
          allowedPostTypes={allowedPostTypes}
          allowedTaxonomies={allowedTaxonomies}
          deduplication={deduplication}
          displayTypes={displayTypes}
          isPostDeduplicating={isPostDeduplicating}
          manualPosts={manualPosts}
          maxPosts={maxPosts}
          minNumberOfPosts={minNumberOfPosts}
          numberOfPosts={numberOfPosts}
          offset={offset}
          orderby={orderby}
          parselyAvailable={parselyAvailable}
          postTypeObject={postTypeObject}
          postTypes={postTypes}
          searchTerm={searchTerm}
          setAttributes={setAttributes}
          taxCount={taxCount}
          taxRelation={taxRelation}
          termRelations={termRelations}
          terms={terms}
        />
      </>
    ) : null
  );
}
