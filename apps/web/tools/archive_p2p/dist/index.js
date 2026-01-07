import { createServiceLogger } from './utils/logger.js';
import { DetectorService } from './services/detector.js';
import { ExecutorService } from './services/executor.js';
import { db } from './db/client.js';
const logger = createServiceLogger('main');
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'help';
    logger.info('========================================');
    logger.info('P2P AUTOMATION SYSTEM');
    logger.info('========================================');
    // Check database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
        logger.error('Database connection failed!');
        process.exit(1);
    }
    logger.info('Database connection OK');
    switch (mode) {
        case 'detector':
            logger.info('Starting in DETECTOR mode');
            const detector = new DetectorService();
            await detector.start();
            break;
        case 'executor':
            logger.info('Starting in EXECUTOR mode');
            const executor = new ExecutorService();
            await executor.start();
            break;
        case 'both':
            logger.info('Starting BOTH services (not recommended - use separate processes)');
            logger.warn('Running both services in same process may cause issues');
            const det = new DetectorService();
            const exec = new ExecutorService();
            // Run both (they each have their own browser)
            await Promise.all([
                det.start(),
                exec.start(),
            ]);
            break;
        case 'help':
        default:
            console.log(`
P2P Automation System

Usage: node dist/index.js <mode>

Modes:
  detector  - Start Binance order detection service
  executor  - Start MercadoPago transfer execution service
  both      - Start both services (not recommended)

Examples:
  node dist/index.js detector
  node dist/index.js executor

For production, run as separate systemd services:
  systemctl start p2p-detector
  systemctl start p2p-executor
      `);
            break;
    }
}
main().catch(error => {
    logger.error(`Fatal error: ${error}`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map