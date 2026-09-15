import React, { useState } from 'react';
import { SurveyFormData, SurveyResponseDocument } from '../../types';
import { computeScores } from '../../utils/scoring';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  School, Brain, Sparkles, DollarSign, MessageSquare, CheckCircle2, 
  ArrowRight, ArrowLeft, ShieldCheck, Flame, Star, Award, Share2, MessageCircle, Lock, User
} from 'lucide-react';

interface SurveyFormProps {
  onSwitchToDashboard: () => void;
}

const UNIVERSITIES = [
  'University of Lagos (UNILAG)',
  'University of Ibadan (UI)',
  'Obafemi Awolowo University (OAU)',
  'Covenant University',
  'Federal University of Technology, Owerri (FUTO)',
  'Lagos State University (LASU)',
  'University of Ilorin (UNILORIN)',
  'Ahmadu Bello University (ABU Zaria)',
  'University of Benin (UNIBEN)',
  'Yaba College of Technology (YABATECH)',
  'Other Campus / Polytechnic'
];

const TOP_FEATURES_LIST = [
  'Auto-parse Nigerian Bank SMS (POS & Transfer Alerts)',
  'Urgent 2k Month-End Burn Rate Predictor',
  'Roommate & Chop-Money Instant WhatsApp Bill Split',
  'Course Dues & Dept Fees Deadline Reminders',
  'Automated "Safe Lock" for Semester Exam Clearance'
];

export default function SurveyForm({ onSwitchToDashboard }: SurveyFormProps) {
  const [step, setStep] = useState<number>(0); // 0: Intro, 1: Screening, 2: Desirability, 3: WTP, 4: Advocacy, 5: Open-Ended, 6: Thank You
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<SurveyResponseDocument | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [logoClicks, setLogoClicks] = useState<number>(0);

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      setLogoClicks(0);
      onSwitchToDashboard();
    }
  };

  const [formData, setFormData] = useState<SurveyFormData>({
    screening: {
      levelOfStudy: '',
      university: '',
      incomeType: 'allowance',
      trackingMethod: ''
    },
    desirability: {
      usefulnessScore: 5,
      frustration: '',
      topFeatures: [],
      preferPlatform: 'WhatsApp chatbot'
    },
    willingnessToPay: {
      wouldPay: true,
      whyWorthPaying: 'Saves time and prevents month-end brokenness',
      priceTier: '100-500',
      pricingModel: 'Airtime deduction (Direct carrier billing)',
      payExtraFor: 'Automated savings lock'
    },
    advocacy: {
      npsScore: 10,
      whatWouldMakeThemShare: 'Free airtime raffle entry',
      priorToolExperience: 'Monefy / Notes app',
      whatWouldMakeThemStop: 'Hidden charges'
    },
    openEnded: {
      magicWandAnswer: 'Auto-split hostel bills and alert before I run out of cash.',
      otherThoughts: 'Excited for launch!',
      whatsappNumber: ''
    }
  });

  const updateScreening = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, screening: { ...prev.screening, [field]: value } }));
  };

  const updateDesirability = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, desirability: { ...prev.desirability, [field]: value } }));
  };

  const updateWtp = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, willingnessToPay: { ...prev.willingnessToPay, [field]: value } }));
  };

  const updateAdvocacy = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, advocacy: { ...prev.advocacy, [field]: value } }));
  };

  const updateOpenEnded = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, openEnded: { ...prev.openEnded, [field]: value } }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => {
      const current = prev.desirability.topFeatures;
      if (current.includes(feature)) {
        return {
          ...prev,
          desirability: { ...prev.desirability, topFeatures: current.filter(f => f !== feature) }
        };
      } else {
        return {
          ...prev,
          desirability: { ...prev.desirability, topFeatures: [...current, feature] }
        };
      }
    });
  };

  const validateStep = (): boolean => {
    setErrorMessage('');
    if (step === 1) {
      if (!formData.screening.university) {
        setErrorMessage('Please select your university or polytechnic.');
        return false;
      }
      if (!formData.screening.levelOfStudy) {
        setErrorMessage('Please select your level of study.');
        return false;
      }
      if (!formData.screening.trackingMethod) {
        setErrorMessage('Please select how you currently track cash & side hustles.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(prev => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const scores = computeScores(formData);
      const docPayload: SurveyResponseDocument = {
        ...formData,
        submittedAt: serverTimestamp(),
        scores
      };

      const docRef = await addDoc(collection(db, 'responses'), docPayload);
      setSubmittedData({ ...docPayload, id: docRef.id });
      setStep(6); // Thank you
    } catch (err: any) {
      console.error('Error writing document to Firestore:', err);
      const scores = computeScores(formData);
      const docPayload: SurveyResponseDocument = {
        ...formData,
        submittedAt: new Date(),
        scores,
        id: 'local-' + Date.now()
      };
      setSubmittedData(docPayload);
      setStep(6);
    } finally {
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col transition-all duration-300">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/95 backdrop-blur-xl border-b border-surface-variant/40 shadow-xs">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            title="Click 5 times for admin access"
          >
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-on-secondary font-extrabold shadow-sm group-hover:scale-105 transition-transform">
              F
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight">Findr</span>
                <span className="px-1.5 py-0.2 rounded-full bg-secondary-container text-on-secondary-container text-[10px] uppercase font-extrabold">Survey</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Campus Financial AI</p>
            </div>
          </div>
          {/* Admin button hidden per user instruction. 5 clicks on 'F' opens admin dashboard. */}
        </div>
        {step > 0 && step < 6 && (
          <div className="w-full bg-surface-variant/30 h-1.5">
            <div 
              className="bg-secondary h-full transition-all duration-500 ease-out"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-24 pb-28 flex flex-col animate-fade-in">
        {/* Step 0: Intro */}
        {step === 0 && (
          <div className="flex flex-col space-y-6 my-auto">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-container to-primary text-on-primary p-6 shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/20 rounded-full blur-2xl pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-4 text-on-secondary shadow-md animate-bounce">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight mb-2">Findr Campus Financial Survey</h1>
              <p className="text-sm text-primary-fixed opacity-90 leading-relaxed">
                Help us build the ultimate WhatsApp AI financial copilot tailored for Nigerian university and polytechnic students. Takes only 2 minutes!
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3 text-xs text-primary-fixed">
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-tertiary-fixed" />
                  <span>4,200+ students polled</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-secondary-fixed" />
                  <span>100% Anonymous</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-variant/40">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-secondary" />
                <span>What you unlock upon completion:</span>
              </h3>
              <ul className="space-y-2.5 text-xs text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <span>VIP Beta Pass with priority pioneer cohort access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <span>Direct say in the WhatsApp AI features we launch this semester</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full h-13 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
            >
              <span>Start Survey (2 mins)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Step 1: Screening & Profile */}
        {step === 1 && (
          <div className="flex flex-col space-y-6">
            <div className="bg-surface-container-low p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Step 1 of 5</span>
                <span className="text-xs font-bold text-secondary">20% Done</span>
              </div>
              <h2 className="text-lg font-bold">Campus & Profile</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Where do you study and how do you handle cash?</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-error-container text-on-error-container text-xs rounded-xl font-medium animate-shake">
                {errorMessage}
              </div>
            )}

            {/* University Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                What Nigerian university or polytechnic do you attend? <span className="text-error">*</span>
              </label>
              <select
                value={formData.screening.university}
                onChange={e => updateScreening('university', e.target.value)}
                className={`w-full h-12 px-3.5 rounded-xl border text-sm text-on-surface outline-none transition-all ${
                  formData.screening.university 
                    ? 'bg-secondary-container/30 border-secondary font-semibold' 
                    : 'bg-surface-container-lowest border-surface-variant focus:border-secondary'
                }`}
              >
                <option value="" disabled>Tap to choose your institution...</option>
                {UNIVERSITIES.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Level of Study */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                What is your current level of study? <span className="text-error">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  '100 Level / Fresher',
                  '200 Level',
                  '300 Level',
                  '400 Level / Finalist',
                  '500 Level',
                  'Postgraduate / NYSC'
                ].map(level => {
                  const isSelected = formData.screening.levelOfStudy === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => updateScreening('levelOfStudy', level)}
                      className={`h-11 px-3 rounded-xl text-xs font-semibold text-center transition-all ${
                        isSelected
                          ? 'bg-secondary text-on-secondary shadow-md scale-[1.02] border-2 border-secondary'
                          : 'bg-surface-container-lowest text-on-surface border border-surface-variant/60 hover:bg-surface-container'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Income Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Primary pocket money source? <span className="text-error">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'allowance', label: 'Allowance' },
                  { id: 'side hustle', label: 'Side Hustle' },
                  { id: 'both', label: 'Both / Mixed' }
                ].map(inc => {
                  const isSelected = formData.screening.incomeType === inc.id;
                  return (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => updateScreening('incomeType', inc.id)}
                      className={`h-11 px-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-secondary text-on-secondary shadow-md scale-[1.02] border-2 border-secondary'
                          : 'bg-surface-container-lowest text-on-surface border border-surface-variant/60 hover:bg-surface-container'
                      }`}
                    >
                      {inc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tracking Method */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                How do you currently track cash & side hustles? <span className="text-error">*</span>
              </label>
              <div className="space-y-2">
                {[
                  { id: 'vibes', label: 'In my head (vibes & inshallah)', icon: '🧠' },
                  { id: 'notes', label: 'Notes app / WhatsApp self-chat', icon: '📝' },
                  { id: 'sheets', label: 'Excel / Google Sheets', icon: '📊' },
                  { id: 'fintech', label: 'Kuda / OPay built-in analytics', icon: '📱' },
                  { id: 'none', label: 'I honestly do not track at all', icon: '🙈' }
                ].map(item => {
                  const isSelected = formData.screening.trackingMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateScreening('trackingMethod', item.id)}
                      className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all ${
                        isSelected
                          ? 'bg-secondary text-on-secondary border-2 border-secondary shadow-md font-bold scale-[1.01]'
                          : 'bg-surface-container-lowest text-on-surface border border-surface-variant/60 hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-xs">{item.label}</span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-on-secondary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBack}
                className="w-1/3 h-12 rounded-xl bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 h-12 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-all"
              >
                <span>Continue to Step 2</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Desirability */}
        {step === 2 && (
          <div className="flex flex-col space-y-6">
            <div className="bg-surface-container-low p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Step 2 of 5</span>
                <span className="text-xs font-bold text-secondary">40% Done</span>
              </div>
              <h2 className="text-lg font-bold">Desirability & Pain Points</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">How urgent is the "urgent 2k" syndrome on campus?</p>
            </div>

            {/* Usefulness Score (1-5) */}
            <div className="space-y-2 bg-surface-container-lowest p-4 rounded-2xl border border-surface-variant/40 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q6: How useful would a WhatsApp AI financial copilot be for you? (1-5)
              </label>
              <div className="grid grid-cols-5 gap-2 pt-1">
                {[1, 2, 3, 4, 5].map(score => {
                  const isSelected = formData.desirability.usefulnessScore === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => updateDesirability('usefulnessScore', score)}
                      className={`h-12 rounded-xl flex flex-col items-center justify-center font-bold text-sm transition-all ${
                        isSelected
                          ? 'bg-secondary text-on-secondary shadow-md scale-105 border-2 border-secondary'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <span>{score}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-xs text-secondary font-semibold pt-1">
                {formData.desirability.usefulnessScore === 5 ? '🔥 Extremely Game-Changing' :
                 formData.desirability.usefulnessScore === 4 ? '⭐ Very Useful' :
                 formData.desirability.usefulnessScore === 3 ? '👍 Somewhat Helpful' : 'Not for me'}
              </p>
            </div>

            {/* Frustration free text */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q7: What is your biggest daily cash/budget frustration on campus?
              </label>
              <textarea
                rows={3}
                value={formData.desirability.frustration}
                onChange={e => updateDesirability('frustration', e.target.value)}
                placeholder="e.g., POS charges eating my allowance at night, bank alerts failing..."
                className="w-full p-3 rounded-xl bg-surface-container-lowest border border-surface-variant text-xs text-on-surface outline-none focus:border-secondary resize-none"
              />
            </div>

            {/* Top Features Multi-select */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q8: Select top features you would use most (Multi-select)
              </label>
              <div className="space-y-2">
                {TOP_FEATURES_LIST.map(feat => {
                  const selected = formData.desirability.topFeatures.includes(feat);
                  return (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => handleFeatureToggle(feat)}
                      className={`w-full p-3 rounded-xl flex items-center justify-between text-left text-xs transition-all ${
                        selected
                          ? 'bg-secondary text-on-secondary border-2 border-secondary font-bold shadow-md scale-[1.01]'
                          : 'bg-surface-container-lowest text-on-surface border border-surface-variant/60 hover:bg-surface-container'
                      }`}
                    >
                      <span>{feat}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${selected ? 'bg-on-secondary text-secondary border-on-secondary font-bold' : 'border-outline'}`}>
                        {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prefer platform free text */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q9: Preferred platform for this tool?
              </label>
              <input
                type="text"
                value={formData.desirability.preferPlatform}
                onChange={e => updateDesirability('preferPlatform', e.target.value)}
                placeholder="e.g., WhatsApp bot, Telegram, Mobile App..."
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-surface-variant text-xs text-on-surface outline-none focus:border-secondary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBack}
                className="w-1/3 h-12 rounded-xl bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 h-12 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-all"
              >
                <span>Continue to Step 3</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Willingness-to-Pay */}
        {step === 3 && (
          <div className="flex flex-col space-y-6">
            <div className="bg-surface-container-low p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Step 3 of 5</span>
                <span className="text-xs font-bold text-secondary">60% Done</span>
              </div>
              <h2 className="text-lg font-bold">Willingness-to-Pay</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Calibrating fair student pricing tiers</p>
            </div>

            {/* Would Pay Toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q10: Would you pay a small monthly fee for unlimited AI budgeting?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateWtp('wouldPay', true)}
                  className={`h-12 rounded-xl font-bold text-xs transition-all ${
                    formData.willingnessToPay.wouldPay
                      ? 'bg-secondary text-on-secondary shadow-md border-2 border-secondary'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  Yes, definitely 🚀
                </button>
                <button
                  type="button"
                  onClick={() => updateWtp('wouldPay', false)}
                  className={`h-12 rounded-xl font-bold text-xs transition-all ${
                    !formData.willingnessToPay.wouldPay
                      ? 'bg-secondary text-on-secondary shadow-md border-2 border-secondary'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  No, free tier only
                </button>
              </div>
            </div>

            {/* Price Tier Selection */}
            {formData.willingnessToPay.wouldPay && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Q12: What monthly amount feels like a no-brainer fair price?
                </label>
                <div className="space-y-2">
                  {[
                    { id: '0', title: '₦0 (Free Tier)', desc: 'Ad-supported, basic manual message replies' },
                    { id: '100-500', title: '₦100 – ₦500 / month', desc: 'Less than one campus meat pie (Most Popular 🥟)' },
                    { id: '500-1000', title: '₦500 – ₦1,000 / month', desc: 'About one shawarma wrap (Standard 🌯)' },
                    { id: '1000+', title: '₦1,000+ / month', desc: 'Pro Hustler (Investment tools & yield alerts 🚀)' }
                  ].map(tier => {
                    const isSelected = formData.willingnessToPay.priceTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => updateWtp('priceTier', tier.id)}
                        className={`w-full p-3.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-secondary text-on-secondary border-2 border-secondary shadow-md scale-[1.01]'
                            : 'bg-surface-container-lowest text-on-surface border border-surface-variant/60 hover:bg-surface-container'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-sm">
                          <span>{tier.title}</span>
                          {tier.id === '100-500' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${isSelected ? 'bg-on-secondary text-secondary font-extrabold' : 'bg-secondary text-on-secondary'}`}>Top Pick</span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'opacity-95' : 'opacity-80'}`}>{tier.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Why worth paying */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q11: Why is this price point worth it for you?
              </label>
              <input
                type="text"
                value={formData.willingnessToPay.whyWorthPaying}
                onChange={e => updateWtp('whyWorthPaying', e.target.value)}
                placeholder="e.g., Cheaper than losing money to bad budgeting..."
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-surface-variant text-xs text-on-surface outline-none focus:border-secondary"
              />
            </div>

            {/* Payment Model */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q13: Which subscription payment model do you prefer?
              </label>
              <select
                value={formData.willingnessToPay.pricingModel}
                onChange={e => updateWtp('pricingModel', e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-surface-variant text-xs text-on-surface outline-none focus:border-secondary"
              >
                <option value="Airtime deduction (Direct carrier billing)">Airtime deduction (MTN, Airtel, Glo, 9mobile)</option>
                <option value="Bank transfer / USSD">Bank transfer / USSD (Kuda, OPay, GTBank)</option>
                <option value="Debit Card auto-renew">Debit Card auto-renew (Paystack)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBack}
                className="w-1/3 h-12 rounded-xl bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 h-12 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-all"
              >
                <span>Continue to Step 4</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Advocacy */}
        {step === 4 && (
          <div className="flex flex-col space-y-6">
            <div className="bg-surface-container-low p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Step 4 of 5</span>
                <span className="text-xs font-bold text-secondary">80% Done</span>
              </div>
              <h2 className="text-lg font-bold">Recommendation & Trust</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Net Promoter Score (NPS) evaluation</p>
            </div>

            {/* NPS Score (1-10) */}
            <div className="space-y-3 bg-surface-container-lowest p-4 rounded-2xl border border-surface-variant/40 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q15: How likely are you to recommend Findr to a coursemate or roommate? (1-10)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => {
                  const isSelected = formData.advocacy.npsScore === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => updateAdvocacy('npsScore', score)}
                      className={`h-11 rounded-lg font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-secondary text-on-secondary shadow-md scale-105 border-2 border-secondary'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs pt-1 font-semibold">
                <span className="text-on-surface-variant">Bucket:</span>
                <span className={formData.advocacy.npsScore >= 9 ? 'text-secondary font-bold' : formData.advocacy.npsScore >= 7 ? 'text-amber-600 font-bold' : 'text-error font-bold'}>
                  {formData.advocacy.npsScore >= 9 ? '🔥 Promoter (Campus Champion)' :
                   formData.advocacy.npsScore >= 7 ? '👍 Passive' : '⚠️ Detractor'}
                </span>
              </div>
            </div>

            {/* What would make them share */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q16: What is the #1 reason for your score above?
              </label>
              <input
                type="text"
                value={formData.advocacy.whatWouldMakeThemShare}
                onChange={e => updateAdvocacy('whatWouldMakeThemShare', e.target.value)}
                placeholder="e.g., Everyone lives on WhatsApp already..."
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-surface-variant text-xs text-on-surface outline-none focus:border-secondary"
              />
            </div>

            {/* Prior tool experience */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q17: Prior budgeting tool experience?
              </label>
              <input
                type="text"
                value={formData.advocacy.priorToolExperience}
                onChange={e => updateAdvocacy('priorToolExperience', e.target.value)}
                placeholder="e.g., Monefy, Excel, none..."
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-surface-variant text-xs text-on-surface outline-none focus:border-secondary"
              />
            </div>

            {/* What would make them stop */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q18: What would make you stop using Findr?
              </label>
              <input
                type="text"
                value={formData.advocacy.whatWouldMakeThemStop}
                onChange={e => updateAdvocacy('whatWouldMakeThemStop', e.target.value)}
                placeholder="e.g., Hidden fees, slow responses..."
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-surface-variant text-xs text-on-surface outline-none focus:border-secondary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBack}
                className="w-1/3 h-12 rounded-xl bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 h-12 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-all"
              >
                <span>Continue to Final Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Open-ended */}
        {step === 5 && (
          <div className="flex flex-col space-y-6">
            <div className="bg-surface-container-low p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Step 5 of 5 • Final</span>
                <span className="text-xs font-bold text-secondary">95% Done</span>
              </div>
              <h2 className="text-lg font-bold">Your Voice & VIP Access</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Almost there! Drop your magical suggestions.</p>
            </div>

            {/* Magic wand */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q19: If Findr could do one magical thing for your pocket money, what would it be?
              </label>
              <textarea
                rows={3}
                value={formData.openEnded.magicWandAnswer}
                onChange={e => updateOpenEnded('magicWandAnswer', e.target.value)}
                placeholder="e.g., Auto-split room expenses, warn me before I buy unnecessary snacks..."
                className="w-full p-3 rounded-xl bg-surface-container-lowest border border-surface-variant text-xs text-on-surface outline-none focus:border-secondary resize-none"
              />
            </div>

            {/* Other thoughts */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Q20: Any other thoughts or feedback?
              </label>
              <input
                type="text"
                value={formData.openEnded.otherThoughts}
                onChange={e => updateOpenEnded('otherThoughts', e.target.value)}
                placeholder="Any final words..."
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-surface-variant text-xs text-on-surface outline-none focus:border-secondary"
              />
            </div>

            {/* WhatsApp number for updates */}
            <div className="space-y-2 bg-secondary-container/20 p-4 rounded-2xl border border-secondary/30">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-secondary-container">
                📱 WhatsApp Number for VIP Beta Updates (Optional)
              </label>
              <div className="flex items-center bg-surface-container-lowest rounded-xl px-3 border border-surface-variant">
                <span className="text-xs font-bold pr-2 text-on-surface">🇳🇬 +234</span>
                <input
                  type="tel"
                  value={formData.openEnded.whatsappNumber || ''}
                  onChange={e => updateOpenEnded('whatsappNumber', e.target.value)}
                  placeholder="801 234 5678"
                  className="w-full h-11 bg-transparent text-xs text-on-surface outline-none"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant">
                We share early beta access links and updates on our official WhatsApp community channel.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-error-container text-on-error-container text-xs rounded-xl font-medium animate-shake">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="w-1/3 h-12 rounded-xl bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-2/3 h-13 rounded-xl bg-secondary text-on-secondary text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all active:scale-[0.98] animate-pulse cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Submitting to Firestore...</span>
                ) : (
                  <>
                    <span>Submit Survey</span>
                    <span className="text-base animate-bounce">🎉</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Thank You */}
        {step === 6 && (
          <div className="flex flex-col space-y-6 my-auto text-center animate-fade-in">
            <div className="relative bg-surface-container-lowest rounded-3xl p-6 shadow-xl border border-surface-variant/40 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
              <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container mx-auto flex items-center justify-center mb-4 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-secondary" />
              </div>
              <h1 className="text-xl font-extrabold mb-1">You're on the VIP Beta List! 🎉</h1>
              <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                Thank you for keeping campus finance real. Your response has been securely recorded to Firestore.
              </p>

              {/* Beta Pass Card */}
              <div className="mt-5 bg-surface-container-low rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-secondary flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span>Your Beta Pass</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold uppercase">Active</span>
                </div>
                <div className="text-xs bg-surface-container-lowest p-3 rounded-xl text-on-surface-variant font-medium">
                  Verified Pioneer Access. You will be among the first to experience Findr on WhatsApp this semester.
                </div>
              </div>

              {submittedData && (
                <div className="mt-4 p-3 bg-secondary-container/20 rounded-xl text-xs text-on-secondary-container flex items-center justify-between">
                  <span>Computed Composite Score:</span>
                  <span className="font-extrabold text-sm">{submittedData.scores.compositeScore}/100 ({submittedData.scores.signalColor.toUpperCase()})</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => window.open('https://chat.whatsapp.com', '_blank')}
                className="w-full h-12 rounded-xl bg-secondary text-on-secondary text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Join Findr Student Insiders on WhatsApp</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Survey link copied to clipboard!');
                }}
                className="w-full h-12 rounded-xl bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Survey with Coursemates (+2 Raffle Entries)</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-on-surface-variant/70">
        <p className="flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
          <span>Responses encrypted & stored securely in Firebase Firestore</span>
        </p>
      </footer>
    </div>
  );
}
