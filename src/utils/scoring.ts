import { SurveyFormData, SurveyResponseDocument } from '../types';
import { serverTimestamp } from 'firebase/firestore';

export function computeScores(formData: SurveyFormData): SurveyResponseDocument['scores'] {
  const usefulnessScore = Number(formData.desirability.usefulnessScore) || 3;
  const desirabilityScore = (usefulnessScore / 5) * 100;

  const priceTier = formData.willingnessToPay.priceTier || '0';
  let priceTierWeight = 0;
  if (priceTier === '100-500') priceTierWeight = 20;
  else if (priceTier === '500-1000') priceTierWeight = 35;
  else if (priceTier === '1000+') priceTierWeight = 50;
  else priceTierWeight = 0;

  const wouldPay = Boolean(formData.willingnessToPay.wouldPay);
  const wtpScore = (wouldPay ? 40 : 0) + (priceTierWeight * 0.6);

  const npsScore = Number(formData.advocacy.npsScore) || 7;
  const advocacyScore = (npsScore / 10) * 100;
  const npsBucket: 'Promoter' | 'Passive' | 'Detractor' =
    npsScore >= 9 ? 'Promoter' : npsScore >= 7 ? 'Passive' : 'Detractor';

  const compositeScore = Math.round(
    (desirabilityScore * 0.4) + (wtpScore * 0.35) + (advocacyScore * 0.25)
  );

  const signalColor: 'green' | 'yellow' | 'red' =
    compositeScore >= 70 ? 'green' : compositeScore >= 45 ? 'yellow' : 'red';

  return {
    desirabilityScore: Math.round(desirabilityScore),
    wtpScore: Math.round(wtpScore),
    advocacyScore: Math.round(advocacyScore),
    compositeScore,
    npsBucket,
    signalColor,
  };
}
