const cron = require('node-cron');
const { Ticket } = require('../models');
const PnrService = require('../services/pnrService');

/**
 * Initializes the PNR updater cron job.
 * Runs twice a day: 12 AM and 12 PM (Midnight and Noon)
 * This prevents overusing the RapidAPI rate limits for irctc/flights.
 */
const initPnrCron = () => {
  // '0 0,12 * * *' -> At minute 0 past hour 0 and 12.
  cron.schedule('0 0,12 * * *', async () => {
    console.log('[CRON] Starting Scheduled PNR Refresh Job...');
    
    try {
      // Find all tickets that are still active ( departure time hasn't passed yet )
      const activeTickets = await Ticket.findAll({
        where: { status: 'ACTIVE' }
      });

      console.log(`[CRON] Found ${activeTickets.length} active tickets to refresh.`);

      for (const ticket of activeTickets) {
        // If the departure time has already passed, mark it completed and skip calling the API
        if (new Date(ticket.departureTime) < new Date()) {
          ticket.status = 'COMPLETED';
          await ticket.save();
          continue;
        }

        try {
          // Call the external API based on ticket type
          let updatedData;
          if (ticket.type === 'railway') {
            updatedData = await PnrService.fetchTrainPNR(ticket.pnr);
          } else if (ticket.type === 'flight') {
            updatedData = await PnrService.fetchFlightPNR(ticket.pnr);
          }

          // Update the DB record with fresh API data
          if (updatedData) {
            ticket.departureStation = updatedData.departureStation || ticket.departureStation;
            ticket.destinationStation = updatedData.destinationStation || ticket.destinationStation;
            ticket.departureTime = updatedData.departureTime || ticket.departureTime;
            ticket.lastChecked = new Date();
            await ticket.save();
            console.log(`[CRON] Successfully refreshed PNR ${ticket.pnr}`);
          }
          
          // Add a highly important 2-second sleep between API calls so RapidAPI doesn't ban us for QPS limits
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (ticketError) {
          console.error(`[CRON] Failed to refresh individual PNR ${ticket.pnr}:`, ticketError.message);
        }
      }
      
      console.log('[CRON] PNR Refresh Job Completed Successfully.');
    } catch (error) {
      console.error('[CRON] Critical failure in PNR Refresh Job:', error.message);
    }
  });
  
  console.log('[CRON] PNR Updater initialized (Runs twice a day to save API costs).');
};

module.exports = initPnrCron;
