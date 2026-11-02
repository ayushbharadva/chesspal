import { pieceSvgs } from '@/components/board/piece-svgs';
import { PIECE_SETS } from '@/progress/types';

it('holds all twelve pieces of every set in a form SvgXml draws faithfully', () => {
  const ids = new Set<string>();
  for (const set of PIECE_SETS) {
    for (const color of ['w', 'b'])
      for (const type of 'KQRBNP') {
        const svg = pieceSvgs[set][`${color}${type}` as keyof (typeof pieceSvgs)['classic']];
        expect(svg).toMatch(/^<svg [^>]*viewBox=/);
        // SvgXml ignores style rules and gradients that inherit stops through href.
        expect(svg).not.toMatch(/<style|class=|<(linear|radial)Gradient[^>]*href=/);
        // Pieces share one web page, so an id used twice would borrow another piece's gradient.
        for (const [, id] of svg.matchAll(/\bid="([^"]+)"/g)) {
          expect(ids.has(id)).toBe(false);
          ids.add(id);
        }
      }
  }
});
