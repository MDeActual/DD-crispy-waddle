const express = require('express');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { users } = require('../store');
const { signToken } = require('../auth');
const { authenticate } = require('../middleware');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const validRoles = ['admin', 'dispatcher', 'driver'];
  const assignedRole = validRoles.includes(role) ? role : 'driver';

  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: `u${Date.now()}`,
    name,
    email,
    password: hashedPassword,
    role: assignedRole,
    mfaEnabled: false,
    mfaSecret: null,
  };

  users.push(newUser);

  const { password: _pw, mfaSecret: _ms, ...safeUser } = newUser;
  return res.status(201).json({ message: 'User registered successfully', user: safeUser });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.mfaEnabled) {
    // Issue a short-lived pre-auth token for MFA validation step
    const preAuthToken = signToken({ id: user.id, mfaPending: true });
    return res.json({ mfa_required: true, pre_auth_token: preAuthToken });
  }

  const token = signToken({ id: user.id, role: user.role });
  const { password: _pw, mfaSecret: _ms, ...safeUser } = user;
  return res.json({ token, user: safeUser });
});

// POST /api/auth/mfa/setup  (authenticated)
router.post('/mfa/setup', authenticate, async (req, res) => {
  const user = req.user;

  const secret = speakeasy.generateSecret({
    name: `LogisticsApp (${user.email})`,
    length: 20,
  });

  // Store the secret temporarily (will be confirmed on verify)
  user.mfaSecret = secret.base32;

  try {
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    return res.json({
      message: 'MFA secret generated. Scan QR code with your authenticator app, then call /mfa/verify.',
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// POST /api/auth/mfa/verify  (authenticated - confirm MFA setup)
router.post('/mfa/verify', authenticate, (req, res) => {
  const { token } = req.body;
  const user = req.user;

  if (!user.mfaSecret) {
    return res.status(400).json({ error: 'MFA setup not initiated. Call /mfa/setup first.' });
  }

  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: String(token),
    window: 1,
  });

  if (!verified) {
    return res.status(400).json({ error: 'Invalid TOTP token' });
  }

  user.mfaEnabled = true;
  const jwtToken = signToken({ id: user.id, role: user.role });
  return res.json({ message: 'MFA enabled successfully', token: jwtToken });
});

// POST /api/auth/mfa/validate  (validate TOTP during login, using pre_auth_token)
router.post('/mfa/validate', (req, res) => {
  const { pre_auth_token, token } = req.body;

  if (!pre_auth_token || !token) {
    return res.status(400).json({ error: 'pre_auth_token and token are required' });
  }

  let decoded;
  try {
    const { verifyToken } = require('../auth');
    decoded = verifyToken(pre_auth_token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired pre_auth_token' });
  }

  if (!decoded.mfaPending) {
    return res.status(400).json({ error: 'Token is not a pre-auth MFA token' });
  }

  const user = users.find((u) => u.id === decoded.id);
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(401).json({ error: 'MFA not enabled for this user' });
  }

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: String(token),
    window: 1,
  });

  if (!verified) {
    return res.status(401).json({ error: 'Invalid TOTP token' });
  }

  const jwtToken = signToken({ id: user.id, role: user.role });
  const { password: _pw, mfaSecret: _ms, ...safeUser } = user;
  return res.json({ token: jwtToken, user: safeUser });
});

module.exports = router;
