import { Config } from '@remotion/cli/config';

// Increase timeout for root component loading (default is 30s)
// This helps in CI environments where bundling/booting might be slow
// Setting to 2 minutes to be safe against slow network/resource contention
Config.setDelayRenderTimeoutInMilliseconds(120000);

// Optimize for stability over speed in CI
Config.setConcurrency(1);

// Ensure we use the right pixel format for compatibility
Config.setPixelFormat('yuv420p');