import express from "express";
import path from "path";
import { google } from "googleapis";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Google Sheets submission & Drive backup
  app.post("/api/submit-to-sheets", async (req, res) => {
    try {
      const formData = req.body;
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const accessToken = req.headers.authorization?.replace('Bearer ', '');

      let auth: any;
      if (clientEmail && privateKey) {
        auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.file"
          ],
        });
      } else if (accessToken) {
        auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
      } else {
        console.warn("Google credentials not configured. Skipping server-side sync.");
        return res.json({ success: false, message: "Google credentials not configured on server." });
      }

      const results = { sheetSynced: false, driveSynced: false };

      // 1. Append to Google Sheets
      if (spreadsheetId) {
        try {
          const sheets = google.sheets({ version: "v4", auth });
          const timestamp = formData.submittedAt || new Date().toISOString();
          const rowValues = [
            formData.id || '',
            timestamp,
            formData.screening?.university || '',
            formData.screening?.levelOfStudy || '',
            formData.screening?.incomeType || '',
            formData.screening?.trackingMethod || '',
            formData.desirability?.usefulnessScore || '',
            formData.desirability?.preferPlatform || '',
            (formData.desirability?.topFeatures || []).join(', '),
            formData.desirability?.frustration || '',
            formData.willingnessToPay?.wouldPay ? 'Yes' : 'No',
            formData.willingnessToPay?.priceTier || '',
            formData.willingnessToPay?.pricingModel || '',
            formData.willingnessToPay?.whyWorthPaying || '',
            formData.advocacy?.npsScore || '',
            formData.advocacy?.whatWouldMakeThemShare || '',
            formData.advocacy?.priorToolExperience || '',
            formData.advocacy?.whatWouldMakeThemStop || '',
            formData.openEnded?.magicWandAnswer || '',
            formData.openEnded?.otherThoughts || '',
            formData.openEnded?.whatsappNumber || '',
            formData.scores?.compositeScore || '',
            formData.scores?.signalColor || ''
          ];

          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "Responses!A:W",
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [rowValues],
            },
          });
          results.sheetSynced = true;
        } catch (sheetErr: any) {
          console.error("Error appending to Google Sheet:", sheetErr);
        }
      }

      // 2. Save JSON backup to Google Drive
      try {
        const drive = google.drive({ version: "v3", auth });
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const fileMetadata: any = {
          name: `Findr_Survey_${formData.id || Date.now()}.json`,
          mimeType: 'application/json',
        };
        if (folderId) {
          fileMetadata.parents = [folderId];
        }

        const media = {
          mimeType: 'application/json',
          body: JSON.stringify(formData, null, 2),
        };

        await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id',
        });
        results.driveSynced = true;
      } catch (driveErr: any) {
        console.error("Error saving backup to Google Drive:", driveErr);
      }

      res.json({ success: true, results });
    } catch (err: any) {
      console.error("Error in submit-to-sheets API:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
