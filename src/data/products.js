// The catalogue. `trade` splits it into the two directions the business runs:
// 'export' is Indian-origin goods going out, 'import' is goods coming in.
//
// Every entry below is export. There is no import product data anywhere in the
// repo or in docs/, so none is invented here - the Products page renders a
// prepared empty state for that direction instead of a fabricated listing.
// Adding import products means adding entries with trade: 'import'; the page,
// the switch and the category chips all derive from this array and need no
// change.
export const products = [
  { trade: 'export', slug: 'mangoes', name: 'Mangoes', type: 'Fresh fruit', image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=88', description: 'Seasonal Indian mangoes selected for colour, maturity and eating quality.', varieties: ['Kesar', 'Alphonso', 'Banganapalli'], season: 'April – July (peak season)', origin: 'Gujarat, Maharashtra, Andhra Pradesh', packaging: '4kg, 5kg & 10kg export cartons', certification: 'Phytosanitary certificate on every shipment' },
  { trade: 'export', slug: 'pomegranates', name: 'Pomegranates', type: 'Fresh fruit', image: 'https://images.unsplash.com/photo-1541344999736-83eca272f6fc?auto=format&fit=crop&w=1000&q=88', description: 'Fresh pomegranates carefully selected for vibrant appearance and condition.', varieties: ['Bhagwa'], season: 'September – February', origin: 'Maharashtra, Karnataka', packaging: '4kg & 5kg telescopic cartons', certification: 'Phytosanitary certificate on every shipment' },
  { trade: 'export', slug: 'grapes', name: 'Table Grapes', type: 'Fresh fruit', image: 'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=1000&q=88', description: 'Fresh table grapes sourced during the Indian season for export enquiries.', varieties: ['Green grapes', 'Black grapes'], season: 'January – April', origin: 'Nashik (Maharashtra), Karnataka', packaging: '4.5kg vented export cartons', certification: 'Phytosanitary certificate on every shipment' },
  { trade: 'export', slug: 'onions', name: 'Onions', type: 'Fresh vegetable', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=1000&q=88', description: 'Export-oriented onions selected and packed according to buyer requirements.', varieties: ['Red onion'], season: 'Year-round, peak Nov – Mar', origin: 'Maharashtra, Gujarat, Madhya Pradesh', packaging: '10kg, 20kg & 25kg mesh bags', certification: 'Phytosanitary certificate on every shipment' },
  { trade: 'export', slug: 'okra', name: 'Okra', type: 'Fresh vegetable', image: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=1000&q=88', description: 'Fresh okra for buyers seeking Indian vegetables in seasonal programmes.', varieties: ['Fresh okra'], season: 'March – November', origin: 'Gujarat, Karnataka', packaging: '4kg & 5kg vented cartons', certification: 'Phytosanitary certificate on every shipment' },
  { trade: 'export', slug: 'mixed-vegetables', name: 'Seasonal Vegetables', type: 'Fresh vegetable', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=88', description: 'A selection of seasonal Indian vegetables, subject to market and availability.', varieties: ['Enquire with requirements'], season: 'Seasonal, subject to availability', origin: 'Multiple growing regions across India', packaging: 'Pack format confirmed per requirement', certification: 'Phytosanitary certificate on every shipment' },
  // --- IMPORT -------------------------------------------------------------
  // Two slots, awaiting real data. Every value below is the literal string
  // 'To be confirmed' rather than a plausible guess, and `placeholder: true`
  // makes the card render as an obvious stub - see features/products/ProductCard.
  // Nothing here can be mistaken for a product Solstice actually imports.
  //
  // To fill one in: replace the name, type, description, origin, packaging,
  // certification and image, then delete the placeholder flag. Nothing else
  // needs touching - the dropdown, chips, count and grid all derive from here.
  { trade: 'import', placeholder: true, slug: 'import-slot-1', name: 'Import product 1', type: 'To be confirmed', image: null, description: 'Awaiting product details.', varieties: [], season: 'To be confirmed', origin: 'To be confirmed', packaging: 'To be confirmed', certification: 'To be confirmed' },
  { trade: 'import', placeholder: true, slug: 'import-slot-2', name: 'Import product 2', type: 'To be confirmed', image: null, description: 'Awaiting product details.', varieties: [], season: 'To be confirmed', origin: 'To be confirmed', packaging: 'To be confirmed', certification: 'To be confirmed' }
]
