// scripts/aDifficulty_table.js
const DAYS = 3;

const ENDING_SCORE_THRESHOLDS = {
  trueEnd: 100, // min score for true ending
  normalEnd: 50, // min score for normal ending
};

const DIFFICULTY = [
  {
    chore1: {
      roundTimeLimitSec: 20,

      fallSpeedMultiplier: 1.1,
      badBloodPercent: 1, // % of BAD that are blood
    },
    chore2: {
      roundTimeLimitSec: 20,
      goatAnimationDurationMs: 800,

      goodSpawnPercent: 50, // % of all spawns that are GOOD
      badSpawnPercent: 50, // % of all spawns that are BAD
      badBloodPercent: 1, // % of BAD that are blood
    },
    chore3: {
      roundTimeLimitSec: 20,

      stainCount: 3,
      stainFadePerFrame: 6,
      bloodSmugPercent: 1,
    },
  },
  {
    chore1: {
      roundTimeLimitSec: 15,

      fallSpeedMultiplier: 1.25,
      badBloodPercent: 15,
    },
    chore2: {
      roundTimeLimitSec: 15,
      goatAnimationDurationMs: 800,

      goodSpawnPercent: 50,
      badSpawnPercent: 50,
      badBloodPercent: 30,
    },
    chore3: {
      roundTimeLimitSec: 15,

      stainCount: 4,
      stainFadePerFrame: 5,
      bloodSmugPercent: 50,
    },
  },
  {
    chore1: {
      roundTimeLimitSec: 10,

      fallSpeedMultiplier: 1.4,
      badBloodPercent: 80,
    },
    chore2: {
      roundTimeLimitSec: 10,
      goatAnimationDurationMs: 800,

      goodSpawnPercent: 30,
      badSpawnPercent: 60,
      badBloodPercent: 80,
    },
    chore3: {
      roundTimeLimitSec: 10,

      stainCount: 4,
      stainFadePerFrame: 4,
      bloodSmugPercent: 80,
    },
  },
];
