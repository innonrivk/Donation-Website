/**
 * Fallback static copy for client-side rendering when the backend API server is unreachable.
 * Aligns with brand tiers, milestones, and active campaigns.
 */
export const FALLBACK_DONATION_CONTENT = {
  websiteContent: {
    head: 'Empower Communities, Transform Lives',
    subtitle: 'Your monthly donation creates lasting impact through sustainable projects worldwide',
    body: 'By becoming a monthly donor, you join a movement of changemakers who believe in consistent, long-term impact. Your contribution — no matter the size — helps us plan ahead, scale our projects, and deliver measurable results to the communities we serve.\n\n10% of all donations go into our community "Piggy Banks," where you and fellow donors vote on which projects receive additional funding boosts. Together, we decide where your impact grows.',
  },
  donationBoxes: [
    {
      id: 0,
      title: 'Custom Amount',
      amount: 0,
      tierDetails: 'Choose your own amount',
      buttonText: 'Donate',
      isCustomAmount: true,
      displayOrder: 1,
      perks: ['Choose your own amount']
    },
    {
      id: 1,
      title: 'Regular',
      amount: 10,
      tierDetails: 'Monthly newsletter | Yearly zoom event | Voting seeds | Discounted tours',
      buttonText: 'Donate $10/mo',
      isCustomAmount: false,
      displayOrder: 2,
      perks: [
        'Monthly updates from our newsletter',
        'Invitation to "OMP\'s yearly impact" yearly zoom event',
        'Monthly seed coupons for voting based on the donated amount (1 seed = $1)',
        'Access to OMP group tours at a discounted rate (the real price without the middlemen)'
      ]
    },
    {
      id: 2,
      title: 'Shareholder',
      amount: 85,
      tierDetails: 'All Regular perks | Progression meetings | Campaign voting | Design voting',
      buttonText: 'Donate $85/mo',
      isCustomAmount: false,
      displayOrder: 3,
      perks: [
        'All Regular tier perks',
        'Quarter meetings: progression and behind the scenes — your opinions shape marketing research',
        'Special voting to create a campaign shown on the platform, with monthly aid from OMP for half a year from the second piggy bank',
        'Every $10 above $75 grants an additional vote',
        'Voting on small things like design for camp t-shirts and more'
      ]
    },
    {
      id: 3,
      title: 'Patron',
      amount: 170,
      tierDetails: 'All Shareholder perks | T-shirt sponsor print | Social media thank-yous',
      buttonText: 'Donate $170/mo',
      isCustomAmount: false,
      displayOrder: 4,
      perks: [
        'All Shareholder tier perks',
        'Your name on the back of camp t-shirts in the "sponsors" section',
        'Personal thank-you on our social media — quarterly name posts and video shout-outs'
      ]
    },
  ],
  projects: [
    { id: 1, projectName: 'Train The Trainer Camp', details: 'A 3-month on-site camp for Southeast Asian youth (Thailand, Myanmar and Laos) building critical thinking leaders. Focuses on 21st-century skills: problem-solving, confidence, teamwork, and motivation. Themes cover SDGs, digital/AI literacy, marketing, and social impact.', fundingGoal: 5000000, fundedAmount: 1875000 },
    { id: 2, projectName: 'Active Learning Camp', details: 'An intensive, hands-on innovation program equipping youth with AI, digital, and problem-solving skills through immersive 4–7 day camps and mentorship. Each camp empowers roughly 60 participants to develop 5–10 project prototypes targeting local environmental, civic, or business challenges. Following the camp, youth leverage the "OpenSkills" platform for advanced learning pathways, portfolio building, and continuous guidance to turn ideas into real solutions.', fundingGoal: 3000000, fundedAmount: 1200000 },
    { id: 3, projectName: 'Openmind.Travel', details: 'A hands-on innovation program equips underprivileged Thai youth with digital, problem-solving, marketing, and English skills via 10-day camps. Forty participants design local community tourism plans to transform villages into self-reliant hotspots. Post-camp, youth use the "OpenSkills" platform for advanced learning and marketing mentorship. These community initiatives are showcased on the "Openmind Travel" platform and integrated into "Openmind Tours," an organized group travel initiative launching this year to give travelers immersive rural experiences.', fundingGoal: 4000000, fundedAmount: 2400000 },
  ],
  tiers: [
    {
      id: 1,
      tierLevel: 1,
      name: 'Regular',
      minAmount: 1,
      maxAmount: 84,
      perks: [
        'Monthly updates from our newsletter',
        'Invitation to "OMP\'s yearly impact" yearly zoom event',
        'Monthly seed coupons for voting based on the donated amount (1 seed = $1)',
        'Access to OMP group tours at a discounted rate (the real price without the middlemen)'
      ]
    },
    {
      id: 2,
      tierLevel: 2,
      name: 'Shareholder',
      minAmount: 85,
      maxAmount: 169,
      perks: [
        'All Regular tier perks',
        'Quarter meetings: progression and behind the scenes — your opinions shape marketing research',
        'Special voting to create a campaign shown on the platform, with monthly aid from OMP for half a year from the second piggy bank',
        'Every $10 above $75 grants an additional vote',
        'Voting on small things like design for camp t-shirts and more'
      ]
    },
    {
      id: 3,
      tierLevel: 3,
      name: 'Patron',
      minAmount: 170,
      maxAmount: null,
      perks: [
        'All Shareholder tier perks',
        'Your name on the back of camp t-shirts in the "sponsors" section',
        'Personal thank-you on our social media — quarterly name posts and video shout-outs'
      ]
    }
  ],
  milestones: [
    {
      id: 1,
      amountUsd: 1020,
      label: 'Silver "OMP Friend"',
      description: 'A silver "OMP friend" certificate will be sent to your home.',
      isRepeatable: false,
      displayOrder: 1,
    },
    {
      id: 2,
      amountUsd: 2040,
      label: 'Gold "OMP Friend"',
      description: 'A gold "OMP friend" certificate will be sent to your home.',
      isRepeatable: false,
      displayOrder: 2,
    },
    {
      id: 3,
      amountUsd: 3060,
      label: 'Platinum "OMP Friend"',
      description: 'A platinum "OMP friend" certificate will be sent to your home.',
      isRepeatable: false,
      displayOrder: 3,
    },
    {
      id: 4,
      amountUsd: 6000,
      label: 'Camp Patrons',
      description: '"Camp patron" certificate — a camp will be called by your name and your picture will be printed and put in the camp center.',
      isRepeatable: true,
      displayOrder: 4,
    },
    {
      id: 5,
      amountUsd: 10000,
      label: 'Patreon Wall',
      description: 'A permanent place on OMP\'s patreon wall at the center.',
      isRepeatable: false,
      displayOrder: 5,
    }
  ],
};
