// ===== Manager =====
class GameManager {
  constructor(shared) {
    this.pix = shared.pix;
    this.W = shared.W;
    this.H = shared.H;

    this.day = 0; // 0..DAYS-1
    this.choreIndex = 0; // 0..2
    this.globalScore = 0;

    this.state = "DAY_INTRO"; // DAY_INTRO, COUNTDOWN, PLAYING, GAME_END
    this.countdownMs = 4000;
    this.countdownStart = 0;

    this.lastTick = millis();

    this.chores = [
      new Chore1({ pix: this.pix, W: this.W, H: this.H }),
      new Chore2({ pix: this.pix, W: this.W, H: this.H }),
      new Chore3({ pix: this.pix, W: this.W, H: this.H }),
    ];
    this.activeChore = null;
  }

  start() {
    this.startChore();
  }

  startChore() {
    const cfg = DIFFICULTY[this.day][`chore${this.choreIndex + 1}`];
    this.activeChore = this.chores[this.choreIndex];
    this.activeChore.start(cfg);
    this.state = "COUNTDOWN";
    this.countdownStart = millis();
  }

  update() {
    const now = millis(),
      dt = now - this.lastTick;
    this.lastTick = now;

    if (this.state === "COUNTDOWN") {
      if (now - this.countdownStart >= this.countdownMs) this.state = "PLAYING";
      return;
    }

    if (this.state === "PLAYING") {
      this.activeChore.update(dt);
      if (this.activeChore.isOver()) {
        this.globalScore += this.activeChore.getScoreDelta();
        this.advance();
      }
    }
  }

  advance() {
    this.choreIndex++;
    if (this.choreIndex >= 3) {
      this.choreIndex = 0;
      this.day++;
      if (this.day >= DAYS) {
        this.state = "GAME_END";
        return;
      }
    }
    this.startChore();
  }

  draw() {
    if (this.state === "COUNTDOWN") {
      const left = Math.ceil(
        (this.countdownMs - (millis() - this.countdownStart)) / 1000
      );
      const step = Math.max(0, left);
      const label = ["catch!", "sort!", "scrub!"][this.choreIndex];
      drawCountdownShared(this.pix, this.W, this.H, step, label);
    } else if (this.state === "PLAYING") {
      this.activeChore.draw(this.pix);
    } else if (this.state === "GAME_END") {
      this.drawEnding();
    }

    drawSharedHUD(
      this.pix,
      this.day + 1,
      this.choreIndex + 1,
      this.globalScore
    );
  }

  drawEnding() {
    const s = this.globalScore;
    let ending = "Bad Ending";
    if (s >= 45) ending = "Golden Ending";
    else if (s >= 30) ending = "Good Ending";
    else if (s >= 15) ending = "Neutral Ending";

    this.pix.fill(0, 200);
    this.pix.rect(0, 0, this.W, this.H);
    this.pix.fill(255);
    this.pix.textSize(12);
    this.pix.text(`END: ${ending}`, 4, 24);
    this.pix.textSize(8);
    this.pix.text(`Score: ${s}`, 4, 38);
    this.pix.text(`Press R to restart`, 4, 50);
  }

  mousePressed() {
    this.activeChore?.handleMousePressed?.();
  }
  mouseDragged() {
    this.activeChore?.handleMouseDragged?.();
  }
  mouseReleased() {
    this.activeChore?.handleMouseReleased?.();
  }
  keyPressed(k) {
    if (this.state === "GAME_END" && (k === "r" || k === "R")) {
      this.day = 0;
      this.choreIndex = 0;
      this.globalScore = 0;
      this.state = "DAY_INTRO";
      this.startChore();
      return;
    }
    this.activeChore?.handleKeyPressed?.(k);
  }
}
