import type { ToggleFormVariant } from "../../../../pages/admin-page/types";

const keyPattern = /^V(\d+)$/i;

const nextGeneratedKey = (variants: ToggleFormVariant[]): string => {
  const maxIndex = variants.reduce((currentMax, variant) => {
    const matched = variant.key.trim().match(keyPattern);
    if (!matched) {
      return currentMax;
    }
    const index = Number(matched[1]);
    return Number.isFinite(index) ? Math.max(currentMax, index) : currentMax;
  }, 0);

  return `V${maxIndex + 1}`;
};

export const rebalanceVariantWeights = (
  variants: ToggleFormVariant[]
): ToggleFormVariant[] => {
  if (!variants.length) {
    return [];
  }

  const baseWeight = Math.floor(100 / variants.length);
  const remainder = 100 - baseWeight * variants.length;

  return variants.map((variant, index) => ({
    ...variant,
    weightPercent: baseWeight + (index < remainder ? 1 : 0)
  }));
};

export const addVariantWithAutoWeights = (
  variants: ToggleFormVariant[]
): ToggleFormVariant[] => {
  const nextVariants = [
    ...variants,
    {
      key: nextGeneratedKey(variants),
      weightPercent: 0,
      comment: ""
    }
  ];
  return rebalanceVariantWeights(nextVariants);
};

export const removeVariantWithAutoWeights = (
  variants: ToggleFormVariant[],
  index: number
): ToggleFormVariant[] => {
  const nextVariants = variants.filter((_, variantIndex) => variantIndex !== index);
  return rebalanceVariantWeights(nextVariants);
};

