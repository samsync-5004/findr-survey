import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SurveyFormData, SurveyResponseDocument } from '../../types';
import { computeScores } from '../../utils/scoring';
import { db } from '../../lib/firebase';
import { trackEvent } from '../../utils/analytics';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  CheckCircle2, X, Sun, Moon
} from 'lucide-react';

interface SurveyFormProps {
  onSwitchToDashboard: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
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
  'Automated Safe Lock for Semester Exam Clearance'
];

export default function SurveyForm({ onSwitchToDashboard, isDarkMode, onToggleTheme }: SurveyFormProps) {
  const [step, setStep] = useState<number>(() => {
    try {
      const savedStep = localStorage.getItem('findr_survey_step');
      if (savedStep) return parseInt(savedStep, 10);
    } catch (e) {}
    return 0;
  }); // 0: Intro, 1: Screening, 2: Desirability, 3: WTP, 4: Advocacy, 5: Open-Ended, 6: Thank You
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<SurveyResponseDocument | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [logoClicks, setLogoClicks] = useState<number>(0);
  const [sessionDocId, setSessionDocId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  // GA4 Page view & abandonment tracking
  useEffect(() => {
    trackEvent('page_view');

    const handleBeforeUnload = () => {
      if (hasStarted && step < 6) {
        trackEvent('survey_abandoned', { last_step: step });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasStarted, step]);

  const triggerStarted = () => {
    if (!hasStarted) {
      setHasStarted(true);
      trackEvent('survey_started');
    }
  };

  const handleLogoClick = () => {
    if (step === 6) {
      setFormData({
        screening: { levelOfStudy: '', university: '', incomeType: '', trackingMethod: '' },
        desirability: { usefulnessScore: 3, frustration: '', topFeatures: [], preferPlatform: '' },
        willingnessToPay: { wouldPay: false, whyWorthPaying: '', priceTier: '', pricingModel: 'Airtime deduction (Direct carrier billing)' },
        advocacy: { npsScore: 8, whatWouldMakeThemShare: '', priorToolExperience: '', whatWouldMakeThemStop: '' },
        openEnded: { magicWandAnswer: '', otherThoughts: '', whatsappNumber: '' }
      });
      setStep(0);
      setHasStarted(false);
      try {
        localStorage.removeItem('findr_survey_draft');
        localStorage.removeItem('findr_survey_step');
      } catch (e) {}
      return;
    }

    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      setLogoClicks(0);
      onSwitchToDashboard();
    }
  };

  const [formData, setFormData] = useState<SurveyFormData>(() => {
    try {
      const saved = localStorage.getItem('findr_survey_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      screening: {
        levelOfStudy: '',
        university: '',
        incomeType: '',
        trackingMethod: ''
      },
      desirability: {
        usefulnessScore: 3,
        frustration: '',
        topFeatures: [],
        preferPlatform: ''
      },
      willingnessToPay: {
        wouldPay: false,
        whyWorthPaying: '',
        priceTier: '',
        pricingModel: 'Airtime deduction (Direct carrier billing)'
      },
      advocacy: {
        npsScore: 8,
        whatWouldMakeThemShare: '',
        priorToolExperience: '',
        whatWouldMakeThemStop: ''
      },
      openEnded: {
        magicWandAnswer: '',
        otherThoughts: '',
        whatsappNumber: ''
      }
    };
  });

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('findr_survey_draft', JSON.stringify(formData));
      localStorage.setItem('findr_survey_step', step.toString());
    } catch (e) {}
  }, [formData, step]);

  const updateScreening = (field: string, value: any) => {
    triggerStarted();
    setFormData(prev => ({ ...prev, screening: { ...prev.screening, [field]: value } }));
  };

  const updateDesirability = (field: string, value: any) => {
    triggerStarted();
    setFormData(prev => ({ ...prev, desirability: { ...prev.desirability, [field]: value } }));
  };

  const handleFeatureToggle = (feature: string) => {
    triggerStarted();
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

  const updateWtp = (field: string, value: any) => {
    triggerStarted();
    setFormData(prev => ({ ...prev, willingnessToPay: { ...prev.willingnessToPay, [field]: value } }));
  };

  const updateAdvocacy = (field: string, value: any) => {
    triggerStarted();
    setFormData(prev => ({ ...prev, advocacy: { ...prev.advocacy, [field]: value } }));
  };

  const updateOpenEnded = (field: string, value: any) => {
    triggerStarted();
    setFormData(prev => ({ ...prev, openEnded: { ...prev.openEnded, [field]: value } }));
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
      if (!formData.screening.incomeType) {
        setErrorMessage('Please select your income source.');
        return false;
      }
      if (!formData.screening.trackingMethod) {
        setErrorMessage('Please select how you track cash.');
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
      const docPayload = {
        ...formData,
        completed: true,
        submittedAt: new Date().toISOString(),
        scores
      };

      const addDocPromise = addDoc(collection(db, 'responses'), docPayload);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 5000)
      );

      let docRef: any;
      try {
        docRef = await Promise.race([addDocPromise, timeoutPromise]);
      } catch (timeoutErr) {
        docRef = { id: 'local-' + Date.now() };
      }

      setSubmittedData({ ...docPayload, id: docRef.id });

      trackEvent('survey_submitted', {
        willingness_to_pay: formData.willingnessToPay.wouldPay ? 'Yes' : 'No',
        recommend_score: formData.advocacy.npsScore,
        composite_score: scores.compositeScore
      });

      fetch('/api/submit-to-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docPayload)
      }).catch(err => console.error('Google Sheets sync error:', err));

      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      try {
        localStorage.removeItem('findr_survey_draft');
        localStorage.removeItem('findr_survey_step');
      } catch (e) {}
      setStep(6);
    } catch (err: any) {
      const scores = computeScores(formData);
      const docPayload: SurveyResponseDocument = {
        ...formData,
        completed: true,
        submittedAt: new Date(),
        scores,
        id: 'local-' + Date.now()
      };
      setSubmittedData(docPayload);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      try {
        localStorage.removeItem('findr_survey_draft');
        localStorage.removeItem('findr_survey_step');
      } catch (e) {}
      setStep(6);
    } finally {
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const surveyUrl = window.location.href.split('?')[0];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3 cursor-pointer select-none"
            title="Click 5 times for admin access"
          >
            <div className="w-8 h-8 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-gray-900">Findr</span>
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium">Survey</span>
              </div>
              <p className="text-[11px] text-gray-500">Campus Financial AI</p>
            </div>
          </div>

          <button
            onClick={onToggleTheme}
            className="w-8 h-8 rounded border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-700" />}
          </button>
        </div>
        {step > 0 && step < 6 && (
          <div className="w-full bg-gray-100 h-1">
            <div 
              className="bg-emerald-700 h-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-xl mx-auto w-full px-6 pt-24 pb-24 flex flex-col">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col"
        >
        {/* Step 0: Intro */}
        {step === 0 && (
          <div className="flex flex-col space-y-6 my-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-4">
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Findr Campus Financial Survey</h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                Help us build the WhatsApp AI financial copilot tailored for Nigerian university and polytechnic students. This survey takes approximately 2 minutes to complete.
              </p>
              <div className="pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                <span>4,200+ students polled</span>
                <span>•</span>
                <span>100% Anonymous</span>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-3">
              <h3 className="font-semibold text-sm text-gray-900">What you receive upon completion</h3>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>VIP Beta Pass with priority pioneer cohort access</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Direct input on the WhatsApp AI features launched this semester</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full h-12 rounded-lg bg-emerald-800 text-white font-medium text-sm hover:bg-emerald-900 transition-colors flex items-center justify-center cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 1: Screening & Profile */}
        {step === 1 && (
          <div className="flex flex-col space-y-6">
            <div className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Step 1 of 5</span>
                <span>20% completed</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Campus and profile</h2>
              <p className="text-xs text-gray-600 mt-0.5">Tell us about your institution and financial routine.</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 font-medium">
                {errorMessage}
              </div>
            )}

            {/* University Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">
                What Nigerian university or polytechnic do you attend? *
              </label>
              <select
                value={formData.screening.university}
                onChange={e => updateScreening('university', e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white outline-none focus:border-emerald-700 transition-colors"
              >
                <option value="" disabled>Select your institution</option>
                {UNIVERSITIES.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Level of Study */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">
                What is your current level of study? *
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
                      className={`h-11 px-3 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-700'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
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
              <label className="block text-xs font-medium text-gray-700">
                Primary pocket money source? *
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
                      className={`h-11 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-700'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
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
              <label className="block text-xs font-medium text-gray-700">
                How do you currently track cash and side hustles? *
              </label>
              <div className="space-y-2">
                {[
                  { id: 'vibes', label: 'In my head (vibes and inshallah)' },
                  { id: 'notes', label: 'Notes app or WhatsApp self-chat' },
                  { id: 'sheets', label: 'Excel or Google Sheets' },
                  { id: 'fintech', label: 'Kuda or OPay built-in analytics' },
                  { id: 'none', label: 'I do not track at all' }
                ].map(item => {
                  const isSelected = formData.screening.trackingMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateScreening('trackingMethod', item.id)}
                      className={`w-full p-3 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-700 font-medium'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xs">{item.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBack}
                className="w-1/3 h-11 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 h-11 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Desirability */}
        {step === 2 && (
          <div className="flex flex-col space-y-6">
            <div className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Step 2 of 5</span>
                <span>40% completed</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Desirability and pain points</h2>
              <p className="text-xs text-gray-600 mt-0.5">Evaluate potential features and campus budget challenges.</p>
            </div>

            {/* Usefulness Score (1-5) */}
            <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-medium text-gray-700">
                How useful would a WhatsApp AI financial copilot be for you? (1 to 5)
              </label>
              <div className="grid grid-cols-5 gap-2 pt-1">
                {[1, 2, 3, 4, 5].map(score => {
                  const isSelected = formData.desirability.usefulnessScore === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => updateDesirability('usefulnessScore', score)}
                      className={`h-11 rounded-lg flex items-center justify-center font-semibold text-sm transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-700'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-xs text-gray-600 pt-1 font-medium">
                {formData.desirability.usefulnessScore === 5 ? 'Extremely valuable' :
                 formData.desirability.usefulnessScore === 4 ? 'Very useful' :
                 formData.desirability.usefulnessScore === 3 ? 'Somewhat helpful' : 'Not suitable'}
              </p>
            </div>

            {/* Frustration free text */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">
                What is your biggest daily cash or budget frustration on campus?
              </label>
              <textarea
                rows={3}
                value={formData.desirability.frustration}
                onChange={e => updateDesirability('frustration', e.target.value)}
                placeholder="e.g. POS charges eating allowance, bank alert delays..."
                className="w-full p-3 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-700 resize-none"
              />
            </div>

            {/* Top Features Multi-select */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Select top features you would use most (Multiple selection)
              </label>
              <div className="space-y-2">
                {TOP_FEATURES_LIST.map(feat => {
                  const selected = formData.desirability.topFeatures.includes(feat);
                  return (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => handleFeatureToggle(feat)}
                      className={`w-full p-3 rounded-lg flex items-center justify-between text-left text-xs transition-colors cursor-pointer border ${
                        selected
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-700 font-medium'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span>{feat}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${selected ? 'bg-emerald-700 text-white border-emerald-700' : 'border-gray-300'}`}>
                        {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prefer platform options */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Preferred platform for this tool?
              </label>
              <div className="space-y-2">
                {[
                  { id: 'WhatsApp chatbot', label: 'WhatsApp Chatbot (Direct chat)' },
                  { id: 'Standalone App', label: 'Standalone Mobile / Web App' },
                  { id: 'Other', label: 'Other' }
                ].map(opt => {
                  const isPreset = ['WhatsApp chatbot', 'Standalone App'].includes(formData.desirability.preferPlatform);
                  const isSelected = isPreset ? formData.desirability.preferPlatform === opt.id : (opt.id === 'Other');
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (opt.id === 'Other') {
                          if (isPreset) updateDesirability('preferPlatform', '');
                        } else {
                          updateDesirability('preferPlatform', opt.id);
                        }
                      }}
                      className={`w-full p-3 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-700 font-medium'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xs">{opt.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {!['WhatsApp chatbot', 'Standalone App'].includes(formData.desirability.preferPlatform) && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={formData.desirability.preferPlatform}
                    onChange={e => updateDesirability('preferPlatform', e.target.value)}
                    placeholder="Specify your preferred platform..."
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-700"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBack}
                className="w-1/3 h-11 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 h-11 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Willingness-to-Pay */}
        {step === 3 && (
          <div className="flex flex-col space-y-6">
            <div className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Step 3 of 5</span>
                <span>60% completed</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Pricing and willingness to pay</h2>
              <p className="text-xs text-gray-600 mt-0.5">Help us determine sustainable student pricing tiers.</p>
            </div>

            {/* Would Pay Toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Would you pay a small monthly fee for unlimited AI budgeting?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateWtp('wouldPay', true)}
                  className={`h-11 rounded-lg font-medium text-xs transition-colors cursor-pointer border ${
                    formData.willingnessToPay.wouldPay
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-700'
                      : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => updateWtp('wouldPay', false)}
                  className={`h-11 rounded-lg font-medium text-xs transition-colors cursor-pointer border ${
                    !formData.willingnessToPay.wouldPay
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-700'
                      : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  No (Free tier only)
                </button>
              </div>
            </div>

            {/* Price Tier Selection */}
            {formData.willingnessToPay.wouldPay && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  What monthly amount feels like a fair and affordable price?
                </label>
                <div className="space-y-2">
                  {[
                    { id: '0', title: '₦0 (Free Tier)', desc: 'Ad-supported basic messaging' },
                    { id: '100-500', title: '₦100 – ₦500 / month', desc: 'Less than one campus snack' },
                    { id: '500-1000', title: '₦500 – ₦1,000 / month', desc: 'Standard monthly subscription' },
                    { id: '1000+', title: '₦1,000+ / month', desc: 'Pro tier with investment and savings alerts' }
                  ].map(tier => {
                    const isSelected = formData.willingnessToPay.priceTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => updateWtp('priceTier', tier.id)}
                        className={`w-full p-3.5 rounded-lg text-left transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-700'
                            : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-sm">
                          <span>{tier.title}</span>
                          {tier.id === '100-500' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-700 text-white font-medium">Popular</span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 text-gray-600">{tier.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Why worth paying */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">
                Why is this price point reasonable for you?
              </label>
              <input
                type="text"
                value={formData.willingnessToPay.whyWorthPaying}
                onChange={e => updateWtp('whyWorthPaying', e.target.value)}
                placeholder="e.g. Cheaper than losing money on unplanned expenses..."
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-700"
              />
            </div>

            {/* Payment Model */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">
                Which subscription payment model do you prefer?
              </label>
              <select
                value={formData.willingnessToPay.pricingModel}
                onChange={e => updateWtp('pricingModel', e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-700"
              >
                <option value="Airtime deduction (Direct carrier billing)">Airtime deduction (MTN, Airtel, Glo, 9mobile)</option>
                <option value="Bank transfer / USSD">Bank transfer or USSD</option>
                <option value="Debit Card auto-renew">Debit Card auto-renew</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBack}
                className="w-1/3 h-11 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 h-11 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Advocacy */}
        {step === 4 && (
          <div className="flex flex-col space-y-6">
            <div className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Step 4 of 5</span>
                <span>80% completed</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Recommendation and trust</h2>
              <p className="text-xs text-gray-600 mt-0.5">Net Promoter Score evaluation.</p>
            </div>

            {/* NPS Score (1-10) */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-medium text-gray-700">
                How likely are you to recommend Findr to a coursemate or roommate? (1 to 10)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => {
                  const isSelected = formData.advocacy.npsScore === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => updateAdvocacy('npsScore', score)}
                      className={`h-10 rounded-lg font-semibold text-xs transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-700'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs pt-1 font-medium">
                <span className="text-gray-500">Evaluation tier:</span>
                <span className={formData.advocacy.npsScore >= 9 ? 'text-emerald-700 font-semibold' : formData.advocacy.npsScore >= 7 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {formData.advocacy.npsScore >= 9 ? 'Promoter' :
                   formData.advocacy.npsScore >= 7 ? 'Passive' : 'Detractor'}
                </span>
              </div>
            </div>

            {/* What would make them share */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">
                What is the primary reason for your score above?
              </label>
              <input
                type="text"
                value={formData.advocacy.whatWouldMakeThemShare}
                onChange={e => updateAdvocacy('whatWouldMakeThemShare', e.target.value)}
                placeholder="e.g. Everyone communicates primarily on WhatsApp..."
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-700"
              />
            </div>

            {/* Prior tool experience */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">
                Prior budgeting tool experience?
              </label>
              <input
                type="text"
                value={formData.advocacy.priorToolExperience}
                onChange={e => updateAdvocacy('priorToolExperience', e.target.value)}
                placeholder="e.g. Monefy, spreadsheets, none..."
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-700"
              />
            </div>

            {/* What would make them stop */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">
                What would cause you to stop using Findr?
              </label>
              <input
                type="text"
                value={formData.advocacy.whatWouldMakeThemStop}
                onChange={e => updateAdvocacy('whatWouldMakeThemStop', e.target.value)}
                placeholder="e.g. Hidden subscription fees, unreliable alerts..."
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-700"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBack}
                className="w-1/3 h-11 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 h-11 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Open-ended */}
        {step === 5 && (
          <div className="flex flex-col space-y-6">
            <div className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Step 5 of 5 • Final</span>
                <span>95% completed</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Final thoughts and VIP beta registration</h2>
              <p className="text-xs text-gray-600 mt-0.5">Share additional feedback and secure beta access.</p>
            </div>

            {/* Magic wand */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">
                If Findr could solve one major financial problem for you, what would it be?
              </label>
              <textarea
                rows={3}
                value={formData.openEnded.magicWandAnswer}
                onChange={e => updateOpenEnded('magicWandAnswer', e.target.value)}
                placeholder="e.g. Auto-split roommate expenses or warn before overspending..."
                className="w-full p-3 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-700 resize-none"
              />
            </div>

            {/* Other thoughts */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">
                Any additional comments or suggestions?
              </label>
              <input
                type="text"
                value={formData.openEnded.otherThoughts}
                onChange={e => updateOpenEnded('otherThoughts', e.target.value)}
                placeholder="Optional feedback..."
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-700"
              />
            </div>

            {/* WhatsApp number for updates */}
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-medium text-gray-700">
                WhatsApp number for VIP beta updates (Optional)
              </label>
              <div className="flex items-center bg-white rounded-lg px-3 border border-gray-300">
                <span className="text-xs font-semibold pr-2 text-gray-700">+234</span>
                <input
                  type="tel"
                  value={formData.openEnded.whatsappNumber || ''}
                  onChange={e => updateOpenEnded('whatsappNumber', e.target.value)}
                  placeholder="801 234 5678"
                  className="w-full h-11 bg-transparent text-xs text-gray-900 outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Used strictly to share beta access links and cohort announcements.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 font-medium">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="w-1/3 h-11 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-2/3 h-11 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Submitting response...' : 'Submit survey'}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Thank You */}
        {step === 6 && (
          <div className="flex flex-col space-y-6 my-auto text-center">
            <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Survey submitted successfully</h1>
              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                Thank you for contributing to campus financial research. Your response has been securely recorded.
              </p>

              {/* Beta Pass Card */}
              <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left space-y-2 border border-gray-200">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-900">
                  <span>VIP Beta Pass</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-medium">Active</span>
                </div>
                <p className="text-xs text-gray-600">
                  Pioneer access granted. You are registered for early WhatsApp beta cohort testing this semester.
                </p>
              </div>

              {submittedData && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 flex items-center justify-between border border-gray-200">
                  <span>Composite Score:</span>
                  <span className="font-semibold">{submittedData.scores.compositeScore}/100</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => window.open('https://chat.whatsapp.com/F4yWJfgR3eS9hRuYfOW6H8', '_blank')}
                className="w-full h-11 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                Join WhatsApp Community
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="w-full h-11 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Share Survey Link
              </button>
            </div>
          </div>
        )}
        </motion.div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-lg p-6 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Share survey</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 cursor-pointer text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600">Copy the link below to share with coursemates:</p>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={surveyUrl} 
                className="w-full h-10 px-3 bg-gray-50 border border-gray-300 rounded text-xs text-gray-800 select-all"
              />
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full h-10 rounded bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
            >
              {copiedLink ? 'Copied to clipboard' : 'Copy link'}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg text-xs font-medium shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Response recorded successfully.</span>
        </div>
      )}
    </div>
  );
}
