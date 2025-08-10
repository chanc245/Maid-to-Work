(function () {
  window.Chore1 = class {
    constructor(shared) {
      this.shared = shared;
      this._isOver = false;
      this._score = 0;
      this.usesCustomCursor = false;
    }

    start(cfg) {
      const W = this.shared.W,
        H = this.shared.H,
        pix = this.shared.pix;

      // knobs
      let SPEED_RATE = cfg.fallSpeedMultiplier;
      const SPEED_PERIOD_MS = 10000;
      const BAD_BLOOD_PERCENT = Math.max(
        0,
        Math.min(100, cfg.badBloodPercent ?? 0)
      );
      const ROUND_TIME_LIMIT_SEC = Math.max(
        1,
        Math.floor(cfg.roundTimeLimitSec ?? 30)
      );

      // states
      const STATE_PLAYING = 1,
        STATE_END = 2;
      let state = STATE_PLAYING;
      let score = 0;

      // timer: arm on first frame (so the manager’s countdown doesn’t eat time)
      let timerArmed = false;
      let gameStartMs = 0;

      // player & items
      let player = { w: 20, h: 20, x: 17, y: H - 20, speed: 2.5 };
      let good = {
        x: 24,
        y: -16,
        w: 16,
        h: 16,
        baseVy: 0.3,
        vy: 0.6,
        img: null,
      };
      let bad = { x: 8, y: -16, w: 16, h: 16, baseVy: 0.4, vy: 0.7, img: null };

      // speed
      let speedMult = 1.0;
      let lastSpeedTickMs = millis();

      const randInt = (min, maxExclusive) => floor(random(min, maxExclusive));
      const aabbHit = (a, b) =>
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y;

      function pickNonOverlappingX(w, otherX) {
        let x,
          tries = 0;
        do {
          x = randInt(0, W - w);
          tries++;
          if (tries > 50) {
            x = otherX < (W - w) / 2 ? W - w : 0;
            break;
          }
        } while (abs(x - otherX) < w);
        return x;
      }

      function chooseBadSprite() {
        const pBlood = BAD_BLOOD_PERCENT / 100;
        return random() < pBlood ? random(c1BloodImgs) : random(c1BadImgs);
      }

      function resetGood() {
        good.x = pickNonOverlappingX(good.w, bad.x);
        good.y = -good.h;
        good.img = random(c1GoodImgs);
        good.vy = good.baseVy * speedMult;
      }
      function resetBad() {
        bad.x = pickNonOverlappingX(bad.w, good.x);
        bad.y = -bad.h;
        bad.img = chooseBadSprite();
        bad.vy = bad.baseVy * speedMult;
      }

      function updateSpeed(dtMs) {
        if (SPEED_RATE === 1.0) return;
        const factor = Math.pow(SPEED_RATE, dtMs / SPEED_PERIOD_MS);
        speedMult *= factor;
        good.vy = good.baseVy * speedMult;
        bad.vy = bad.baseVy * speedMult;
      }

      function drawWorld() {
        pix.image(bg_chore1, 0, 0, 64, 64);

        // paddle by mouse
        player.x = floor(
          constrain((mouseX / width) * W - player.w / 2, 0, W - player.w)
        );
        pix.image(item_pot, player.x, player.y, player.w, player.h);

        // items
        pix.image(
          good.img,
          floor(constrain(good.x, 0, W - good.w)),
          floor(good.y),
          good.w,
          good.h
        );
        pix.image(
          bad.img,
          floor(constrain(bad.x, 0, W - bad.w)),
          floor(bad.y),
          bad.w,
          bad.h
        );
      }

      function drawHUD(timeLeftSec) {
        pix.push();
        pix.fill(255);
        pix.textAlign(LEFT, TOP);
        pix.textSize(8);
        pix.text(`food: ${score}`, 17, 2);
        pix.text(`time: ${timeLeftSec}s`, 17, 10);
        pix.pop();
      }

      // initial spawn
      resetGood();
      resetBad();

      this._step = () => {
        // Arm timer the first time we actually render the chore (i.e., after manager countdown)
        if (!timerArmed) {
          timerArmed = true;
          gameStartMs = millis();
          lastSpeedTickMs = gameStartMs; // keep speed progression consistent
        }

        // compute HUD time-left
        const elapsedSec = floor((millis() - gameStartMs) / 1000);
        const timeLeft = max(0, ROUND_TIME_LIMIT_SEC - elapsedSec);

        if (state === STATE_PLAYING) {
          // end only when time runs out
          if (timeLeft <= 0) {
            state = STATE_END;
          } else {
            // speed progression
            const now = millis();
            const dtMs = now - lastSpeedTickMs;
            lastSpeedTickMs = now;
            updateSpeed(dtMs);

            // advance
            good.y += good.vy;
            bad.y += bad.vy;

            // bottom edge handling
            if (good.y >= H - good.h) {
              good.y = H - good.h;
              score -= 1; // missed good: -1
              resetGood();
            }
            if (bad.y >= H - bad.h) {
              bad.y = H - bad.h;
              resetBad(); // missed bad: no score change
            }

            // collisions
            if (aabbHit(good, player)) {
              score += 1; // caught good: +1
              resetGood();
            }
            if (aabbHit(bad, player)) {
              score -= 1; // caught bad/blood: -1
              resetBad();
            }
          }

          drawWorld();
          drawHUD(timeLeft);
          this._score = score;
          this._isOver = state === STATE_END;
          return;
        }

        if (state === STATE_END) {
          drawWorld();
          drawHUD(0);
          this._score = score;
          this._isOver = true;
        }
      };

      // (optional) soft reset if you ever click inside the chore after end
      this.handleMousePressed = () => {
        if (state === STATE_END) {
          score = 0;
          speedMult = 1.0;
          timerArmed = false; // will re-arm on first frame again
          // manager will usually start a new chore instance instead
        }
      };
    }

    update(_) {}
    draw(_) {
      if (this._step) this._step();
    }
    isOver() {
      return this._isOver;
    }
    getScoreDelta() {
      return this._score;
    }
    handleMousePressed() {}
    handleMouseDragged() {}
    handleMouseReleased() {}
    handleKeyPressed(_) {}
  };
})();
