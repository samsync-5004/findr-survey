export interface SurveyFormData {
  screening: {
    levelOfStudy: string;
    university: string;
    incomeType: string; // "allowance" | "side hustle" | "both"
    trackingMethod: string; // "vibes" | "notes" | "sheets" | "fintech" | "none"
  };
  desirability: {
    usefulnessScore: number; // 1-5
    frustration: string; // free text (Q7)
    topFeatures: string[]; // multi-select (Q8)
    preferPlatform: string; // free text (Q9)
  };
  willingnessToPay: {
    wouldPay: boolean; // Q10
    whyWorthPaying: string; // Q11 free text
    priceTier: string; // "0" | "100-500" | "500-1000" | "1000+"
    pricingModel: string; // Q13
    payExtraFor: string; // Q14 free text
  };
  advocacy: {
    npsScore: number; // 1-10 (Q15)
    whatWouldMakeThemShare: string; // Q16 free text
    priorToolExperience: string; // Q17 free text
    whatWouldMakeThemStop: string; // Q18 free text
  };
  openEnded: {
    magicWandAnswer: string; // Q19
    otherThoughts: string; // Q20
    whatsappNumber?: string; // Optional WhatsApp contact for raffle/beta
  };
}

export interface SurveyResponseDocument extends SurveyFormData {
  id?: string;
  submittedAt: any; // Firestore Timestamp or Date
  scores: {
    desirabilityScore: number;
    wtpScore: number;
    advocacyScore: number;
    compositeScore: number;
    npsBucket: 'Promoter' | 'Passive' | 'Detractor';
    signalColor: 'green' | 'yellow' | 'red';
  };
}
