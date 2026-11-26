const blockSeparator = "\n\n";

export const blocksOf = (items: readonly string[]): string | undefined =>
  items.length === 0 ? undefined : items.join(blockSeparator);

export const bulletsOf = (items: readonly string[]): string | undefined => blocksOf(items.map((item) => `- ${item}`));
