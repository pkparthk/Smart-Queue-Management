import nodemailer from "nodemailer";

// Email service configuration
interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  service?: string;
  auth?: {
    user?: string;
    pass?: string;
  };
}

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class MultiProviderEmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;
  private currentProvider = "";

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Check which email provider to use
      const emailUser = process.env.GMAIL_USER || process.env.EMAIL_USER;
      const emailPassword =
        process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD;

      // console.log("📧 ====================================");
      // console.log("📧 Initializing Multi-Provider Email Service");
      // console.log("📧 ====================================");
      // console.log(`📧 Email User: ${emailUser ? "✅ Set" : "❌ Not set"}`);
      // console.log(
      //   `📧 Email Password: ${emailPassword ? "✅ Set" : "❌ Not set"}`
      // );

      if (!emailUser || !emailPassword) {
        // console.log("📧 Running in SIMULATION MODE - No credentials provided");
        this.isConfigured = false;
        return;
      }

      // Determine email provider and configurations to try
      const configs = this.getEmailConfigs(emailUser, emailPassword);

      // Try each configuration
      let connected = false;
      for (let i = 0; i < configs.length && !connected; i++) {
        const config = configs[i];
        console.log(`📧 Trying ${config.name}...`);

        this.transporter = nodemailer.createTransport(config.config as any);

        try {
          await this.transporter!.verify();
          this.isConfigured = true;
          this.currentProvider = config.name;
          connected = true;
          console.log(`📧 ✅ ${config.name} connected successfully!`);
          console.log(`📧 📬 Sending emails from: ${emailUser}`);
          console.log("📧 ====================================");
          break;
        } catch (error: any) {
          console.log(`📧 ❌ ${config.name} failed: ${error.message}`);
          if (i === configs.length - 1) {
            console.error("📧 ❌ All email providers failed!");
            this.handleEmailError(error);
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Failed to configure email service:", error);
      this.isConfigured = false;
    }
  }

  private getEmailConfigs(emailUser: string, emailPassword: string) {
    const domain = emailUser.split("@")[1]?.toLowerCase();

    const configs = [];

    // Gmail configurations
    if (domain === "gmail.com") {
      configs.push(
        {
          name: "Gmail (Service)",
          config: {
            service: "gmail",
            auth: { user: emailUser, pass: emailPassword },
          },
        },
        {
          name: "Gmail (SMTP 587)",
          config: {
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: { user: emailUser, pass: emailPassword },
          },
        },
        {
          name: "Gmail (SMTP 465)",
          config: {
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: { user: emailUser, pass: emailPassword },
          },
        }
      );
    }

    // Outlook configurations
    if (
      domain === "outlook.com" ||
      domain === "hotmail.com" ||
      domain === "live.com"
    ) {
      configs.push(
        {
          name: "Outlook (Service)",
          config: {
            service: "hotmail",
            auth: { user: emailUser, pass: emailPassword },
          },
        },
        {
          name: "Outlook (SMTP)",
          config: {
            host: "smtp-mail.outlook.com",
            port: 587,
            secure: false,
            auth: { user: emailUser, pass: emailPassword },
          },
        }
      );
    }

    // Yahoo configurations
    if (domain === "yahoo.com") {
      configs.push(
        {
          name: "Yahoo (Service)",
          config: {
            service: "yahoo",
            auth: { user: emailUser, pass: emailPassword },
          },
        },
        {
          name: "Yahoo (SMTP)",
          config: {
            host: "smtp.mail.yahoo.com",
            port: 587,
            secure: false,
            auth: { user: emailUser, pass: emailPassword },
          },
        }
      );
    }

    // Generic SMTP (fallback)
    configs.push({
      name: "Generic SMTP",
      config: {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: emailUser, pass: emailPassword },
      },
    });

    return configs;
  }

  private handleEmailError(error: any) {
    console.error("📧 Error code:", error.code);

    if (error.code === "EAUTH") {
      console.log("📧 🔧 Authentication Error Solutions:");
      console.log("📧 1. For Gmail: Use 16-character App Password");
      console.log("📧 2. For Outlook: Use regular password");
      console.log("📧 3. Enable 2FA if required");
      console.log("📧 4. Check for typos in credentials");
    }

    if (error.code === "ECONNECTION") {
      console.log("📧 🔧 Connection Error Solutions:");
      console.log("📧 1. Check internet connection");
      console.log("📧 2. Try different email provider");
      console.log("📧 3. Check firewall settings");
    }

    this.isConfigured = false;
  }

  async sendMessage(message: EmailMessage): Promise<boolean> {
    try {
      console.log(
        `📧 Attempting to send email via ${this.currentProvider} to: ${message.to}`
      );

      if (!this.isConfigured || !this.transporter) {
        console.log("\n📧 === SIMULATED EMAIL ===");
        console.log(`To: ${message.to}`);
        console.log(`Subject: ${message.subject}`);
        console.log(`Message: ${message.text}`);
        console.log("========================\n");
        return true;
      }

      const mailOptions = {
        from:
          process.env.GMAIL_USER ||
          process.env.EMAIL_USER ||
          "noreply@smartqueue.com",
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html || message.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        `📧 ✅ Email sent successfully via ${this.currentProvider} to: ${message.to}`
      );
      console.log("📧 📧 Message ID:", result.messageId);
      return true;
    } catch (error: any) {
      console.error(
        `❌ Failed to send email via ${this.currentProvider}:`,
        error.message
      );
      return false;
    }
  }

  // Test email configuration
  async testEmailConfiguration(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log("📧 Email not configured - cannot test");
      return false;
    }

    try {
      const testEmail: EmailMessage = {
        to:
          process.env.GMAIL_USER ||
          process.env.EMAIL_USER ||
          "test@example.com",
        subject: "SmartQueue Email Test ✅",
        text: `Test email sent at ${new Date().toLocaleString()} via ${
          this.currentProvider
        }`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">✅ SmartQueue Email Test Success!</h2>
            <p>Your email configuration is working correctly!</p>
            <p><strong>Provider:</strong> ${this.currentProvider}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p>You can now send emails from your SmartQueue application! 🎉</p>
          </div>
        `,
      };

      console.log(`📧 Sending test email via ${this.currentProvider}...`);
      return await this.sendMessage(testEmail);
    } catch (error) {
      console.error("❌ Test email failed:", error);
      return false;
    }
  }

  // Queue message method with correct signature to match existing usage
  async sendQueueMessage(
    customerEmail: string,
    customerName: string,
    managerName: string,
    message: string,
    queueName: string
  ): Promise<boolean> {
    const emailMessage: EmailMessage = {
      to: customerEmail,
      subject: `SmartQueue Update - ${queueName}`,
      text: `
Dear ${customerName},

You have received a message from ${managerName} regarding your position in the ${queueName} queue:

${message}

Thank you for using SmartQueue!

Best regards,
SmartQueue Team
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
  <div style="text-align: center; background: linear-gradient(135deg, #2563eb, #1e40af); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 24px;">🎟️ SmartQueue Update</h2>
  </div>
  
  <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #1e40af;">Message from Queue Manager</h3>
    <p style="margin: 0;"><strong>Queue:</strong> ${queueName}</p>
    <p style="margin: 0;"><strong>Manager:</strong> ${managerName}</p>
  </div>
  
  <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; border: 1px solid #fed7aa; margin-bottom: 20px;">
    <h4 style="margin-top: 0; color: #ea580c;">📨 Message:</h4>
    <p style="margin: 0; font-size: 16px; line-height: 1.6;">${message}</p>
  </div>
  
  <p style="color: #4b5563;">Thank you for using SmartQueue!</p>
  
  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
  <p style="color: #6b7280; font-size: 12px; text-align: center;">
    This is an automated message from SmartQueue. Please do not reply to this email.
  </p>
</div>
      `,
    };

    return this.sendMessage(emailMessage);
  }

  // Welcome email method with correct signature to match existing usage
  async sendWelcomeEmail(
    customerEmail: string,
    customerName: string,
    queueName: string,
    position: number,
    estimatedWaitTime: string,
    tokenNumber?: string
  ): Promise<boolean> {
    const emailMessage: EmailMessage = {
      to: customerEmail,
      subject: `🎟️ Welcome to SmartQueue - ${queueName}`,
      text: `
Dear ${customerName},

Welcome to SmartQueue! You have successfully joined the ${queueName} queue.

Your Queue Details:
${tokenNumber ? `- Token Number: ${tokenNumber}` : ""}
- Current Position: ${position}
${estimatedWaitTime ? `- Estimated Wait Time: ${estimatedWaitTime}` : ""}

${
  tokenNumber
    ? `Please save your token number ${tokenNumber} for reference.`
    : ""
} You will be notified when it's your turn.

Thank you for using SmartQueue!

Best regards,
SmartQueue Team
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
  <div style="text-align: center; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 24px;">🎉 Welcome to SmartQueue!</h2>
  </div>
  
  <p style="font-size: 18px; color: #374151;">Dear <strong>${customerName}</strong>,</p>
  <p style="color: #4b5563;">You have successfully joined the <strong>${queueName}</strong> queue.</p>
  
  <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
    <h3 style="margin-top: 0; color: #0369a1;">🎫 Your Queue Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      ${
        tokenNumber
          ? `
      <tr>
        <td style="padding: 8px 0; color: #374151;"><strong>Token Number:</strong></td>
        <td style="padding: 8px 0; color: #1f2937; font-weight: bold; font-size: 18px;">${tokenNumber}</td>
      </tr>
      `
          : ""
      }
      <tr>
        <td style="padding: 8px 0; color: #374151;"><strong>Current Position:</strong></td>
        <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">#${position}</td>
      </tr>
      ${
        estimatedWaitTime
          ? `
      <tr>
        <td style="padding: 8px 0; color: #374151;"><strong>Estimated Wait:</strong></td>
        <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${estimatedWaitTime}</td>
      </tr>
      `
          : ""
      }
    </table>
  </div>
  
  ${
    tokenNumber
      ? `
  <div style="background-color: #fefce8; padding: 15px; border-radius: 8px; border: 1px solid #fde047; margin: 20px 0;">
    <p style="margin: 0; color: #854d0e;"><strong>📝 Important:</strong> Please save your token number <strong>${tokenNumber}</strong> for reference.</p>
  </div>
  `
      : ""
  }
  
  <p style="color: #4b5563;">You will be notified when it's your turn. Thank you for using SmartQueue!</p>
  
  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
  <p style="color: #6b7280; font-size: 12px; text-align: center;">
    This is an automated message from SmartQueue. Please do not reply to this email.
  </p>
</div>
      `,
    };

    return this.sendMessage(emailMessage);
  }
}

// Export singleton instance
export const emailService = new MultiProviderEmailService();

// Export individual functions for backward compatibility
export const sendWelcomeEmail =
  emailService.sendWelcomeEmail.bind(emailService);
export const sendQueueMessage =
  emailService.sendQueueMessage.bind(emailService);

export default emailService;
