/**
 * Maps raw DonationBox records to include resolved perks.
 *
 * Why? DonationBoxes need a flat `perks` array for the frontend to render
 * perk lists. With the tierId FK relation, Prisma can now include the tier
 * data natively (via `include: { tier: true }`), so we resolve perks from
 * the included tier object first. Falls back to legacy tierDetails pipe-
 * delimited string for boxes that have not yet been migrated to the FK
 * relation.
 *
 * @param {Array} donationBoxes - DonationBox records (with optional included tier).
 * @returns {Array} Mapped donation boxes with resolved perks arrays.
 */
export function mapDonationBoxes(donationBoxes) {
  return donationBoxes.map(box => {
    const plainBox = { ...box };

    // Resolve perks from the included tier relation (preferred path)
    if (plainBox.tier && !plainBox.isCustomAmount) {
      let perks = [];
      try {
        perks = typeof plainBox.tier.perks === 'string'
          ? JSON.parse(plainBox.tier.perks)
          : (Array.isArray(plainBox.tier.perks) ? plainBox.tier.perks : []);
      } catch {
        perks = [];
      }
      plainBox.perks = perks;
    } else {
      // For standalone box, perks is stored directly as a Json column
      let perks = [];
      try {
        perks = typeof plainBox.perks === 'string'
          ? JSON.parse(plainBox.perks)
          : (Array.isArray(plainBox.perks) ? plainBox.perks : []);
      } catch {
        perks = [];
      }
      plainBox.perks = perks;
    }

    return plainBox;
  });
}
