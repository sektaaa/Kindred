// Single source of truth for the three community "silos" and the vocabulary
// each one uses. The client fetches this from GET /api/meta/options so the
// profile builder and the matching service always agree.

const COMMUNITIES = {
  sober: {
    label: 'Sober & alcohol-free',
    tagline: 'Dates that never revolve around a drink.',
    values: [
      'alcohol-free', 'sober-curious', 'in recovery', 'fitness', 'mindfulness',
      'early mornings', 'coffee dates', 'outdoors', 'faith', 'creativity',
    ],
    boundaries: [
      'no bar or pub dates', 'no drinking around me', 'no substances at all',
      'sober venues only', 'open to talking about recovery', 'prefer not to discuss recovery',
    ],
    identityTags: ['sober < 1 year', 'sober 1-5 years', 'sober 5+ years', 'never drank', 'sober-curious'],
  },
  eco: {
    label: 'Eco & vegan',
    tagline: 'Love that leaves a lighter footprint.',
    values: [
      'vegan', 'vegetarian', 'zero-waste', 'climate action', 'thrifting',
      'cycling', 'gardening', 'animal rights', 'minimalism', 'local food',
    ],
    boundaries: [
      'vegan restaurants only', 'no fast fashion gifts', 'no flying for short trips',
      'no meat at home', 'no zoos or animal shows',
    ],
    identityTags: ['vegan', 'vegetarian', 'plant-based', 'climate professional', 'activist'],
  },
  neurodiverse: {
    label: 'Neurodiverse',
    tagline: 'Dating in your own communication style.',
    values: [
      'deep interests', 'honesty', 'routine', 'board games', 'tech', 'nature',
      'animals', 'art', 'reading', 'music',
    ],
    boundaries: [
      'no surprise calls', 'text before plans change', 'quiet venues only',
      'need clear plans', 'no hidden meanings — say it directly', 'need time to recharge',
    ],
    identityTags: ['ADHD', 'autistic', 'dyslexic', 'dyspraxic', 'AuDHD', 'self-identified'],
  },
};

const SENSORY_PREFS = [
  'quiet places', 'dim lighting', 'small groups', 'outdoor spaces',
  'no strong scents', 'predictable plans', 'fidget-friendly',
];

// Hobbies shared by every community: friendship and dating start with what you enjoy.
const INTERESTS = [
  'music', 'movies', 'travel', 'cooking', 'dancing', 'cricket', 'football', 'fitness', 'yoga',
  'photography', 'art', 'gaming', 'reading', 'writing', 'pets', 'nature', 'food', 'fashion',
  'tech', 'volunteering', 'singing', 'theatre',
];

const REPLY_PACE = ['fast', 'same day', 'slow'];
const DIRECTNESS = ['low', 'medium', 'high'];

const COMMUNITY_KEYS = Object.keys(COMMUNITIES);

module.exports = { COMMUNITIES, COMMUNITY_KEYS, SENSORY_PREFS, INTERESTS, REPLY_PACE, DIRECTNESS };
