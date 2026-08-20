export abstract class PhoneMessageService {
  abstract sendSMS(to: string, message: string): Promise<boolean>;
}

export class TwilioMessageService extends PhoneMessageService {
  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // Lazy load twilio to avoid initializing it if another provider is used
      // For now, we assume twilio client is configured in Config/twilio.config.ts
      // Note: We'll mock it here until the actual Twilio account is wired
      console.log(`[TwilioMessageService] Sending SMS to ${to}: ${message}`);
      // return await twilioClient.messages.create({ ... })
      return true;
    } catch (error) {
      console.error("[TwilioMessageService] Error sending SMS:", error);
      return false;
    }
  }
}

export class MockMessageService extends PhoneMessageService {
  async sendSMS(to: string, message: string): Promise<boolean> {
    console.log(`[MockMessageService] Mock SMS sent to ${to} with message: ${message}`);
    return true;
  }
}

// Export a singleton instance of the active service
// Change this to new TwilioMessageService() when ready for production
export const phoneMessageService = new MockMessageService();
