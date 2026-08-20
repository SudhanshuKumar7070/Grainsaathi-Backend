import cron from "node-cron";
import { ContractService } from "../../Service/contract.service.js";

const contractService = new ContractService();

// Run every hour to check for expired pending contracts
cron.schedule("0 * * * *", async () => {
  try {
    await contractService.processContractExpirations();
  } catch (error) {
    console.error("[CRON ERROR] Failed to process contract expirations:", error);
  }
});

export default cron;
