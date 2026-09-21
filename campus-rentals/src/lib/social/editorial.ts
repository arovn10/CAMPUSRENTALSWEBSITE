/**
 * Editorial seed content for the two kinds that are not driven by listing data.
 *
 * These are starting drafts, not finished posts: the generator rotates through
 * them, a human edits and approves in the review queue. Keeping them in the
 * repo rather than in a table is deliberate — they are copy, they belong in
 * review, and a bad line should be fixed by a commit, not a hotfix UPDATE.
 */

export interface EditorialItem {
  /** Stable slug — part of the dedupe key, so renaming one re-queues it. */
  slug: string
  title: string
  body: string
}

/** Maple Street Plaza updates. Media is supplied by the reviewer. */
export const DEVELOPMENT_TOPICS: EditorialItem[] = [
  {
    slug: 'plaza-floor-plans',
    title: 'the floor plans',
    body: 'Open-concept living, kitchen and dining in every flat, drawn from the permit sheets. One ground-floor unit is ADA-adaptable.',
  },
  {
    slug: 'plaza-progress',
    title: 'construction progress',
    body: 'Steady progress on site this month. Framing and envelope work continue on schedule.',
  },
  {
    slug: 'plaza-location',
    title: 'the location',
    body: 'On Maple Street, in the middle of the Uptown retail stretch and a short walk from the Tulane campus.',
  },
  {
    slug: 'plaza-finishes',
    title: 'the finishes',
    body: 'Renderings of the interior package — the kitchens, the bath tile, and the light the corner units get in the afternoon.',
  },
]

/** Evergreen neighborhood and leasing-season content. */
export const NEIGHBORHOOD_TOPICS: EditorialItem[] = [
  {
    slug: 'leasing-timeline',
    title: 'When Uptown student housing actually leases',
    body: 'The Tulane off-campus market moves early — a lot of the good inventory for next August is spoken for by the previous winter. If you are planning ahead, the useful months to be looking are November through February.',
  },
  {
    slug: 'freret-street',
    title: 'Freret Street, in one post',
    body: 'Coffee, po-boys, a hardware store and a laundromat inside a few blocks. It is one of the reasons the streets just off it lease as fast as they do.',
  },
  {
    slug: 'what-to-ask-on-a-tour',
    title: 'What to ask on a tour',
    body: 'Who handles maintenance and how fast. Whether the price includes any utilities. What the parking situation actually is on a Tuesday night. How the lease handles a summer sublet.',
  },
  {
    slug: 'roommate-lease-basics',
    title: 'How a shared lease works',
    body: 'Most student leases are joint — everyone on the lease is responsible for the whole rent, not just their share. Worth understanding before signing, and worth agreeing on a split in writing with your roommates.',
  },
  {
    slug: 'magazine-street',
    title: 'Magazine Street',
    body: 'Six miles of shops, restaurants and bars running from the Garden District down to Audubon Park. The 11 bus runs it end to end.',
  },
  {
    slug: 'move-in-checklist',
    title: 'Move-in week checklist',
    body: 'Photograph everything before you unpack. Get the utilities in your name the week before, not the day of. Find out where the water shutoff is. Meet whoever handles maintenance.',
  },
]
