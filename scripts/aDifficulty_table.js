// scripts/aDifficulty_table.js
const DAYS = 3;

const ENDING_SCORE_THRESHOLDS = {
  trueEnd: 60, // min score for true ending
  normalEnd: 20, // min score for normal ending
};

const DIFFICULTY = [
  {
    chore1: {
      roundTimeLimitSec: 20,

      startingFallSpeed: 0.6,
      fallSpeedMultiplier: 1.1,

      badBloodPercent: 0.1,
    },
    chore2: {
      roundTimeLimitSec: 20,
      goatAnimationDurationMs: 800,

      goodSpawnPercent: 50,
      badSpawnPercent: 50,
      badBloodPercent: 0.1,
    },
    chore3: {
      roundTimeLimitSec: 20,

      clothesAnimationSpeed: 1.5,

      stainCount: 3,
      stainFadePerFrame: 6,
      bloodSmugPercent: 0.1,
    },
  },
  {
    chore1: {
      roundTimeLimitSec: 15,

      startingFallSpeed: 0.7,
      fallSpeedMultiplier: 1.5,

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

      clothesAnimationSpeed: 2.5,

      stainCount: 4,
      stainFadePerFrame: 5,
      bloodSmugPercent: 50,
    },
  },
  {
    chore1: {
      roundTimeLimitSec: 10,

      startingFallSpeed: 0.9,
      fallSpeedMultiplier: 2,

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

      clothesAnimationSpeed: 3.5,

      stainCount: 4,
      stainFadePerFrame: 4,
      bloodSmugPercent: 80,
    },
  },
];

const DIALOG_ARROW_POS = {
  textX: 5,
  textY: 46,
  textW: 58,
  textH: 16,
  arrowText: ">",
  arrowBlinkMs: 550,
  arrowColor: [255, 255, 255, 230],
};

window.DIALOG_ARROW_POS = DIALOG_ARROW_POS;
