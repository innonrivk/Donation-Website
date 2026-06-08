/**
 * Maps raw DonationBox records to include resolved perks from their matching Tier.
 *
 * Why? This logic was duplicated verbatim in both content.js and authController.js.
 * Extracting it eliminates ~25 lines of duplication and ensures consistent
 * perk resolution across all public endpoints.
 *
 * @param {Array} donationBoxes - Raw DonationBox records from Prisma.
 * @param {Array} tiers - Raw Tier records from Prisma.
 * @returns {Array} Mapped donation boxes with resolved perks arrays.
 */
export function mapDonationBoxes(donationBoxes, tiers) {
  return donationBoxes.map(box => {
    const plainBox = { ...box };

    if (!plainBox.isCustomAmount) {
      const matchingTier = tiers.find(
        t => t.name.toLowerCase() === plainBox.title.toLowerCase()
      );

      if (matchingTier) {
        let perks = [];
        try {
          perks = typeof matchingTier.perks === 'string'
            ? JSON.parse(matchingTier.perks)
            : (Array.isArray(matchingTier.perks) ? matchingTier.perks : []);
        } catch {
          perks = [];
        }
        plainBox.perks = perks;
      } else {
        plainBox.perks = plainBox.tierDetails
          ? plainBox.tierDetails.split('|').map(p => p.trim())
          : [];
      }
    } else {
      plainBox.perks = plainBox.tierDetails
        ? plainBox.tierDetails.split('|').map(p => p.trim())
        : [];
    }

    return plainBox;
  });
}
