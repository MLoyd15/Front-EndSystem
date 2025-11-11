import express from 'express';
import { requestOtp, verifyOtp } from '../controlers/otpController.js';

const router = express.Router();

// Initiate OTP for superadmin login
router.post('/otp/request', requestOtp);

// Verify OTP and complete login
router.post('/otp/verify', verifyOtp);

export default router;