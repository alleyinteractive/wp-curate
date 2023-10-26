interface Types {
  [key: string]: {
    name: string;
    slug: string;
    rest_base: string;
  };
}

/**
 * Builds the term query args for the WP REST API.
 *
 * @param string[] allowedTaxonomies The list of allowed taxonomies.
 * @param { [key: string]: any[] } terms The selected terms.
 * @param { [key: string]: any[] } availableTaxonomies The available taxonomies.
 * @param { [key: string]: string } termRelations The AND/OR relation used for each taxonomy.
 * @param string taxRelation The AND/OR relation used for all the terms.
 * @returns string The term query args.
 */
export default function buildTermQueryArgs(
  allowedTaxonomies: string[],
  terms: { [key: string]: any[] },
  availableTaxonomies: Types,
  termRelations: { [key: string]: string },
  taxRelation: string,
): string {
  const taxCount = allowedTaxonomies.filter((taxonomy: string) => terms[taxonomy]?.length > 0).length; // eslint-disable-line max-len

  const termQueryArgs: string[] = [];
  if (Object.keys(availableTaxonomies).length > 0) {
    allowedTaxonomies.forEach((taxonomy) => {
      if (terms[taxonomy]?.length > 0) {
        const restBase = availableTaxonomies[taxonomy].rest_base;
        if (restBase) {
          termQueryArgs.push(`${restBase}[terms]=${terms[taxonomy].map((term) => term.id).join(',')}`);
          if (termRelations[taxonomy] !== '' && typeof termRelations[taxonomy] !== 'undefined') {
            termQueryArgs.push(`${restBase}[operator]=${termRelations[taxonomy]}`);
          }
        }
      }
    });
    if (taxCount > 1) {
      termQueryArgs.push(`tax_relation=${taxRelation}`);
    }
  }
  return termQueryArgs.join('&');
}
