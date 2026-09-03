import { Router } from 'express';
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  logoutAll,
  me,
  refreshToken,
  register,
  resendResetOtp,
  resetPassword,
  testAuthenticated,
  verifyResetOtp
} from '../controllers/auth.controller';
import {
  forgotPasswordRateLimiter,
  resendResetOtpRateLimiter,
  resetPasswordRateLimiter,
  verifyResetOtpRateLimiter
} from '../config/rateLimit';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/forgot-password', forgotPasswordRateLimiter, forgotPassword);
router.post('/auth/resend-reset-otp', resendResetOtpRateLimiter, resendResetOtp);
router.post('/auth/verify-reset-otp', verifyResetOtpRateLimiter, verifyResetOtp);
router.post('/auth/reset-password', resetPasswordRateLimiter, resetPassword);
router.post('/auth/logout', logout);
router.post('/auth/logout-all', authenticateJwt, logoutAll);
router.post('/auth/refresh-token', refreshToken);
router.put('/auth/change-password', authenticateJwt, changePassword);
router.get('/auth/me', authenticateJwt, me);
router.get('/auth/test', authenticateJwt, testAuthenticated);

export default router;
