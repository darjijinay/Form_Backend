// backend/src/services/googleSheetsSync.service.js
const { google } = require('googleapis');
const GoogleSheetsIntegration = require('../models/GoogleSheetsIntegration');
const Response = require('../models/Response');
const Form = require('../models/Form');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/google-sheets/callback'
);

class GoogleSheetsSyncService {
  /**
   * Get authorization URL for user to authenticate
   */
  getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      throw new Error(`Failed to get tokens: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
      const { token } = await oauth2Client.refreshAccessToken();
      return token;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Create header row in Google Sheet
   */
  async createHeaderRow(integration, formFields) {
    try {
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      // Set credentials
      oauth2Client.setCredentials({
        refresh_token: integration.refreshToken,
        access_token: integration.accessToken,
      });

      const headers = ['Response ID', 'Submitted At', ...formFields.map((f) => f.label)];

      const result = await sheets.spreadsheets.values.update({
        spreadsheetId: integration.spreadsheetId,
        range: `${integration.sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values: [headers],
        },
      });

      await GoogleSheetsIntegration.findByIdAndUpdate(integration._id, {
        headerRowCreated: true,
      });

      return result;
    } catch (error) {
      this.logError(integration._id, `Header row creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync a single response to Google Sheet
   */
  async syncResponseToSheet(integration, response, formFields) {
    try {
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      // Refresh token if expired
      if (new Date() > integration.tokenExpiry) {
        const newToken = await this.refreshAccessToken(integration.refreshToken);
        integration.accessToken = newToken.access_token;
        integration.tokenExpiry = new Date(newToken.expiry_date);
        await integration.save();
      }

      // Set credentials
      oauth2Client.setCredentials({
        refresh_token: integration.refreshToken,
        access_token: integration.accessToken,
      });

      // Create header row if not exists
      if (!integration.headerRowCreated) {
        await this.createHeaderRow(integration, formFields);
      }

      // Prepare row data
      const rowData = [
        response._id.toString(),
        new Date(response.createdAt).toLocaleString(),
        ...formFields.map((field) => {
          const answer = response.answers?.find((a) => a.fieldId.toString() === field._id.toString());
          return answer?.value || '';
        }),
      ];

      // Append row to sheet
      const result = await sheets.spreadsheets.values.append({
        spreadsheetId: integration.spreadsheetId,
        range: `${integration.sheetName}!A:Z`,
        valueInputOption: 'RAW',
        resource: {
          values: [rowData],
        },
      });

      // Update integration stats
      await GoogleSheetsIntegration.findByIdAndUpdate(integration._id, {
        lastSyncedResponseId: response._id,
        lastSyncTime: new Date(),
        $inc: { syncCount: 1 },
      });

      return result;
    } catch (error) {
      this.logError(integration._id, `Sync failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Trigger sync for a form when response is created
   */
  async syncFormResponse(formId, responseId) {
    try {
      const integration = await GoogleSheetsIntegration.findOne({
        form: formId,
        active: true,
      });

      if (!integration) {
        return { success: false, message: 'No active Google Sheets integration' };
      }

      const response = await Response.findById(responseId);
      const form = await Form.findById(formId).select('fields');

      if (!response || !form) {
        throw new Error('Response or form not found');
      }

      await this.syncResponseToSheet(integration, response, form.fields);

      return { success: true, message: 'Response synced to Google Sheets' };
    } catch (error) {
      console.error('Google Sheets sync error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Bulk sync all responses for a form
   */
  async bulkSyncForm(formId) {
    try {
      const integration = await GoogleSheetsIntegration.findOne({
        form: formId,
      });

      if (!integration) {
        throw new Error('No Google Sheets integration found');
      }

      const form = await Form.findById(formId).select('fields');
      const responses = await Response.find({ form: formId }).sort({ createdAt: 1 });

      let syncedCount = 0;
      for (const response of responses) {
        try {
          await this.syncResponseToSheet(integration, response, form.fields);
          syncedCount++;
        } catch (err) {
          console.error(`Failed to sync response ${response._id}:`, err.message);
        }
      }

      return { syncedCount, totalResponses: responses.length };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Log error to integration document
   */
  async logError(integrationId, errorMessage) {
    try {
      await GoogleSheetsIntegration.findByIdAndUpdate(integrationId, {
        $push: {
          errors: {
            timestamp: new Date(),
            message: errorMessage,
          },
        },
        $slice: { errors: -10 }, // Keep only last 10 errors
      });
    } catch (err) {
      console.error('Error logging error:', err);
    }
  }
}

module.exports = new GoogleSheetsSyncService();
