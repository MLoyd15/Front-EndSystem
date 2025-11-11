import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import EmailService from '../services/emailService.js';

// Create a single email service instance
const emailService = new EmailService();

// POST /api/auth/otp/request
// Initiates OTP for superadmin via email-only (passwordless owner login)
export const requestOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Deliberately do not reveal existence; keep generic message
      return res.status(200).json({ success: true, requiresOtp: true, message: 'If the email is valid, an OTP will be sent.' });
    }

    // Only superadmin requires/uses OTP in this flow
    if (user.role !== 'superadmin') {
      // Respond generically to avoid role enumeration
      return res.status(200).json({ success: true, requiresOtp: true, message: 'If the email is valid, an OTP will be sent.' });
    }

    // Send OTP email
    const sendResult = await emailService.sendOTP(user.email, user.name);
    if (!sendResult.success) {
      return res.status(500).json({ success: false, message: sendResult.message || 'Failed to send OTP' });
    }

    return res.json({
      success: true,
      requiresOtp: true,
      message: 'OTP sent to email',
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