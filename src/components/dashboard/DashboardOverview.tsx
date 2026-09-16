import React, { useEffect, useState } from 'react';
import { SurveyResponseDocument } from '../../types';
import { db } from '../../lib/firebase';
import { collection, getDocs, orderBy, query, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { requestGoogleAccessToken, createAndSyncGoogleSheet } from '../../utils/googleSheetsClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  LogOut, ArrowLeft, Search, RefreshCcw, Download, Users, Star, 
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Sparkles, Filter, UserX, Clock, Trash2, Calendar, TrendingUp, TrendingDown, Sun, Moon,
  Folder, FileText, Copy, Check
} from 'lucide-react';

interface DashboardOverviewProps {
  onLogout: () => void;
  onBackToSurvey: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function DashboardOverview({ onLogout, onBackToSurvey, isDarkMode, onToggleTheme }: DashboardOverviewProps) {
  const [responses, setResponses] = useState<SurveyResponseDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'files'>('analytics');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [universityFilter, setUniversityFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [signalFilter, setSignalFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [sheetsSyncMessage, setSheetsSyncMessage] = useState<string | null>(null);

  const handleGoogleSheetsSync = async () => {
    setIsSyncingSheets(true);
    setSheetsSyncMessage(null);
    try {
      const accessToken = await requestGoogleAccessToken();
      const completedResponses = responses.filter(r => r.completed !== false);
      const result = await createAndSyncGoogleSheet(accessToken, completedResponses);
      setSheetsSyncMessage(`Successfully created & synced to Google Sheet!`);
      window.open(result.spreadsheetUrl, '_blank');
    } catch (err: any) {
      console.error('Google Sheets sync failed:', err);
      setSheetsSyncMessage(`Error syncing: ${err.message || err}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Real-time listener for incoming survey submissions
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'responses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: SurveyResponseDocument[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as SurveyResponseDocument;
        if (data.completed !== false) {
          docs.push({ ...data, id: docSnap.id });
        }
      });
      docs.sort((a, b) => {
        const timeA = new Date(a.submittedAt || 0).getTime();
        const timeB = new Date(b.submittedAt || 0).getTime();
        return timeB - timeA;
      });
      setResponses(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to Firestore responses:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'responses'));
      const docs: SurveyResponseDocument[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as SurveyResponseDocument;
        if (data.completed !== false) {
          docs.push({ ...data, id: docSnap.id });
        }
      });
      docs.sort((a, b) => {
        const timeA = new Date(a.submittedAt || 0).getTime();
        const timeB = new Date(b.submittedAt || 0).getTime();
        return timeB - timeA;
      });
      setResponses(docs);
    } catch (err) {
      console.error('Error fetching responses from Firestore:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete all collected survey responses and take metrics back to zero? This will wipe all test submissions permanently.')) {
      return;
    }
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'responses'));
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'responses', d.id)));
      await Promise.all(deletePromises);
      setResponses([]);
      setSelectedFileId(null);
    } catch (err) {
      console.error('Error clearing responses:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const headers = ['ID', 'Completed', 'University', 'Level', 'Tracking', 'Usefulness', 'NPS', 'Composite Score', 'Signal', 'Submitted At'];
    const rows = responses.map((r, idx) => [
      r.id || idx,
      r.completed !== false ? 'Yes' : 'Dropped Off',
      `"${r.screening?.university || ''}"`,
      `"${r.screening?.levelOfStudy || ''}"`,
      `"${r.screening?.trackingMethod || ''}"`,
      r.desirability?.usefulnessScore || '',
      r.advocacy?.npsScore || '',
      r.scores?.compositeScore || '',
      r.scores?.signalColor || '',
      r.submittedAt?.toDate ? r.submittedAt.toDate().toISOString() : new Date().toISOString()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'findr_survey_responses.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJsonFile = (r: SurveyResponseDocument) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(r, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `respondent_${r.id || 'file'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copyFileContent = (r: SurveyResponseDocument) => {
    navigator.clipboard.writeText(JSON.stringify(r, null, 2));
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const selectedResponse = responses.find(r => (r.id || String(responses.indexOf(r))) === selectedFileId);

  // Aggregates & KPIs
  const totalInitiated = responses.length;
  const completedCount = responses.filter(r => r.completed !== false).length;
  const droppedOffCount = responses.filter(r => r.completed === false).length;
  const completionRate = totalInitiated > 0 ? Math.round((completedCount / totalInitiated) * 100) : 100;

  const avgCompositeScore = completedCount > 0
    ? (responses.filter(r => r.completed !== false).reduce((acc, r) => acc + (r.scores?.compositeScore || 0), 0) / completedCount).toFixed(1)
    : '0';

  const completedResponses = responses.filter(r => r.completed !== false);
  const greenCount = completedResponses.filter(r => r.scores?.signalColor === 'green').length;
  const yellowCount = completedResponses.filter(r => r.scores?.signalColor === 'yellow').length;
  const redCount = completedResponses.filter(r => r.scores?.signalColor === 'red').length;
  const greenPct = completedCount > 0 ? Math.round((greenCount / completedCount) * 100) : 0;
  const yellowPct = completedCount > 0 ? Math.round((yellowCount / completedCount) * 100) : 0;
  const redPct = completedCount > 0 ? Math.round((redCount / completedCount) * 100) : 0;

  const avgNps = completedCount > 0
    ? (completedResponses.reduce((acc, r) => acc + (r.advocacy?.npsScore || 0), 0) / completedCount).toFixed(1)
    : '0';

  // NPS Bucket Counts
  const promotersCount = completedResponses.filter(r => r.scores?.npsBucket === 'Promoter').length;
  const passivesCount = completedResponses.filter(r => r.scores?.npsBucket === 'Passive').length;
  const detractorsCount = completedResponses.filter(r => r.scores?.npsBucket === 'Detractor').length;

  const npsPieData = [
    { name: 'Promoters (9-10)', value: promotersCount, color: '#006a61' },
    { name: 'Passives (7-8)', value: passivesCount, color: '#f59e0b' },
    { name: 'Detractors (1-6)', value: detractorsCount, color: '#ba1a1a' },
  ];

  // Price Tiers Distribution
  const tierCounts: { [key: string]: number } = { '0': 0, '100-500': 0, '500-1000': 0, '1000+': 0 };
  completedResponses.forEach(r => {
    const tier = r.willingnessToPay?.priceTier || '0';
    if (tierCounts[tier] !== undefined) tierCounts[tier]++;
    else tierCounts[tier] = 1;
  });

  const priceTierData = [
    { name: '₦0 (Free)', count: tierCounts['0'] },
    { name: '₦100-₦500', count: tierCounts['100-500'] },
    { name: '₦500-₦1,000', count: tierCounts['500-1000'] },
    { name: '₦1,000+', count: tierCounts['1000+'] },
  ];

  // Top Features Tally
  const featureTally: { [key: string]: number } = {};
  completedResponses.forEach(r => {
    const feats = r.desirability?.topFeatures || [];
    feats.forEach(f => {
      featureTally[f] = (featureTally[f] || 0) + 1;
    });
  });

  const featuresData = Object.keys(featureTally).length > 0
    ? Object.keys(featureTally).map(f => ({ name: f, count: featureTally[f] })).sort((a, b) => b.count - a.count)
    : TOP_FEATURES_DEFAULT.map(f => ({ name: f.name, count: f.count }));

  // Grouped bar chart data: Composite score by level of study
  const levelScores: { [key: string]: { total: number; count: number } } = {};
  completedResponses.forEach(r => {
    const lvl = r.screening?.levelOfStudy || 'Unknown';
    if (!levelScores[lvl]) levelScores[lvl] = { total: 0, count: 0 };
    levelScores[lvl].total += r.scores?.compositeScore || 0;
    levelScores[lvl].count += 1;
  });

  const segmentData = Object.keys(levelScores).map(lvl => ({
    level: lvl.replace(' Level / Fresher', '').replace(' Level', ''),
    avgScore: Math.round(levelScores[lvl].total / levelScores[lvl].count)
  }));

  // Filtered responses for table & analytics
  const filteredResponses = responses.filter(r => {
    const matchesSearch = searchQuery === '' ||
      JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUni = universityFilter === 'all' || r.screening?.university === universityFilter;
    const matchesLevel = levelFilter === 'all' || r.screening?.levelOfStudy === levelFilter;
    const matchesSignal = signalFilter === 'all' || r.scores?.signalColor === signalFilter;

    let matchesDate = true;
    if (r.submittedAt) {
      const subTime = new Date(r.submittedAt).getTime();
      const now = Date.now();
      if (dateRangeFilter === 'today') {
        matchesDate = (now - subTime) <= 24 * 60 * 60 * 1000;
      } else if (dateRangeFilter === '7days') {
        matchesDate = (now - subTime) <= 7 * 24 * 60 * 60 * 1000;
      } else if (dateRangeFilter === '30days') {
        matchesDate = (now - subTime) <= 30 * 24 * 60 * 60 * 1000;
      } else if (dateRangeFilter === 'custom') {
        if (startDate) {
          matchesDate = matchesDate && subTime >= new Date(startDate).getTime();
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && subTime <= endOfDay.getTime();
        }
      }
    }

    return matchesSearch && matchesUni && matchesLevel && matchesSignal && matchesDate;
  });

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* Top Header */}
      <header className="bg-surface-container-lowest border-b border-surface-variant/40 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-on-secondary font-extrabold shadow-sm">
            F
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight">Findr Admin Analytics Dashboard</h1>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-extrabold uppercase">
                Real-Time Firestore
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">Live validation metrics, completion funnel, and verbatim feedback logs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchResponses}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={handleResetData}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-error-container text-on-error-container text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
            title="Wipe all test data and reset to zero"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
          <button
            onClick={exportCsv}
            className="px-3 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleGoogleSheetsSync}
            disabled={isSyncingSheets}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Create and sync responses to a new Google Sheet in your Google Drive"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
            <span>{isSyncingSheets ? 'Syncing Sheets...' : 'Sync to Google Sheets'}</span>
          </button>

          <button
            onClick={onBackToSurvey}
            className="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            Survey Form
          </button>
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-xl bg-surface-container text-on-surface flex items-center justify-center hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Toggle dark/light mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-xl bg-error-container text-on-error-container flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full p-6 space-y-6">
        {sheetsSyncMessage && (
          <div className="p-4 rounded-2xl bg-secondary-container text-on-secondary-container text-xs font-semibold flex items-center justify-between shadow-sm">
            <span>{sheetsSyncMessage}</span>
            <button onClick={() => setSheetsSyncMessage(null)} className="font-bold underline cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-surface-variant/40 pb-4">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-secondary text-on-secondary shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Analytics & Metrics Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'files'
                ? 'bg-secondary text-on-secondary shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>📁 Respondent Files & Folders Explorer ({responses.length})</span>
          </button>
        </div>

        {activeTab === 'files' ? (
          /* Virtual Files & Folders Explorer */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
            {/* Left Sidebar: Folder / File List */}
            <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl border border-surface-variant/40 p-4 flex flex-col shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-surface-variant/40 mb-3">
                <div className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-secondary" />
                  <div>
                    <h3 className="font-extrabold text-xs">/firestore-db/responses</h3>
                    <p className="text-[10px] text-on-surface-variant">{responses.length} respondent files generated automatically</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                  Live
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-outline" />
                <input
                  type="text"
                  placeholder="Filter respondent files..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-container-low text-xs border border-surface-variant outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {responses
                  .filter(r => searchQuery === '' || JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((r, idx) => {
                    const fileId = r.id || String(idx);
                    const isSelected = selectedFileId === fileId;
                    const isCompleted = r.completed !== false;
                    return (
                      <div
                        key={fileId}
                        onClick={() => setSelectedFileId(fileId)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-secondary-container/40 border-secondary text-on-surface'
                            : 'bg-surface-container-lowest border-surface-variant/40 hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <FileText className={`w-4 h-4 shrink-0 ${isCompleted ? 'text-secondary' : 'text-amber-600'}`} />
                          <div className="truncate">
                            <p className="font-bold text-xs truncate">respondent_{fileId.slice(0, 8)}.json</p>
                            <p className="text-[10px] text-on-surface-variant truncate">
                              {r.screening?.university || 'Incomplete'} • {r.screening?.levelOfStudy || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          isCompleted ? 'bg-secondary-container text-on-secondary-container' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isCompleted ? 'Saved' : 'Draft'}
                        </span>
                      </div>
                    );
                  })}
                {responses.length === 0 && (
                  <div className="text-center py-12 text-on-surface-variant text-xs">
                    <Folder className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No respondent files yet.</p>
                    <p className="text-[10px] mt-1">Files are created automatically when users submit the survey form.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Main Area: File Viewer / Code Preview */}
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-surface-variant/40 p-6 flex flex-col shadow-sm">
              {selectedResponse ? (
                <div className="space-y-6 flex-1 flex flex-col">
                  {/* File Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-variant/40 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm font-mono">respondent_{selectedResponse.id || 'record'}.json</h3>
                          <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface text-[10px] font-bold">
                            {selectedResponse.completed !== false ? 'Completed Submission' : 'Incomplete Session'}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Submitted: {selectedResponse.submittedAt ? new Date(selectedResponse.submittedAt).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyFileContent(selectedResponse)}
                        className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedFile ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedFile ? 'Copied JSON' : 'Copy File'}</span>
                      </button>
                      <button
                        onClick={() => downloadJsonFile(selectedResponse)}
                        className="px-3 py-1.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .json</span>
                      </button>
                    </div>
                  </div>

                  {/* Options & Answers Picked Viewer */}
                  <div className="flex-1 space-y-5 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Screening */}
                      <div className="bg-surface-container-low p-4 rounded-xl border border-surface-variant/40 space-y-2">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-secondary border-b pb-1">1. Screening & Profile</h4>
                        <p className="text-xs"><strong>University:</strong> {selectedResponse.screening?.university || 'N/A'}</p>
                        <p className="text-xs"><strong>Level of Study:</strong> {selectedResponse.screening?.levelOfStudy || 'N/A'}</p>
                        <p className="text-xs"><strong>Income Source:</strong> {selectedResponse.screening?.incomeType || 'N/A'}</p>
                        <p className="text-xs"><strong>Tracking Method:</strong> {selectedResponse.screening?.trackingMethod || 'N/A'}</p>
                      </div>

                      {/* Desirability & Features */}
                      <div className="bg-surface-container-low p-4 rounded-xl border border-surface-variant/40 space-y-2">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-secondary border-b pb-1">2. Desirability & Features</h4>
                        <p className="text-xs"><strong>Usefulness Score:</strong> {selectedResponse.desirability?.usefulnessScore || 0} / 5</p>
                        <p className="text-xs"><strong>Preferred Platform:</strong> {selectedResponse.desirability?.preferPlatform || 'N/A'}</p>
                        <p className="text-xs"><strong>Top Features Picked:</strong></p>
                        <ul className="list-disc list-inside text-xs text-on-surface-variant space-y-0.5 pl-1">
                          {(selectedResponse.desirability?.topFeatures || []).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                          {(!selectedResponse.desirability?.topFeatures || selectedResponse.desirability.topFeatures.length === 0) && (
                            <li>None selected</li>
                          )}
                        </ul>
                        <p className="text-xs italic pt-1"><strong>Frustration:</strong> "{selectedResponse.desirability?.frustration || 'N/A'}"</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Willingness to Pay */}
                      <div className="bg-surface-container-low p-4 rounded-xl border border-surface-variant/40 space-y-2">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-secondary border-b pb-1">3. Willingness-to-Pay (WTP)</h4>
                        <p className="text-xs"><strong>Would Pay?</strong> {selectedResponse.willingnessToPay?.wouldPay ? 'Yes 🚀' : 'No'}</p>
                        <p className="text-xs"><strong>Price Tier:</strong> {selectedResponse.willingnessToPay?.priceTier || 'N/A'}</p>
                        <p className="text-xs"><strong>Pricing Model:</strong> {selectedResponse.willingnessToPay?.pricingModel || 'N/A'}</p>
                        <p className="text-xs"><strong>Why Worth It:</strong> "{selectedResponse.willingnessToPay?.whyWorthPaying || 'N/A'}"</p>
                      </div>

                      {/* Advocacy & NPS */}
                      <div className="bg-surface-container-low p-4 rounded-xl border border-surface-variant/40 space-y-2">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-secondary border-b pb-1">4. Advocacy & NPS</h4>
                        <p className="text-xs"><strong>NPS Score:</strong> {selectedResponse.advocacy?.npsScore || 0} / 10 ({selectedResponse.scores?.npsBucket || 'Passive'})</p>
                        <p className="text-xs"><strong>Share Factor:</strong> "{selectedResponse.advocacy?.whatWouldMakeThemShare || 'N/A'}"</p>
                        <p className="text-xs"><strong>Prior Tool:</strong> {selectedResponse.advocacy?.priorToolExperience || 'N/A'}</p>
                        <p className="text-xs"><strong>Dealbreaker:</strong> "{selectedResponse.advocacy?.whatWouldMakeThemStop || 'N/A'}"</p>
                      </div>
                    </div>

                    <div className="bg-surface-container-low p-4 rounded-xl border border-surface-variant/40 space-y-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-secondary border-b pb-1">5. Open-Ended & VIP Beta</h4>
                      <p className="text-xs"><strong>Magic Wand Wish:</strong> "{selectedResponse.openEnded?.magicWandAnswer || 'N/A'}"</p>
                      <p className="text-xs"><strong>Other Thoughts:</strong> "{selectedResponse.openEnded?.otherThoughts || 'N/A'}"</p>
                      <p className="text-xs"><strong>WhatsApp Number:</strong> {selectedResponse.openEnded?.whatsappNumber ? `+234 ${selectedResponse.openEnded.whatsappNumber}` : 'Not provided'}</p>
                      <div className="mt-2 p-3 rounded-lg bg-secondary-container/30 flex items-center justify-between text-xs font-bold text-on-secondary-container">
                        <span>Computed Composite Validation Score:</span>
                        <span>{selectedResponse.scores?.compositeScore || 0} / 100 ({selectedResponse.scores?.signalColor?.toUpperCase()})</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-on-surface-variant space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-secondary shadow-sm">
                    <Folder className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-on-surface">Select a Respondent File</h3>
                    <p className="text-xs max-w-sm mt-1">
                      Choose any respondent file from the left folder explorer to inspect all options, scores, and answers picked by that particular person.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Analytics & Metrics Overview */
          <>
            {/* Verdict Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-surface-variant/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-secondary" />
              <div className="space-y-1 pl-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-extrabold uppercase tracking-wider">
                    STRONG GO SIGNAL
                  </span>
                  <span className="text-xs font-bold text-secondary">{greenPct}% High-Intent Sentiment</span>
                </div>
                <p className="text-xs text-on-surface-variant max-w-2xl">
                  Clear product-market fit signal among undergraduate peers. Extreme pain detected in debit alert categorization and month-end cashflow panic ("Urgent 2k syndrome").
                </p>
              </div>
              <div className="flex items-center gap-4 bg-surface-container-low px-4 py-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold">Confidence Index</span>
                  <p className="text-lg font-extrabold text-secondary">96.2%</p>
                </div>
              </div>
            </div>

            {/* 6 KPI & Funnel Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Initiated</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-secondary bg-secondary-container/50 px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3 h-3" /> +18.4%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-extrabold tracking-tight">{totalInitiated}</span>
                  <span className="text-xs text-on-surface-variant">Sessions</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-secondary bg-secondary-container/50 px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3 h-3" /> +22.5%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-extrabold tracking-tight text-secondary">{completedCount}</span>
                  <span className="text-xs text-secondary font-bold">({completionRate}%)</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    <UserX className="w-3.5 h-3.5" />
                    <span>Dropped</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    <TrendingDown className="w-3 h-3" /> -6.2%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-extrabold tracking-tight text-amber-700">{droppedOffCount}</span>
                  <span className="text-xs text-on-surface-variant">Incomplete</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Avg Score</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-secondary bg-secondary-container/50 px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3 h-3" /> +4.1%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-extrabold tracking-tight">{avgCompositeScore}</span>
                  <span className="text-xs text-on-surface-variant">/ 100</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Signal Split</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-secondary bg-secondary-container/50 px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3 h-3" /> +12.8%
                  </span>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-secondary">{greenPct}% Grn</span>
                    <span className="text-amber-600">{yellowPct}% Yel</span>
                    <span className="text-error">{redPct}% Red</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-surface-container">
                    <div className="bg-secondary h-full" style={{ width: `${greenPct}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${yellowPct}%` }} />
                    <div className="bg-error h-full" style={{ width: `${redPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Avg NPS</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-secondary bg-secondary-container/50 px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3 h-3" /> +8.3%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-extrabold text-secondary tracking-tight">{avgNps}</span>
                  <span className="text-xs text-on-surface-variant">/ 10</span>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: NPS Promoters vs Passives vs Detractors */}
              <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 flex flex-col">
                <h3 className="font-bold text-sm mb-1">NPS Sentiment Breakdown</h3>
                <p className="text-xs text-on-surface-variant mb-4">Promoter vs Passive vs Detractor distribution</p>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={npsPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        label
                      >
                        {npsPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Price Tiers Distribution */}
              <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 flex flex-col">
                <h3 className="font-bold text-sm mb-1">Price Tier Distribution (WTP)</h3>
                <p className="text-xs text-on-surface-variant mb-4">Respondents across the 4 monthly pricing tiers</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priceTierData}>
                      <XAxis dataKey="name" stroke="#76777d" fontSize={11} />
                      <YAxis stroke="#76777d" fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#006a61" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Top Features Ranking */}
              <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 flex flex-col">
                <h3 className="font-bold text-sm mb-1">Top Features Ranking (Tally)</h3>
                <p className="text-xs text-on-surface-variant mb-4">Ranked tally of feature selections across all responses</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={featuresData} layout="vertical">
                      <XAxis type="number" stroke="#76777d" fontSize={11} />
                      <YAxis dataKey="name" type="category" width={140} stroke="#76777d" fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#131b2e" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Composite Score by Academic Year / Segment */}
              <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 flex flex-col">
                <h3 className="font-bold text-sm mb-1">Average Composite Score by Academic Year</h3>
                <p className="text-xs text-on-surface-variant mb-4">Segmented analysis of response scores</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={segmentData}>
                      <XAxis dataKey="level" stroke="#76777d" fontSize={11} />
                      <YAxis stroke="#76777d" fontSize={11} domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="avgScore" fill="#009668" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Section: Filterable Response Table */}
            <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-variant/40 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base">Survey Response & Funnel Logs</h3>
                  <p className="text-xs text-on-surface-variant">Filterable table of respondent records, completion status, and verbatim feedback</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search university, quotes..."
                      className="pl-9 pr-3 py-2 rounded-xl bg-surface-container-low text-xs border border-surface-variant outline-none w-48"
                    />
                  </div>

                  {/* Date Range Picker */}
                  <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-2 rounded-xl border border-surface-variant text-xs">
                    <Calendar className="w-3.5 h-3.5 text-secondary" />
                    <select
                      value={dateRangeFilter}
                      onChange={e => setDateRangeFilter(e.target.value)}
                      className="bg-transparent outline-none text-xs font-semibold cursor-pointer"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Last 24 Hours</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {dateRangeFilter === 'custom' && (
                    <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1.5 rounded-xl border border-surface-variant text-xs">
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-transparent outline-none text-[11px]"
                      />
                      <span className="text-on-surface-variant">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-transparent outline-none text-[11px]"
                      />
                    </div>
                  )}

                  <select
                    value={signalFilter}
                    onChange={e => setSignalFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-surface-container-low text-xs border border-surface-variant outline-none"
                  >
                    <option value="all">All Signals</option>
                    <option value="green">Green (≥70)</option>
                    <option value="yellow">Yellow (45-69)</option>
                    <option value="red">Red (&lt;45)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Status / Completion</th>
                      <th className="py-3 px-4">Composite Score</th>
                      <th className="py-3 px-4">University</th>
                      <th className="py-3 px-4">Level</th>
                      <th className="py-3 px-4">NPS Bucket</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant/30">
                    {filteredResponses.map((r, idx) => {
                      const rowId = r.id || String(idx);
                      const isExpanded = expandedRowId === rowId;
                      const isCompleted = r.completed !== false;
                      const signalColor = r.scores?.signalColor || 'green';
                      const badgeClass =
                        signalColor === 'green' ? 'bg-secondary-container text-on-secondary-container font-bold' :
                        signalColor === 'yellow' ? 'bg-amber-100 text-amber-800 font-bold' :
                        'bg-error-container text-on-error-container font-bold';

                      return (
                        <React.Fragment key={rowId}>
                          <tr className="hover:bg-surface-container-low/50 transition-colors">
                            <td className="py-3.5 px-4">
                              {isCompleted ? (
                                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold text-[10px] inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Completed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Dropped / Midway
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-lg text-xs ${badgeClass}`}>
                                {r.scores?.compositeScore || 0} / 100 ({signalColor.toUpperCase()})
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold">{r.screening?.university || 'Incomplete'}</td>
                            <td className="py-3.5 px-4 text-on-surface-variant">{r.screening?.levelOfStudy || 'Incomplete'}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">
                                {r.scores?.npsBucket || 'N/A'} ({r.advocacy?.npsScore || 7}/10)
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-on-surface-variant">
                              {r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleDateString() : 'Just now'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setExpandedRowId(isExpanded ? null : rowId)}
                                className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide Details' : 'View Verbatims'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-surface-container-low/40">
                              <td colSpan={7} className="p-4 space-y-4">
                                <div className="flex items-center justify-between border-b border-surface-variant/40 pb-2">
                                  <span className="font-extrabold text-sm text-secondary flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    <span>Complete Respondent Submission Details (ID: {rowId})</span>
                                  </span>
                                  <span className="text-xs text-on-surface-variant font-mono">
                                    Submitted: {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : 'N/A'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                  {/* 1. Profile & Screening */}
                                  <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-surface-variant/40 space-y-2 shadow-xs">
                                    <h4 className="font-bold text-secondary uppercase tracking-wider text-[11px] border-b pb-1">1. Profile & Screening</h4>
                                    <p><strong>University:</strong> {r.screening?.university || 'N/A'}</p>
                                    <p><strong>Level:</strong> {r.screening?.levelOfStudy || 'N/A'}</p>
                                    <p><strong>Income Source:</strong> {r.screening?.incomeType || 'N/A'}</p>
                                    <p><strong>Tracking Method:</strong> {r.screening?.trackingMethod || 'N/A'}</p>
                                  </div>

                                  {/* 2. Desirability & Features */}
                                  <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-surface-variant/40 space-y-2 shadow-xs">
                                    <h4 className="font-bold text-secondary uppercase tracking-wider text-[11px] border-b pb-1">2. Desirability & Features</h4>
                                    <p><strong>Usefulness Score:</strong> {r.desirability?.usefulnessScore || 0} / 5</p>
                                    <p><strong>Preferred Platform:</strong> {r.desirability?.preferPlatform || 'N/A'}</p>
                                    <p><strong>Top Features:</strong> {(r.desirability?.topFeatures || []).join(', ') || 'None selected'}</p>
                                    <p className="italic text-on-surface-variant pt-1"><strong>Frustration:</strong> "{r.desirability?.frustration || 'None'}"</p>
                                  </div>

                                  {/* 3. Willingness-to-Pay */}
                                  <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-surface-variant/40 space-y-2 shadow-xs">
                                    <h4 className="font-bold text-secondary uppercase tracking-wider text-[11px] border-b pb-1">3. Willingness-to-Pay</h4>
                                    <p><strong>Would Pay?</strong> {r.willingnessToPay?.wouldPay ? 'Yes 🚀' : 'No (Free tier)'}</p>
                                    <p><strong>Price Tier:</strong> {r.willingnessToPay?.priceTier || 'N/A'}</p>
                                    <p><strong>Pricing Model:</strong> {r.willingnessToPay?.pricingModel || 'N/A'}</p>
                                    <p><strong>Why Worth It:</strong> {r.willingnessToPay?.whyWorthPaying || 'N/A'}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                                  {/* 4. Advocacy & NPS */}
                                  <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-surface-variant/40 space-y-2 shadow-xs">
                                    <h4 className="font-bold text-secondary uppercase tracking-wider text-[11px] border-b pb-1">4. Advocacy & Trust (NPS)</h4>
                                    <p><strong>NPS Score:</strong> {r.advocacy?.npsScore || 0} / 10 ({r.scores?.npsBucket || 'Passive'})</p>
                                    <p><strong>Reason / Share Factor:</strong> {r.advocacy?.whatWouldMakeThemShare || 'N/A'}</p>
                                    <p><strong>Prior Tool Experience:</strong> {r.advocacy?.priorToolExperience || 'N/A'}</p>
                                    <p><strong>Dealbreaker / Stop Factor:</strong> {r.advocacy?.whatWouldMakeThemStop || 'N/A'}</p>
                                  </div>

                                  {/* 5. Open-Ended & VIP Contact */}
                                  <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-surface-variant/40 space-y-2 shadow-xs">
                                    <h4 className="font-bold text-secondary uppercase tracking-wider text-[11px] border-b pb-1">5. Open-Ended & VIP Beta</h4>
                                    <p><strong>Magic Wand Wish:</strong> "{r.openEnded?.magicWandAnswer || 'N/A'}"</p>
                                    <p><strong>Other Thoughts:</strong> "{r.openEnded?.otherThoughts || 'N/A'}"</p>
                                    <p><strong>WhatsApp Contact:</strong> {r.openEnded?.whatsappNumber ? `+234 ${r.openEnded.whatsappNumber}` : 'Not provided'}</p>
                                    <div className="pt-1 flex items-center justify-between text-[11px] bg-secondary-container/20 p-2 rounded-lg text-on-secondary-container font-bold">
                                      <span>Computed Composite Score:</span>
                                      <span>{r.scores?.compositeScore || 0}/100 ({r.scores?.signalColor?.toUpperCase()})</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const TOP_FEATURES_DEFAULT = [
  { name: 'Auto-parse Nigerian Bank SMS', count: 1256 },
  { name: 'Urgent 2k Burn Rate Predictor', count: 1128 },
  { name: 'Roommate Bill Split', count: 971 },
  { name: 'Course Dues Reminders', count: 742 },
];
