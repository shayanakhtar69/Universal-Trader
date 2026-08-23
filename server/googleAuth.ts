import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'wholesale-super-secure-secret-key-2026';

function escapeHtml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getEffectiveRedirectUri(req: Request): string {
  const queryRedirect = req.query.redirect_uri as string;
  if (queryRedirect && typeof queryRedirect === 'string') {
    return queryRedirect;
  }

  if (process.env.APP_URL) {
    const base = process.env.APP_URL.replace(/\/+$/, '');
    return `${base}/auth/callback`;
  }

  const host = req.get('host') || 'localhost:3000';
  const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${proto}://${host}/auth/callback`;
}

export function handleGoogleConfig(_req: Request, res: Response) {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const isConfigured = Boolean(clientId.trim() && clientSecret.trim());

  return res.json({
    configured: isConfigured,
    clientId: isConfigured ? clientId : null,
    supportedRedirectUris: [
      'http://localhost:3000/auth/callback',
      process.env.APP_URL ? `${process.env.APP_URL.replace(/\/+$/, '')}/auth/callback` : null,
    ].filter(Boolean),
  });
}

export function handleGoogleAuthUrl(req: Request, res: Response) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(400).json({
      configured: false,
      error: 'Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in environment variables.',
      setupHelp: {
        doc: 'To enable Google Sign-In, add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.',
        redirectUris: [
          'http://localhost:3000/auth/callback',
          process.env.APP_URL ? `${process.env.APP_URL.replace(/\/+$/, '')}/auth/callback` : null,
        ].filter(Boolean),
      },
    });
  }

  const redirectUri = getEffectiveRedirectUri(req);
  const state = req.query.state ? String(req.query.state) : `state_${Date.now()}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return res.json({
    configured: true,
    url: authUrl,
    redirectUri,
  });
}

export async function handleGoogleCallback(req: Request, res: Response) {
  const { code, error, state } = req.query;

  if (error) {
    return renderAuthResultHtml(res, {
      success: false,
      error: `Google authorization returned error: ${String(error)}`,
    });
  }

  if (!code || typeof code !== 'string') {
    return renderAuthResultHtml(res, {
      success: false,
      error: 'Missing authorization code from Google OAuth callback.',
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return renderAuthResultHtml(res, {
      success: false,
      error: 'Server missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET configuration.',
    });
  }

  const redirectUri = getEffectiveRedirectUri(req);

  try {
    // 1. Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData: any = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return renderAuthResultHtml(res, {
        success: false,
        error: tokenData.error_description || tokenData.error || 'Failed to exchange token with Google.',
      });
    }

    // 2. Fetch Google User Profile
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profile: any = await userInfoResponse.json();

    if (!userInfoResponse.ok || !profile.id) {
      console.error('Google user info error:', profile);
      return renderAuthResultHtml(res, {
        success: false,
        error: 'Failed to retrieve Google user profile details.',
      });
    }

    // 3. Create or login user in local wholesale database
    const authResult = db.createOrLoginGoogleUser({
      googleId: profile.id,
      email: profile.email || '',
      name: profile.name || profile.given_name || 'Google User',
      avatarUrl: profile.picture,
    });

    // 4. Generate JWT session token
    const jwtToken = jwt.sign(
      {
        id: authResult.user.id,
        role: authResult.user.role,
        username: authResult.user.username,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return renderAuthResultHtml(res, {
      success: true,
      token: jwtToken,
      user: authResult.user,
      shopProfile: authResult.shopProfile,
      isNewUser: authResult.isNewUser,
    });
  } catch (err: any) {
    console.error('Google OAuth callback unexpected error:', err);
    return renderAuthResultHtml(res, {
      success: false,
      error: err.message || 'An unexpected error occurred during Google authentication.',
    });
  }
}

type AuthResultPayload =
  | { success: true; token: string; user: any; shopProfile: any; isNewUser: boolean }
  | { success: false; error: string };

function renderAuthResultHtml(
  res: Response,
  data: AuthResultPayload
) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (data.success === true) {
    const payload = {
      type: 'OAUTH_AUTH_SUCCESS',
      token: data.token,
      user: data.user,
      shopProfile: data.shopProfile,
      isNewUser: data.isNewUser,
    };

    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Google Sign-In Successful</title>
  <style>
    body {
      background-color: #1F2B3A;
      color: #EEF0EC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      background: #151D28;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 28px;
      text-align: center;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    h2 {
      color: #D9A441;
      margin: 0 0 10px 0;
      font-size: 20px;
    }
    p {
      margin: 6px 0;
      font-size: 13px;
      color: rgba(255,255,255,0.8);
    }
    .badge {
      display: inline-block;
      margin-top: 12px;
      padding: 4px 10px;
      background: #3F7D58;
      color: white;
      font-size: 11px;
      border-radius: 4px;
      font-weight: bold;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>✓ Sign-In Successful</h2>
    <p>Welcome, <strong>${escapeHtml(data.user.name)}</strong></p>
    <div class="badge">${escapeHtml(data.user.role.toUpperCase())} PORTAL</div>
    <p style="margin-top: 16px; font-size: 11px; opacity: 0.6;">Closing window and redirecting to POS Counter...</p>
  </div>
  <script>
    (function() {
      const payload = ${JSON.stringify(payload)};
      if (window.opener) {
        window.opener.postMessage(payload, '*');
        setTimeout(function() {
          window.close();
        }, 400);
      } else {
        localStorage.setItem('wholesale_auth_token', payload.token);
        localStorage.setItem('wholesale_auth_user', JSON.stringify(payload.user));
        window.location.href = '/';
      }
    })();
  </script>
</body>
</html>`);
  } else {
    const errorPayload = {
      type: 'OAUTH_AUTH_ERROR',
      error: data.error,
    };

    return res.status(400).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Google Sign-In Failed</title>
  <style>
    body {
      background-color: #1F2B3A;
      color: #EEF0EC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      background: #151D28;
      border: 1px solid #C1443C;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    h2 {
      color: #C1443C;
      margin: 0 0 12px 0;
      font-size: 18px;
    }
    p {
      margin: 8px 0;
      font-size: 13px;
      color: #ffb4ab;
      line-height: 1.5;
    }
    button {
      margin-top: 18px;
      padding: 8px 18px;
      background: #D9A441;
      color: #1F2B3A;
      font-weight: bold;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>✕ Authentication Error</h2>
    <p>${escapeHtml(data.error)}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    (function() {
      const errorPayload = ${JSON.stringify(errorPayload)};
      if (window.opener) {
        window.opener.postMessage(errorPayload, '*');
      }
    })();
  </script>
</body>
</html>`);
  }
}
