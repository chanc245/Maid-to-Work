// Difficulty across 3 days
const DAYS = 3;

const DIFFICULTY = [
  {
    chore1: {
      fallSpeedMultiplier: 1.1,
      bloodItemFrequency: 1,
      roundTimeLimitSec: 30, // NEW: time-only end condition
    },
    chore2: {
      goodSpawnPercent: 60,
      badSpawnPercent: 40,
      goatAnimationDurationMs: 800,
    },
    chore3: { stainCount: 3, stainFadePerFrame: 3, roundTimeLimitSec: 30 },
  },
  {
    chore1: {
      fallSpeedMultiplier: 1.25,
      bloodItemFrequency: 3,
      roundTimeLimitSec: 28, // example harder: less time
    },
    chore2: {
      goodSpawnPercent: 50,
      badSpawnPercent: 50,
      goatAnimationDurationMs: 900,
    },
    chore3: { stainCount: 4, stainFadePerFrame: 3.5, roundTimeLimitSec: 28 },
  },
  {
    chore1: {
      fallSpeedMultiplier: 1.4,
      bloodItemFrequency: 6,
      roundTimeLimitSec: 26, // example harder: less time
    },
    chore2: {
      goodSpawnPercent: 45,
      badSpawnPercent: 55,
      goatAnimationDurationMs: 1000,
    },
    chore3: { stainCount: 5, stainFadePerFrame: 4, roundTimeLimitSec: 26 },
  },
];
