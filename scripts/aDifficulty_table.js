// scripts/aDifficulty_table.js

const DAYS = 3;

const DIFFICULTY = [
  {
    chore1: {
      fallSpeedMultiplier: 1.1,
      bloodItemFrequency: 1,
      maxGoodItemsPerRound: 2,
    },
    chore2: {
      goodSpawnPercent: 60,
      badSpawnPercent: 40,
      goatAnimationDurationMs: 800,
    },
    chore3: { stainCount: 3, stainFadePerFrame: 3, roundTimeLimitSec: 5 },
  },
  {
    chore1: {
      fallSpeedMultiplier: 1.25,
      bloodItemFrequency: 3,
      maxGoodItemsPerRound: 18,
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
      maxGoodItemsPerRound: 16,
    },
    chore2: {
      goodSpawnPercent: 45,
      badSpawnPercent: 55,
      goatAnimationDurationMs: 1000,
    },
    chore3: { stainCount: 5, stainFadePerFrame: 4, roundTimeLimitSec: 26 },
  },
];

// Shared helpers (draw into the provided 64x64 pix buffer)
function drawSharedHUD(pix, day, choreNum, globalScore) {
  pix.fill(255);
  pix.textAlign(LEFT, TOP);
  pix.textSize(8);
  pix.text(`Day ${day}/${DAYS}`, 2, 2);
  pix.text(`Chore ${choreNum}/3`, 2, 10);
  pix.text(`Total: ${globalScore}`, 2, 18);
}

function drawCountdownShared(pix, W, H, step, word) {
  pix.fill(0, 180);
  pix.rect(0, 0, W, H);
  pix.fill(255);
  pix.textAlign(CENTER, CENTER);
  if (step >= 4) {
    pix.textSize(16);
    pix.text(word, W / 2, H / 2);
  } else {
    pix.textSize(32);
    pix.text(`${step}`, W / 2, H / 2);
  }
  pix.textAlign(LEFT, TOP);
  pix.textSize(8);
}
