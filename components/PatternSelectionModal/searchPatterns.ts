/**
 * External dependencies
 */
import removeAccents from 'remove-accents';

import type { BlockPattern } from '../../blocks/query/types';

/**
 * Sanitizes the search input string.
 *
 * @param {string} input The search input to normalize.
 *
 * @return {string} The normalized search input.
 */
export function normalizeSearchInput(input = '') {
  // Disregard diacritics.
  let newInput = removeAccents(input);

  // Trim & Lowercase.
  newInput = newInput.trim().toLowerCase();

  return newInput;
}

/**
 * Get the search rank for a given pattern and a specific search term.
 *
 * @param {Object} pattern     Pattern to rank
 * @param {string} searchValue Search term
 * @return {number} A pattern search rank
 */
export function getPatternSearchRank(pattern: BlockPattern, searchValue: string) {
  const normalizedSearchValue = normalizeSearchInput(searchValue);
  const normalizedTitle = normalizeSearchInput(pattern.title);

  let rank = 0;

  if (normalizedSearchValue === normalizedTitle) {
    rank += 30;
  } else if (normalizedTitle.startsWith(normalizedSearchValue)) {
    rank += 20;
  } else {
    const searchTerms = normalizedSearchValue.split(' ');
    const hasMatchedTerms = searchTerms.every((searchTerm) => normalizedTitle.includes(searchTerm));

    // Prefer pattern with every search word in the title.
    if (hasMatchedTerms) {
      rank += 10;
    }
  }

  return rank;
}

/**
 * Filters an pattern list given a search term.
 *
 * @param {Array}  patterns    Item list
 * @param {string} searchValue Search input.
 *
 * @return {Array} Filtered pattern list.
 */
export function searchPatterns(patterns: BlockPattern[] = [], searchValue = '') {
  if (!searchValue) {
    return patterns;
  }

  const rankedPatterns = patterns
    .map((pattern: BlockPattern) => [pattern, getPatternSearchRank(pattern, searchValue)])
    .filter(([, rank]) => rank as number > 0);

  rankedPatterns.sort(([, rank1], [, rank2]) => (rank2 as number) - (rank1 as number));
  return rankedPatterns.map(([pattern]) => pattern);
}
