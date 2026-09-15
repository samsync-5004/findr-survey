import { SurveyResponseDocument } from '../types';

export const sampleResponses: SurveyResponseDocument[] = [
  {
    submittedAt: new Date(Date.now() - 3600000 * 2),
    screening: {
      levelOfStudy: '400 Level / Finalist',
      university: 'University of Lagos (UNILAG)',
      incomeType: 'both',
      trackingMethod: 'vibes'
    },
    desirability: {
      usefulnessScore: 5,
      frustration: 'POS charges are draining my allowance at night and bank alert delay makes market runs stressful.',
      topFeatures: ['Auto-parse Nigerian Bank SMS (POS & Transfer Alerts)', 'Urgent 2k Month-End Burn Rate Predictor', 'Roommate & Chop-Money Instant WhatsApp Bill Split'],
      preferPlatform: 'WhatsApp chatbot'
    },
    willingnessToPay: {
      wouldPay: true,
      whyWorthPaying: 'Saves me from unexpected month-end brokenness.',
      priceTier: '100-500',
      pricingModel: 'Airtime deduction (Direct carrier billing)',
      payExtraFor: 'Auto savings lock for exams'
    },
    advocacy: {
      npsScore: 10,
      whatWouldMakeThemShare: 'Free airtime raffle entry for inviting coursemates.',
      priorToolExperience: 'Monefy was too manual.',
      whatWouldMakeThemStop: 'If transaction sync fails frequently.'
    },
    openEnded: {
      magicWandAnswer: 'Auto-split hostel light bill and warn me before I spend my last ₦2,000.',
      otherThoughts: 'Keep it snappy on WhatsApp!',
      whatsappNumber: '08012345678'
    },
    scores: {
      desirabilityScore: 100,
      wtpScore: 52,
      advocacyScore: 100,
      compositeScore: 84,
      npsBucket: 'Promoter',
      signalColor: 'green'
    }
  },
  {
    submittedAt: new Date(Date.now() - 3600000 * 5),
    screening: {
      levelOfStudy: '300 Level',
      university: 'University of Ibadan (UI)',
      incomeType: 'allowance',
      trackingMethod: 'notes'
    },
    desirability: {
      usefulnessScore: 4,
      frustration: 'Forgetting where allowance vanished to after weekend hangout.',
      topFeatures: ['Auto-parse Nigerian Bank SMS (POS & Transfer Alerts)', 'Urgent 2k Month-End Burn Rate Predictor'],
      preferPlatform: 'WhatsApp'
    },
    willingnessToPay: {
      wouldPay: true,
      whyWorthPaying: 'Cheaper than a meat pie and saves time.',
      priceTier: '500-1000',
      pricingModel: 'Bank transfer / USSD',
      payExtraFor: 'Priority support'
    },
    advocacy: {
      npsScore: 9,
      whatWouldMakeThemShare: 'Already telling my roommates.',
      priorToolExperience: 'Excel sheets are too heavy.',
      whatWouldMakeThemStop: 'Hidden charges.'
    },
    openEnded: {
      magicWandAnswer: 'Detect when my stipend hits and categorize automatically.',
      otherThoughts: 'Great product concept.',
      whatsappNumber: '08098765432'
    },
    scores: {
      desirabilityScore: 80,
      wtpScore: 61,
      advocacyScore: 90,
      compositeScore: 76,
      npsBucket: 'Promoter',
      signalColor: 'green'
    }
  },
  {
    submittedAt: new Date(Date.now() - 3600000 * 12),
    screening: {
      levelOfStudy: '200 Level',
      university: 'Obafemi Awolowo University (OAU)',
      incomeType: 'side hustle',
      trackingMethod: 'sheets'
    },
    desirability: {
      usefulnessScore: 3,
      frustration: 'Manual spreadsheet entry is exhausting after lectures.',
      topFeatures: ['Roommate & Chop-Money Instant WhatsApp Bill Split', 'Course Dues & Dept Fees Deadline Reminders'],
      preferPlatform: 'WhatsApp'
    },
    willingnessToPay: {
      wouldPay: false,
      whyWorthPaying: 'Prefer free ad-supported tier.',
      priceTier: '0',
      pricingModel: 'Airtime deduction (Direct carrier billing)',
      payExtraFor: 'None'
    },
    advocacy: {
      npsScore: 7,
      whatWouldMakeThemShare: 'More robust security reassurances.',
      priorToolExperience: 'Google Sheets',
      whatWouldMakeThemStop: 'Data privacy concerns.'
    },
    openEnded: {
      magicWandAnswer: 'Secure bank SMS parsing with end-to-end privacy.',
      otherThoughts: 'Security is key.',
      whatsappNumber: '08123456789'
    },
    scores: {
      desirabilityScore: 60,
      wtpScore: 0,
      advocacyScore: 70,
      compositeScore: 42,
      npsBucket: 'Passive',
      signalColor: 'red'
    }
  },
  {
    submittedAt: new Date(Date.now() - 3600000 * 24),
    screening: {
      levelOfStudy: '100 Level / Fresher',
      university: 'Covenant University',
      incomeType: 'allowance',
      trackingMethod: 'fintech'
    },
    desirability: {
      usefulnessScore: 5,
      frustration: 'Campus shock when university fees and departmental dues land at once.',
      topFeatures: ['Urgent 2k Month-End Burn Rate Predictor', 'Course Dues & Dept Fees Deadline Reminders', 'Auto-parse Nigerian Bank SMS (POS & Transfer Alerts)'],
      preferPlatform: 'WhatsApp'
    },
    willingnessToPay: {
      wouldPay: true,
      whyWorthPaying: 'A lifesaver for freshers learning how to budget.',
      priceTier: '100-500',
      pricingModel: 'Debit Card auto-renew',
      payExtraFor: 'Automated savings lock'
    },
    advocacy: {
      npsScore: 10,
      whatWouldMakeThemShare: 'Recommend to all fellowship and department group chats.',
      priorToolExperience: 'Kuda app analytics',
      whatWouldMakeThemStop: 'Nothing so far.'
    },
    openEnded: {
      magicWandAnswer: 'Automatically lock caution fees and dues separately from pocket money.',
      otherThoughts: 'Excited for the launch!',
      whatsappNumber: '08055554444'
    },
    scores: {
      desirabilityScore: 100,
      wtpScore: 52,
      advocacyScore: 100,
      compositeScore: 84,
      npsBucket: 'Promoter',
      signalColor: 'green'
    }
  },
  {
    submittedAt: new Date(Date.now() - 3600000 * 36),
    screening: {
      levelOfStudy: '500 Level',
      university: 'Federal University of Technology, Owerri (FUTO)',
      incomeType: 'both',
      trackingMethod: 'none'
    },
    desirability: {
      usefulnessScore: 4,
      frustration: 'Project printing costs and late-night snacks depleting funds without notice.',
      topFeatures: ['Roommate & Chop-Money Instant WhatsApp Bill Split', 'Auto-parse Nigerian Bank SMS (POS & Transfer Alerts)'],
      preferPlatform: 'WhatsApp'
    },
    willingnessToPay: {
      wouldPay: true,
      whyWorthPaying: 'Well worth a small monthly contribution.',
      priceTier: '500-1000',
      pricingModel: 'Bank transfer / USSD',
      payExtraFor: 'Project budget tracker'
    },
    advocacy: {
      npsScore: 8,
      whatWouldMakeThemShare: 'If it helps me track final year project expenses.',
      priorToolExperience: 'None',
      whatWouldMakeThemStop: 'Slow responses.'
    },
    openEnded: {
      magicWandAnswer: 'Project expense tracker and split calculation.',
      otherThoughts: 'Build it fast!',
      whatsappNumber: '08033332222'
    },
    scores: {
      desirabilityScore: 80,
      wtpScore: 61,
      advocacyScore: 80,
      compositeScore: 74,
      npsBucket: 'Passive',
      signalColor: 'green'
    }
  },
  {
    submittedAt: new Date(Date.now() - 3600000 * 48),
    screening: {
      levelOfStudy: '200 Level',
      university: 'Lagos State University (LASU)',
      incomeType: 'allowance',
      trackingMethod: 'vibes'
    },
    desirability: {
      usefulnessScore: 2,
      frustration: 'Not sure if I need another bot when banking apps exist.',
      topFeatures: ['Roommate & Chop-Money Instant WhatsApp Bill Split'],
      preferPlatform: 'App'
    },
    willingnessToPay: {
      wouldPay: false,
      whyWorthPaying: 'Only free tier.',
      priceTier: '0',
      pricingModel: 'Airtime deduction (Direct carrier billing)',
      payExtraFor: 'None'
    },
    advocacy: {
      npsScore: 5,
      whatWouldMakeThemShare: 'Proof that it works better than bank alerts.',
      priorToolExperience: 'Opay alerts',
      whatWouldMakeThemStop: 'Too many notification messages.'
    },
    openEnded: {
      magicWandAnswer: 'Direct bank integration with zero manual typing.',
      otherThoughts: 'Needs to be seamless.',
      whatsappNumber: '08011110000'
    },
    scores: {
      desirabilityScore: 40,
      wtpScore: 0,
      advocacyScore: 50,
      compositeScore: 28,
      npsBucket: 'Detractor',
      signalColor: 'red'
    }
  }
];
