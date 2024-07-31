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
  allowedTaxonomies: {
    name: string;
    slug: string;
    rest_base?: string;
  }[],
  terms: { [key: string]: any[] },
  termRelations: { [key: string]: string },
  taxRelation: string,
): string {
  const taxCount = allowedTaxonomies.length;

  const termQueryArgs: string[] = [];
  allowedTaxonomies.forEach((taxonomy) => {
    if (terms[taxonomy.slug]?.length > 0) {
      const restBase = taxonomy.rest_base;
      if (restBase) {
        termQueryArgs.push(`${restBase}[terms]=${terms[taxonomy.slug].map((term) => term.id).join(',')}`);
        if (termRelations[taxonomy.slug] !== '' && typeof termRelations[taxonomy.slug] !== 'undefined') {
          termQueryArgs.push(`${restBase}[operator]=${termRelations[taxonomy.slug]}`);
        }
      }
    }
    if (taxCount > 1) {
      termQueryArgs.push(`tax_relation=${taxRelation}`);
    }
  });
  return termQueryArgs.join('&');
}
