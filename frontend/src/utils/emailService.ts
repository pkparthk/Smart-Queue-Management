import emailjs from "@emailjs/browser";

interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  managerTemplateId?: string;
}

class EmailService {
  private config: EmailConfig;
  private isConfigured: boolean = false;

  constructor() {
    this.config = {
      serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "",
      templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "",
      publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "",
      managerTemplateId:
        process.env.NEXT_PUBLIC_EMAILJS_MANAGER_TEMPLATE_ID || "",
    };

    this.isConfigured = !!(
      this.config.serviceId &&
      this.config.templateId &&
      this.config.publicKey
    );

    // console.log("📧 EmailJS Configuration:", {
    //   serviceId: this.config.serviceId
    //     ? `${this.config.serviceId.substring(0, 8)}...`
    //     : "Not set",
    //   templateId: this.config.templateId
    //     ? `${this.config.templateId.substring(0, 8)}...`
    //     : "Not set",
    //   publicKey: this.config.publicKey
    //     ? `${this.config.publicKey.substring(0, 8)}...`
    //     : "Not set",
    //   isConfigured: this.isConfigured,
    // });

    if (this.isConfigured) {
      emailjs.init(this.config.publicKey);
      // console.log("📧 EmailJS initialized successfully");
    } else {
      console.warn("📧 EmailJS not configured - email features disabled");
      console.warn(
        "📧 Missing environment variables. Please check your .env.local file."
      );
    }
  }

  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    queueName: string,
    position: number,
    estimatedWaitTime: string,
    tokenNumber?: string
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.log("📧 EmailJS not configured - simulating welcome email");
      return false;
    }

    try {
      // EmailJS template parameters - these must match your EmailJS template settings
      const templateParams = {
        // Recipient email - this is the key parameter EmailJS needs
        to_email: userEmail,
        to_name: userName,

        // Message content parameters
        user_name: userName,
        customer_name: userName, // Alternative naming
        queue_name: queueName,
        position: position.toString(),
        estimated_wait_time: estimatedWaitTime,
        token_number: tokenNumber || "N/A",

        // Additional context
        current_date: new Date().toLocaleDateString(),
        current_time: new Date().toLocaleTimeString(),

        // Subject line (if your template uses it)
        subject: `Welcome to ${queueName}!`,

        // Reply-to (optional)
        reply_to: "noreply@smartqueue.app",
      };

      // console.log("📧 Sending welcome email with params:", templateParams);
      // console.log("📧 Using service:", this.config.serviceId);
      // console.log("📧 Using template:", this.config.templateId);

      const result = await emailjs.send(
        this.config.serviceId,
        this.config.templateId,
        templateParams
      );

      console.log("✅ Welcome email sent successfully:", result);
      return true;
    } catch (error: any) {
      console.error("📧 ❌ Failed to send welcome email:", error);
      if (error.status) {
        console.error("📧 ❌ Error status:", error.status);
        console.error("📧 ❌ Error text:", error.text);
      }
      return false;
    }
  }

  async sendManagerMessage(
    userEmail: string,
    userName: string,
    managerName: string,
    message: string,
    queueName: string
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.log("📧 EmailJS not configured - simulating manager message");
      return false;
    }

    try {
      const templateId =
        this.config.managerTemplateId || this.config.templateId;
      const templateParams = {
        to_email: userEmail,
        user_name: userName,
        manager_name: managerName,
        message: message,
        queue_name: queueName,
        current_date: new Date().toLocaleDateString(),
        current_time: new Date().toLocaleTimeString(),
      };

      // console.log("📧 Sending manager message with params:", templateParams);

      const result = await emailjs.send(
        this.config.serviceId,
        templateId,
        templateParams
      );

      // console.log("📧 ✅ Manager message sent successfully:", result);
      return true;
    } catch (error: any) {
      // console.error("📧 ❌ Failed to send manager message:", error);
      return false;
    }
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  getConfig(): EmailConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
