import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import emailService from '../services/emailService.js';

// POST /api/auth/otp/request
// Initiates OTP for superadmin via email-only (passwordless owner login)
export const requestOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Normalize and match email case-insensitively to avoid silent mismatches
    const normalizedEmail = String(email).trim();
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const emailRegex = new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i');

    // Add diagnostic logging to help trace gating reasons
    console.log('🔎 OTP request received', { email: normalizedEmail });

    const user = await User.findOne({ email: emailRegex });
    console.log('🔎 OTP user lookup', { found: !!user, role: user?.role });
    if (!user) {
      // Deliberately do not reveal existence; keep generic message
      console.log('⚠️ OTP gated: user not found');
      return res.status(200).json({ success: true, requiresOtp: true, message: 'If the email is valid, an OTP will be sent.' });
    }

    // Only superadmin requires/uses OTP in this flow
    if (user.role !== 'superadmin') {
      // Respond generically to avoid role enumeration
      console.log('⚠️ OTP gated: role is not superadmin', { role: user.role });
      return res.status(200).json({ success: true, requiresOtp: true, message: 'If the email is valid, an OTP will be sent.' });
    }

    // Send OTP email asynchronously so the client doesn't block on SMTP
    emailService
      .sendOTP(user.email, user.name)
      .then((result) => {
        if (!result?.success) {
          console.error('sendOTP failed:', result?.error || result?.message);
        }
        if (result?.success) {
          console.log('✅ sendOTP scheduled successfully for', { email: user.email });
        }
      })
      .catch((err) => {
        console.error('sendOTP error:', err?.message || err);
      });

    // Respond immediately with a generic success to avoid timing issues
    return res.json({
      success: true,
      requiresOtp: true,
      message: 'If the email is valid, an OTP will be sent.',
      email: user.email
    });
  } catch (err) {
    console.error('requestOtp error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/auth/otp/verify
// Verifies OTP for superadmin and issues JWT
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'OTP verification is restricted to superadmin login' });
    }

    const verify = emailService.verifyOTP(email, String(otp));
    if (!verify.success) {
      return res.status(400).json({ success: false, message: verify.message || 'Invalid OTP' });
    }

    const tokenPayload = {
      _id: user._id.toString(),
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      loginTime: Date.now()
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};