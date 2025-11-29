import { SmartRunner } from './SmartRunner';

const args = process.argv.slice(2);
const config = {
  specFile: args.find(arg => !arg.startsWith('-')),
  project: args.find(arg => arg.startsWith('--project='))?.split('=')[1],
  headed: args.includes('--headed'),
  debug: args.includes('--debug')
};

const runner = new SmartRunner(config);
runner.run().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
