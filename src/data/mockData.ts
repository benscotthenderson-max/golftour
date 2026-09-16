import { GolferUser, GolfCourse, GolfMatch, GolfPost, FriendRequest, HoleDefinition } from '../types/golf';

const createHoles = (
  specs: Array<{ hole: number; par: number; meters: number; si: number }>
): HoleDefinition[] =>
  specs.map(s => ({
    holeNumber: s.hole,
    par: s.par,
    strokeIndex: s.si,
    strokeIndexLadies: s.si,
    distances: {
      whiteMeters: s.meters,
      yellowMeters: s.meters,
      blueMeters: Math.round(s.meters * 0.93),
      redMeters: Math.round(s.meters * 0.85),
    },
  }));

// Official Simola Golf & Country Estate Hole Layout
const SIMOLA_HOLES: HoleDefinition[] = createHoles([
  { hole: 1, par: 5, meters: 486, si: 9 },
  { hole: 2, par: 4, meters: 338, si: 17 },
  { hole: 3, par: 4, meters: 334, si: 7 },
  { hole: 4, par: 4, meters: 335, si: 5 },
  { hole: 5, par: 4, meters: 360, si: 3 },
  { hole: 6, par: 3, meters: 183, si: 1 },
  { hole: 7, par: 5, meters: 431, si: 15 },
  { hole: 8, par: 4, meters: 345, si: 13 },
  { hole: 9, par: 3, meters: 156, si: 11 },
  { hole: 10, par: 4, meters: 378, si: 6 },
  { hole: 11, par: 3, meters: 175, si: 4 },
  { hole: 12, par: 5, meters: 436, si: 16 },
  { hole: 13, par: 4, meters: 373, si: 2 },
  { hole: 14, par: 3, meters: 152, si: 18 },
  { hole: 15, par: 5, meters: 485, si: 12 },
  { hole: 16, par: 4, meters: 364, si: 8 },
  { hole: 17, par: 3, meters: 146, si: 12 },
  { hole: 18, par: 5, meters: 444, si: 14 },
]);

// Official Knysna Golf Club Hole Layout
const KNYSNA_HOLES: HoleDefinition[] = createHoles([
  { hole: 1, par: 4, meters: 318, si: 7 },
  { hole: 2, par: 3, meters: 161, si: 9 },
  { hole: 3, par: 5, meters: 448, si: 15 },
  { hole: 4, par: 4, meters: 338, si: 3 },
  { hole: 5, par: 4, meters: 323, si: 13 },
  { hole: 6, par: 4, meters: 371, si: 1 },
  { hole: 7, par: 4, meters: 262, si: 17 },
  { hole: 8, par: 3, meters: 148, si: 11 },
  { hole: 9, par: 5, meters: 444, si: 5 },
  { hole: 10, par: 4, meters: 332, si: 8 },
  { hole: 11, par: 4, meters: 367, si: 2 },
  { hole: 12, par: 3, meters: 175, si: 10 },
  { hole: 13, par: 5, meters: 460, si: 4 },
  { hole: 14, par: 3, meters: 130, si: 18 },
  { hole: 15, par: 4, meters: 310, si: 16 },
  { hole: 16, par: 5, meters: 505, si: 6 },
  { hole: 17, par: 4, meters: 336, si: 12 },
  { hole: 18, par: 4, meters: 324, si: 14 },
]);

// Official Plettenberg Bay Country Club Hole Layout
const PLETT_HOLES: HoleDefinition[] = createHoles([
  { hole: 1, par: 4, meters: 322, si: 17 },
  { hole: 2, par: 4, meters: 368, si: 3 },
  { hole: 3, par: 4, meters: 339, si: 9 },
  { hole: 4, par: 5, meters: 481, si: 13 },
  { hole: 5, par: 4, meters: 367, si: 1 },
  { hole: 6, par: 3, meters: 149, si: 7 },
  { hole: 7, par: 5, meters: 419, si: 15 },
  { hole: 8, par: 3, meters: 175, si: 5 },
  { hole: 9, par: 4, meters: 323, si: 11 },
  { hole: 10, par: 4, meters: 341, si: 10 },
  { hole: 11, par: 3, meters: 117, si: 18 },
  { hole: 12, par: 4, meters: 362, si: 4 },
  { hole: 13, par: 3, meters: 159, si: 8 },
  { hole: 14, par: 4, meters: 299, si: 14 },
  { hole: 15, par: 5, meters: 465, si: 12 },
  { hole: 16, par: 4, meters: 325, si: 2 },
  { hole: 17, par: 4, meters: 336, si: 6 },
  { hole: 18, par: 5, meters: 465, si: 16 },
]);

// Strictly restricted to Knysna, Simola, and Plett
export const MOCK_COURSES: GolfCourse[] = [
  {
    id: 'course-simola-estate',
    name: 'Simola Golf & Country Estate',
    clubName: 'Simola',
    location: 'Knysna, Western Cape',
    city: 'Knysna',
    province: 'Western Cape',
    country: 'South Africa',
    region: 'Garden Route',
    architect: 'Jack Nicklaus',
    coverImage: '',
    par: 72,
    holesCount: 18,
    tees: [
      { color: 'Championship', rating: 74.4, slope: 139, meters: 5921, yards: 6475, name: 'Nicklaus Tees' },
      { color: 'White', rating: 72.1, slope: 134, meters: 5921, yards: 6475, name: 'Club Tees' },
      { color: 'Blue', rating: 69.8, slope: 127, meters: 5507, yards: 6022, name: 'Senior Tees' },
      { color: 'Red', rating: 71.5, slope: 129, meters: 5033, yards: 5504, name: 'Ladies Tees' },
    ],
    teeBoxes: [
      { name: 'Nicklaus', color: 'Championship', courseRating: 74.4, slopeRating: 139, totalMeters: 5921, totalYards: 6475, gender: 'Universal' },
      { name: 'Club', color: 'White', courseRating: 72.1, slopeRating: 134, totalMeters: 5921, totalYards: 6475, gender: 'Universal' },
      { name: 'Senior', color: 'Blue', courseRating: 69.8, slopeRating: 127, totalMeters: 5507, totalYards: 6022, gender: 'Men' },
      { name: 'Ladies', color: 'Red', courseRating: 71.5, slopeRating: 129, totalMeters: 5033, totalYards: 5504, gender: 'Women' },
    ],
    holes: SIMOLA_HOLES,
    facilities: ['Jack Nicklaus Signature Design', 'Knysna River Valley Views', 'Full Driving Range', 'Clubhouse Dining', 'Pro Shop'],
  },
  {
    id: 'course-knysna-golf',
    name: 'Knysna Golf Club',
    clubName: 'Knysna',
    location: 'Knysna, Western Cape',
    city: 'Knysna',
    province: 'Western Cape',
    country: 'South Africa',
    region: 'Garden Route',
    architect: 'Philip Le Roux',
    coverImage: '',
    par: 72,
    holesCount: 18,
    tees: [
      { color: 'Championship', rating: 72.8, slope: 132, meters: 5752, yards: 6290, name: 'Championship' },
      { color: 'White', rating: 70.9, slope: 128, meters: 5752, yards: 6290, name: 'Men Regular' },
      { color: 'Blue', rating: 68.7, slope: 122, meters: 5349, yards: 5850, name: 'Senior' },
      { color: 'Red', rating: 70.4, slope: 124, meters: 4889, yards: 5347, name: 'Ladies' },
    ],
    teeBoxes: [
      { name: 'Championship', color: 'Championship', courseRating: 72.8, slopeRating: 132, totalMeters: 5752, totalYards: 6290, gender: 'Universal' },
      { name: 'Men Regular', color: 'White', courseRating: 70.9, slopeRating: 128, totalMeters: 5752, totalYards: 6290, gender: 'Universal' },
      { name: 'Senior', color: 'Blue', courseRating: 68.7, slopeRating: 122, totalMeters: 5349, totalYards: 5850, gender: 'Men' },
      { name: 'Ladies', color: 'Red', courseRating: 70.4, slopeRating: 124, totalMeters: 4889, totalYards: 5347, gender: 'Women' },
    ],
    holes: KNYSNA_HOLES,
    facilities: ['Knysna Lagoon Inlets', 'Tidal Water Hazards', 'Parkland Fairways', 'Putting Green', '19th Hole Bar & Terrace'],
  },
  {
    id: 'course-plett-country-club',
    name: 'Plettenberg Bay Country Club',
    clubName: 'Plett',
    location: 'Plettenberg Bay, Western Cape',
    city: 'Plettenberg Bay',
    province: 'Western Cape',
    country: 'South Africa',
    region: 'Garden Route',
    architect: 'Robert Grimsdell',
    coverImage: '',
    par: 72,
    holesCount: 18,
    tees: [
      { color: 'Championship', rating: 73.2, slope: 133, meters: 5812, yards: 6356, name: 'Club Championship' },
      { color: 'White', rating: 71.4, slope: 129, meters: 5812, yards: 6356, name: 'White Tees' },
      { color: 'Blue', rating: 69.1, slope: 123, meters: 5405, yards: 5911, name: 'Blue Tees' },
      { color: 'Red', rating: 71.0, slope: 125, meters: 4940, yards: 5402, name: 'Red Ladies' },
    ],
    teeBoxes: [
      { name: 'Championship', color: 'Championship', courseRating: 73.2, slopeRating: 133, totalMeters: 5812, totalYards: 6356, gender: 'Universal' },
      { name: 'White', color: 'White', courseRating: 71.4, slopeRating: 129, totalMeters: 5812, totalYards: 6356, gender: 'Universal' },
      { name: 'Blue', color: 'Blue', courseRating: 69.1, slopeRating: 123, totalMeters: 5405, totalYards: 5911, gender: 'Men' },
      { name: 'Red', color: 'Red', courseRating: 71.0, slopeRating: 125, totalMeters: 4940, totalYards: 5402, gender: 'Women' },
    ],
    holes: PLETT_HOLES,
    facilities: ['Piesang River Valley', 'Private Nature Reserve Setting', 'Bent Grass Greens', 'Pro Shop & Caddies', 'Halfway House'],
  },
];

// Clean Slate Initialization
export const MOCK_USERS: GolferUser[] = [];
export const MOCK_POSTS: GolfPost[] = [];
export const MOCK_OPEN_MATCHES: GolfMatch[] = [];
export const MOCK_FRIEND_REQUESTS: FriendRequest[] = [];
