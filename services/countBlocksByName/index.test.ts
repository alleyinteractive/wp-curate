import { blocksWithColumns, blocksWithNoQueryBlocks } from './blocksStub';
import countBlocksByName from './index';

describe('countBlocksByName', () => {
  it('should return 3 when there are 3 query blocks', () => {
    const count = countBlocksByName(blocksWithColumns, 'wp-curate/query');
    expect(count).toBe(3);
  });

  it('it should return 0 when there are no query blcoks', () => {
    const count = countBlocksByName(blocksWithNoQueryBlocks, 'wp-curate/query');
    expect(count).toBe(0);
  });
});
