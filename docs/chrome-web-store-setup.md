# Chrome Web Store Publishing Setup

This document explains how to set up automatic publishing to the Chrome Web Store using GitHub Actions.

## Prerequisites

1. A Chrome Web Store developer account
2. An existing extension published on the Chrome Web Store
3. Google Cloud Platform project with Chrome Web Store API enabled

## Setup Steps

### 1. Get Chrome Web Store API Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Chrome Web Store API:
   - Go to "APIs & Services" > "Library"
   - Search for "Chrome Web Store API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs:
   - `https://developers.chromium.org/oauth2callback`
   - `http://localhost:8080/oauth2callback`
5. Note down the Client ID and Client Secret

### 3. Get Refresh Token

1. Install the Chrome Web Store API client:
   ```bash
   pip install google-api-python-client
   ```

2. Create a script to get the refresh token:
   ```python
   from google_auth_oauthlib.flow import InstalledAppFlow
   from google.auth.transport.requests import Request
   import pickle
   import os

   SCOPES = ['https://www.googleapis.com/auth/chromewebstore']

   def get_refresh_token():
       creds = None
       if os.path.exists('token.pickle'):
           with open('token.pickle', 'rb') as token:
               creds = pickle.load(token)
       
       if not creds or not creds.valid:
           if creds and creds.expired and creds.refresh_token:
               creds.refresh(Request())
           else:
               flow = InstalledAppFlow.from_client_secrets_file(
                   'client_secrets.json', SCOPES)
               creds = flow.run_local_server(port=8080)
           
           with open('token.pickle', 'wb') as token:
               pickle.dump(creds, token)
       
       return creds.refresh_token

   if __name__ == '__main__':
       refresh_token = get_refresh_token()
       print(f"Refresh Token: {refresh_token}")
   ```

3. Download your OAuth client credentials as `client_secrets.json`
4. Run the script to get your refresh token

### 4. Get Extension ID

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Find your Redirector extension
3. Copy the Extension ID from the URL or extension details

### 5. Set GitHub Secrets

In your GitHub repository, go to Settings > Secrets and variables > Actions, and add these secrets:

- `EXTENSION_ID`: Your Chrome Web Store extension ID
- `CLIENT_ID`: Your OAuth 2.0 Client ID
- `CLIENT_SECRET`: Your OAuth 2.0 Client Secret  
- `REFRESH_TOKEN`: Your refresh token from step 3

## How It Works

The workflow (`/.github/workflows/publish-chrome.yml`) will:

1. Trigger when a new release is published
2. Build the Chrome extension using the existing `build.py` script
3. Upload the built extension to the Chrome Web Store
4. Publish the update automatically

## Manual Publishing

If you need to publish manually, you can:

1. Build the extension: `python build.py`
2. Upload the `build/redirector-chrome.zip` file to the Chrome Web Store Developer Dashboard
3. Submit for review

## Troubleshooting

- **Authentication errors**: Verify your OAuth credentials and refresh token
- **Extension ID not found**: Make sure the extension ID matches your published extension
- **Build failures**: Check that all required files are included in the build
- **API quota exceeded**: Chrome Web Store API has daily limits, consider batching updates

## Security Notes

- Never commit secrets to the repository
- Rotate refresh tokens periodically
- Use repository secrets for all sensitive data
- Consider using GitHub's encrypted secrets for additional security 