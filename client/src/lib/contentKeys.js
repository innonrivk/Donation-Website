/**
 * Centralized registry of dynamic copy keys across all page fragments.
 * 
 * Why constants? Prevents runtime spelling mistakes when fetching website copy
 * in UI components and maintains strict matching with the backend Zod validator.
 */
export const CONTENT_KEYS = {
  // WELCOME Section
  WELCOME_HEADLINE: 'welcome_headline',
  WELCOME_SUBHEADLINE: 'welcome_subheadline',
  WELCOME_HERO_INTRO: 'welcome_hero_intro',

  // ACTIVE_PROJECTS Section
  PROJECTS_LABEL: 'projects_label',
  PROJECTS_TITLE: 'projects_title',
  PROJECTS_INTRO: 'projects_intro',

  // DONATION_BOXES Section
  BOXES_LABEL: 'boxes_label',
  BOXES_TITLE: 'boxes_title',
  BOXES_CTA: 'boxes_cta',

  // DONATION_TIERS Section
  TIERS_LABEL: 'tiers_label',
  TIERS_TITLE: 'tiers_title',
  TIERS_INTRO: 'tiers_intro',

  // DONATION_ROADMAP Section
  ROADMAP_LABEL: 'roadmap_label',
  ROADMAP_TITLE: 'roadmap_title',
  ROADMAP_INTRO: 'roadmap_intro',

  // TANGIBLE_IMPACT Section
  IMPACT_LABEL: 'impact_label',
  IMPACT_TITLE: 'impact_title',
  IMPACT_INTRO: 'impact_intro',

  // FOOTER Section
  FOOTER_BRAND_NAME: 'footer_brand_name',
  FOOTER_BRAND_DESC: 'footer_brand_desc',
  FOOTER_TAGLINE: 'footer_tagline',
};
