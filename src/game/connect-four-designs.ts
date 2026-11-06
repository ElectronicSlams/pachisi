// The number is permanent. Names, descriptions and display order may evolve.
export const CONNECT_FOUR_DESIGNS = [
  { id: 'design-1', name: 'Blueprint', origin: 'Stadium', detail: 'Fine outlines, open wells and blue drafting ink.' },
  { id: 'design-2', name: 'Gumball', origin: 'Home v2 adaptation', detail: 'A molded blue rack with glossy cherry and lemon drops.' },
  { id: 'design-3', name: 'Bullseye', origin: 'Arena App adaptation', detail: 'Stamped red rings play against brass pieces with dark pips.' },
  { id: 'design-4', name: 'Plotter', origin: 'PGX study', detail: 'An open column diagram with ink outlines and a heavy baseline.' },
  { id: 'design-5', name: 'Redline', origin: 'PettingZoo study', detail: 'Red and black ridged counters sit inside a pale tournament rack.' },
  { id: 'design-6', name: 'Marquetry', origin: 'Pachisi original', detail: 'Striped walnut inlay and carved ivory and ebony counters.' },
  { id: 'design-7', name: 'Bitcrush', origin: 'Pachisi original', detail: 'Stepped pixel tokens in square wells on an arcade grid.' },
  { id: 'design-8', name: 'Sea Glass', origin: 'Pachisi original', detail: 'Tumbled translucent pebbles settle into a tide pool.' },
  { id: 'design-9', name: 'Needlepoint', origin: 'Pachisi original', detail: 'Cross stitches and diamond stitches on woven linen.' },
  { id: 'design-10', name: 'Motherboard', origin: 'Pachisi original', detail: 'Gold and silicon chips on etched circuit traces.' },
  { id: 'design-11', name: 'Pinball', origin: 'Pachisi original', detail: 'Mirror balls and striped targets on a purple playfield.' },
  { id: 'design-12', name: 'Darkroom', origin: 'Pachisi original', detail: 'Sprocket-edged film frames hold shutter blades and amber negatives.' },
  { id: 'design-13', name: 'Kiln', origin: 'Pachisi original', detail: 'Cobalt rosettes and terracotta diamonds set in ceramic grout.' },
  { id: 'design-14', name: 'Riso Club', origin: 'Pachisi original', detail: 'Halftone ink and offset shadows on a warm paper grid.' },
  { id: 'design-15', name: 'Gearbox', origin: 'Pachisi original', detail: 'Copper and steel toothed wheels on machined metal.' },
  { id: 'design-16', name: 'Velvet Rope', origin: 'Pachisi original', detail: 'Edge-striped betting chips on stitched green felt.' },
  { id: 'design-17', name: 'Origami', origin: 'Pachisi original', detail: 'Creased kites and folded fans sit in a paper lattice.' },
  { id: 'design-18', name: 'Wax Seal', origin: 'Pachisi original', detail: 'Irregular pools of crimson and violet sealing wax on parchment.' },
  { id: 'design-19', name: 'Moonbase', origin: 'Pachisi original', detail: 'Cratered moons and faceted stars in a deep-space observation grid.' },
  { id: 'design-20', name: 'Switchyard', origin: 'Pachisi original', detail: 'Signal lamps and striped gates hang between industrial rails.' },
] as const;

export type ConnectFourDesignId = typeof CONNECT_FOUR_DESIGNS[number]['id'];
export const CONNECT_FOUR_LAYOUTS = ['card', 'arena', 'feature', 'event'] as const;
export type ConnectFourLayout = typeof CONNECT_FOUR_LAYOUTS[number];
export function findConnectFourDesign(id: string | null) {
  return CONNECT_FOUR_DESIGNS.find(design => design.id === id);
}
export function connectFourVariantId(design: ConnectFourDesignId, presentation: ConnectFourLayout) {
  return `connect-four-${design}-variant-${presentation}`;
}

/** Validate explicit URL or host input before offering a variant. */
export function resolveConnectFourVariant(id: string, presentation: string) {
  const design = findConnectFourDesign(id);
  if (!design) return {ok:false, reason:'unknown-design'} as const;
  const layout = CONNECT_FOUR_LAYOUTS.find(value => value === presentation);
  if (!layout) return {ok:false, reason:'unsupported-presentation'} as const;
  return {ok:true, design, presentation:layout, id:connectFourVariantId(design.id,layout)} as const;
}
