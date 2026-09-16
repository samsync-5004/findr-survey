import { SurveyResponseDocument } from '../types';

export async function requestGoogleAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes('dummy') || clientId === '') {
      return reject(new Error('Google OAuth Client ID (VITE_GOOGLE_CLIENT_ID) is not configured. Please create an OAuth 2.0 Web Application client ID in Google Cloud Console, add your deployment URL (https://ais-dev-ypugqypaisqxs2uetllcjl-33854494597.europe-west1.run.app) as an authorized JavaScript origin and redirect URI, and set VITE_GOOGLE_CLIENT_ID in your environment secrets.'));
    }

    const client = (window as any).google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      callback: (response: any) => {
        if (response.access_token) {
          resolve(response.access_token);
        } else {
          reject(new Error(response.error || 'Failed to obtain Google access token'));
        }
      },
    });

    if (!client) {
      // Load script if not present
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        try {
          const loadedClient = (window as any).google?.accounts?.oauth2?.initTokenClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
            callback: (response: any) => {
              if (response.access_token) {
                resolve(response.access_token);
              } else {
                reject(new Error(response.error || 'Failed to obtain Google access token'));
              }
            },
          });
          loadedClient.requestAccessToken();
        } catch (err) {
          reject(err);
        }
      };
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.head.appendChild(script);
    } else {
      client.requestAccessToken();
    }
  });
}

export async function createAndSyncGoogleSheet(accessToken: string, responses: SurveyResponseDocument[]): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `Findr Survey Responses - ${new Date().toISOString().split('T')[0]}`,
      },
      sheets: [
        {
          properties: {
            title: 'Responses',
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Sheet');
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare headers and rows
  const headers = [
    'ID', 'Timestamp', 'University', 'Level', 'Income Type', 'Tracking Method', 
    'Usefulness', 'Preferred Platform', 'Top Features', 'Key Frustration', 
    'Would Pay', 'Price Tier', 'Pricing Model', 'Why Worth Paying', 
    'NPS Score', 'What Makes Share', 'Prior Tool Experience', 'What Makes Stop', 
    'Magic Wand Answer', 'Other Thoughts', 'WhatsApp', 'Composite Score', 'Signal Color'
  ];

  const rows = responses.map((r, idx) => [
    r.id || idx,
    r.submittedAt?.toDate ? r.submittedAt.toDate().toISOString() : (r.submittedAt || new Date().toISOString()),
    r.screening?.university || '',
    r.screening?.levelOfStudy || '',
    r.screening?.incomeType || '',
    r.screening?.trackingMethod || '',
    r.desirability?.usefulnessScore || '',
    r.desirability?.preferPlatform || '',
    (r.desirability?.topFeatures || []).join(', '),
    r.desirability?.frustration || '',
    r.willingnessToPay?.wouldPay ? 'Yes' : 'No',
    r.willingnessToPay?.priceTier || '',
    r.willingnessToPay?.pricingModel || '',
    r.willingnessToPay?.whyWorthPaying || '',
    r.advocacy?.npsScore || '',
    r.advocacy?.whatWouldMakeThemShare || '',
    r.advocacy?.priorToolExperience || '',
    r.advocacy?.whatWouldMakeThemStop || '',
    r.openEnded?.magicWandAnswer || '',
    r.openEnded?.otherThoughts || '',
    r.openEnded?.whatsappNumber || '',
    r.scores?.compositeScore || '',
    r.scores?.signalColor || ''
  ]);

  // 3. Write values
  const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Responses!A1:W1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [headers, ...rows],
    }),
  });

  if (!writeRes.ok) {
    const err = await writeRes.json();
    throw new Error(err.error?.message || 'Failed to write data to Google Sheet');
  }

  return { spreadsheetId, spreadsheetUrl };
}
