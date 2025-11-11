import express from 'express';
import { requestOtp, verifyOtp, otpStatus } from '../controlers/otpController.js';

const router = express.Router();

// Initiate OTP for superadmin login
router.post('/otp/request', requestOtp);

// Verify OTP and complete login
router.post('/otp/verify', verifyOtp);

// Diagnostics: check SMTP readiness and config summary
router.get('/otp/status', otpStatus);

export default router;