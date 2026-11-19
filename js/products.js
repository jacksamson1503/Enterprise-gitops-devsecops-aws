/**
 * PRODUCTS.JS — Editorial Studio Inventory
 * Curated tactile objects for living, working, and printing.
 * Real, high-resolution SVG artwork stored in assets/images/ (100% reliable offline & online).
 */

export const PRODUCTS = [
  {
    id: 'prod-01',
    editionNumber: '01',
    name: 'Glazed Terracotta Vessel',
    category: 'Ceramics',
    price: 3200,
    rating: 4.9,
    description: 'Wheel-thrown red earthenware with an unglazed raw exterior and a clear interior food-safe glaze.',
    image: 'assets/images/vessel.svg'
  },
  {
    id: 'prod-02',
    editionNumber: '02',
    name: 'Woven Khadi Desk Runner',
    category: 'Textiles',
    price: 1850,
    rating: 4.8,
    description: 'Heavy handspun raw cotton woven on traditional handlooms in rural Gujarat. Natural bone color.',
    image: 'assets/images/textile.svg'
  },
  {
    id: 'prod-03',
    editionNumber: '03',
    name: 'Cast Brass Paper Weight',
    category: 'Object',
    price: 2400,
    rating: 5.0,
    description: 'Solid sand-cast brass with hand-filed chamfers. Heavy, geometric balance that deepens in patina over decades.',
    image: 'assets/images/brass.svg'
  },
  {
    id: 'prod-04',
    editionNumber: '04',
    name: 'Archival Ledger Journal',
    category: 'Paper',
    price: 1250,
    rating: 4.9,
    description: 'Lay-flat Swiss binding with unbleached 120gsm Swedish Munken paper, ruled in faint terracotta ink lines.',
    image: 'assets/images/journal.svg'
  },
  {
    id: 'prod-05',
    editionNumber: '05',
    name: 'Ash Wood Desk Tidy',
    category: 'Object',
    price: 2900,
    rating: 4.7,
    description: 'Milled from sustainable Indian ash wood. Features two precision troughs for drawing tools and paper clips.',
    image: 'assets/images/desk-tidy.svg'
  },
  {
    id: 'prod-06',
    editionNumber: '06',
    name: 'Stoneware Pour-Over Dripper',
    category: 'Ceramics',
    price: 2100,
    rating: 4.9,
    description: 'Matte ivory slipware cone engineered with 16 interior flutes for steady, uniform brew extraction.',
    image: 'assets/images/dripper.svg'
  },
  {
    id: 'prod-07',
    editionNumber: '07',
    name: 'Indigo Block-Printed Throw',
    category: 'Textiles',
    price: 4600,
    rating: 5.0,
    description: 'Hand-carved wooden block print utilizing organic plant-derived indigo on two-ply textured cotton.',
    image: 'assets/images/throw.svg'
  },
  {
    id: 'prod-08',
    editionNumber: '08',
    name: 'Architectural Ruler in Steel',
    category: 'Object',
    price: 950,
    rating: 4.8,
    description: '30cm triangular drafting scale etched in matte blackened spring steel with high-contrast hairline numerals.',
    image: 'assets/images/ruler.svg'
  }
];

export function getProductById(id) {
  return PRODUCTS.find(p => p.id === id);
}

export function filterProducts(category = 'all', searchQuery = '') {
  return PRODUCTS.filter(product => {
    const matchesCategory = category === 'all' || product.category.toLowerCase() === category.toLowerCase();
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}
