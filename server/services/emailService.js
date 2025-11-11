// backend/services/emailService.js
import nodemailer from 'nodemailer';
import crypto from 'crypto';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'goagritrading316@gmail.com',
        // Gmail app passwords are shown with spaces; remove them if present
        pass: (process.env.EMAIL_PASSWORD || 'go@gritrading1').replace(/\s+/g, '')
      }
    });

    // Proactively verify SMTP connection and credentials
    this.transporter.verify((err, success) => {
      if (err) {
        console.error('❌ SMTP verification failed:', err.message || err);
      } else {
        console.log('✅ SMTP transporter is ready to send mail');
      }
    });

    // Store OTPs temporarily (in production, use Redis)
    this.otpStore = new Map();
  }

  /**
   * Generate a 6-digit OTP
   */
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Store OTP with expiration (5 minutes)
   */
  storeOTP(email, otp) {
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    this.otpStore.set(email, { otp, expiresAt });

    // Auto-cleanup after expiration
    setTimeout(() => {
      this.otpStore.delete(email);
    }, 5 * 60 * 1000);
  }

  /**
   * Verify OTP
   */
  verifyOTP(email, otp) {
    const stored = this.otpStore.get(email);
    
    if (!stored) {
      return { success: false, message: 'OTP not found or expired' };
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(email);
      return { success: false, message: 'OTP has expired' };
    }

    if (stored.otp !== otp) {
      return { success: false, message: 'Invalid OTP' };
    }

    // OTP is valid, remove it
    this.otpStore.delete(email);
    return { success: true, message: 'OTP verified successfully' };
  }

  /**
   * Send OTP email
   */
  async sendOTP(email, userName = 'User') {
    try {
      const otp = this.generateOTP();
      this.storeOTP(email, otp);

      const mailOptions = {
        from: {
          name: 'GO AGRI TRADING',
          address: process.env.EMAIL_USER || 'goagritrading316@gmail.com'
        },
        to: email,
        subject: 'Your Login OTP - GO AGRI TRADING',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .content {
                background: white;
                border-radius: 8px;
                padding: 30px;
              }
              .logo {
                text-align: center;
                margin-bottom: 20px;
              }
              .logo-circle {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #FCD34D, #F59E0B);
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                font-size: 24px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
              }
              h1 {
                color: #1f2937;
                text-align: center;
                margin-bottom: 10px;
              }
              .greeting {
                color: #4b5563;
                text-align: center;
                margin-bottom: 30px;
              }
              .otp-box {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 30px;
                border-radius: 8px;
                text-align: center;
                margin: 30px 0;
                box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
              }
              .otp-code {
                font-size: 48px;
                font-weight: bold;
                letter-spacing: 8px;
                margin: 20px 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
              }
              .expiry {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
              }
              .warning {
                background: #fee2e2;
                border-left: 4px solid #ef4444;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                color: #991b1b;
              }
              .button {
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="content">
                <div class="logo">
                  <div class="logo-circle">GO</div>
                </div>
                
                <h1>Login Verification</h1>
                <p class="greeting">Hello ${userName},</p>
                
                <p>We received a login request for your GO AGRI TRADING account. Use the OTP below to complete your login:</p>
                
                <div class="otp-box">
                  <p style="margin: 0; font-size: 16px;">Your One-Time Password</p>
                  <div class="otp-code">${otp}</div>
                  <p style="margin: 0; font-size: 14px; opacity: 0.9;">Enter this code to continue</p>
                </div>
                
                <div class="expiry">
                  <strong>⏰ Important:</strong> This OTP will expire in <strong>5 minutes</strong>
                </div>
                
                <div class="warning">
                  <strong>🔒 Security Notice:</strong>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Never share this OTP with anyone</li>
                    <li>GO AGRI TRADING will never ask for your OTP via phone or email</li>
                    <li>If you didn't request this login, please ignore this email</li>
                  </ul>
                </div>
                
                <div class="footer">
                  <p><strong>GO AGRI TRADING</strong></p>
                  <p style="font-style: italic; color: #10b981;">Jesus Saves - John 3:16</p>
                  <p style="margin-top: 15px;">Need help? Contact our support team</p>
                  <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ OTP email sent:', info.messageId);
      return {
        success: true,
        message: 'OTP sent successfully',
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ Error sending OTP email:', error);
      return {
        success: false,
        message: 'Failed to send OTP email',
        error: error.message
      };
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(email, orderDetails) {
    try {
      const mailOptions = {
        from: {
          name: 'GO AGRI TRADING',
          address: process.env.EMAIL_USER || 'goagritrading316@gmail.com'
        },
        to: email,
        subject: `Order Confirmation - #${orderDetails.orderId}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981;">Order Confirmed! 🎉</h2>
              <p>Thank you for your order from GO AGRI TRADING.</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Order Details:</h3>
                <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                <p><strong>Total Amount:</strong> ₱${orderDetails.total}</p>
                <p><strong>Delivery Type:</strong> ${orderDetails.deliveryType}</p>
              </div>
              <p>We'll notify you when your order is ready for delivery.</p>
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Jesus Saves - John 3:16
              </p>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();