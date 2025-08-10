// Difficulty across 3 days
const DAYS = 3;

const DIFFICULTY = [
  {
    chore1: {
      fallSpeedMultiplier: 1.1,
      bloodItemFrequency: 1,
      roundTimeLimitSec: 30,
    },
    chore2: {
      goodSpawnPercent: 60,
      badSpawnPercent: 40,
      badBloodPercent: 50,
      goatAnimationDurationMs: 800,
    },
    chore3: {
      stainCount: 3,
      stainFadePerFrame: 3,
      roundTimeLimitSec: 30,
      bloodSmugRate: 0.01,
    },
  },
  {
    chore1: {
      fallSpeedMultiplier: 1.25,
      bloodItemFrequency: 3,
      roundTimeLimitSec: 28, // example harder: less time
    },
    chore2: {
      goodSpawnPercent: 60,
      badSpawnPercent: 40,
      badBloodPercent: 70,
      goatAnimationDurationMs: 800,
    },
    chore3: {
      stainCount: 4,
      stainFadePerFrame: 3.5,
      roundTimeLimitSec: 28,
      bloodSmugRate: 0.22,
    }, // 22%
  },
  {
    chore1: {
      fallSpeedMultiplier: 1.4,
      bloodItemFrequency: 6,
      roundTimeLimitSec: 26, // example harder: less time
    },
    chore2: {
      goodSpawnPercent: 60,
      badSpawnPercent: 40,
      badBloodPercent: 50,
      goatAnimationDurationMs: 800,
    },
    chore3: {
      stainCount: 5,
      stainFadePerFrame: 4,
      roundTimeLimitSec: 26,
      bloodSmugRate: 0.3,
    }, // 30%
  },
];
