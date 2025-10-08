import {
  CheckboxControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

type SearchFiltersProps = {
  shouldShowFilter?: boolean;
  filtered?: boolean;
  setFiltered?: (filtered: boolean) => void;
};

export default function SearchFilters({
  shouldShowFilter = false,
  filtered = false,
  setFiltered = () => {},
}: SearchFiltersProps) {
  return (
    shouldShowFilter ? (
      <p>
        <CheckboxControl
          label={__('Filter results to match Query block setting', 'wp-curate')}
          checked={filtered}
          onChange={setFiltered}
        />
      </p>
    ) : null
  );
}
