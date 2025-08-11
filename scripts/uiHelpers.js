// scripts/uiHelpers.js
// Shared UI helpers drawn into the 64x64 pix buffer.

// Draw the full-screen day reminder card.
// Strongly isolated overlay. Call as: drawDayReminder(pix, dayNum, dayTime, totalScore)
function drawDayReminder(pix, dayNum, dayTime, totalScore) {
  pix.push();
  pix.resetMatrix();
  pix.noStroke();
  pix.noTint();

  // backdrop
  pix.fill(200, 200, 200, 200);
  pix.rect(0, 0, 64, 64);

  // text
  pix.fill(230);
  pix.textAlign(LEFT, TOP);
  pix.textSize(16);

  pix.textAlign(CENTER);
  pix.text(`DAY ${dayNum}`, 32, 1);
  pix.text(`${dayTime}`, 32, 14);
  pix.textSize(8);
  pix.text(`chore: 1/3`, 31.5, 32);

  pix.textAlign(LEFT);
  pix.text(`TOTAL SCORE:${totalScore}`, 3, 54);

  pix.pop();
}

// Simple day-to-day animation (DAY A rises out, DAY B rises in)
class DayChangeAnim {
  constructor(pix) {
    this.pix = pix;
    this.reset(1, 2);
  }

  reset(fromDay, toDay) {
    this.fromDay = fromDay;
    this.toDay = toDay;
    this.active = false;
    this.phase = "rise";
    this.holdTimer = 0;

    // positions
    this.day1 = { x: 32, y: 32, vy: -0.9, size: 16 }; // leaving (DAY A)
    this.day2 = { x: 32, y: 64 + 20, vy: -0.6, size: 16 }; // entering (DAY B)
  }

  play(fromDay, toDay) {
    this.reset(fromDay, toDay);
    this.active = true;
  }

  update() {
    if (!this.active) return;
    const centerY = 32;

    if (this.phase === "rise") {
      this.day1.y += this.day1.vy;
      this.day2.y += this.day2.vy;

      if (this.day2.y <= centerY) {
        this.day2.y = Math.round(centerY);
        this.holdTimer = 36; // ~0.6s at 60fps
        this.phase = "hold";
      }
    } else if (this.phase === "hold") {
      this.day1.y += this.day1.vy; // keep moving out
      this.holdTimer--;
      if (this.holdTimer <= 0) {
        this.active = false; // end animation
      }
    }
  }

  // Draws into the low-res buffer. Call every frame while animating.
  // Optional: pass a bg frame image to lay under the text.
  draw(bgFrameImg = null) {
    const p = this.pix;

    p.push(); // <<< sandbox everything in here
    p.resetMatrix();
    p.noTint();

    // background
    p.background(200);
    if (bgFrameImg) p.image(bgFrameImg, 0, 0, 64, 64);

    // center-aligned text only within this scope
    p.textAlign(CENTER, CENTER);

    // DAY A (from)
    p.push();
    p.noStroke();
    p.fill(0);
    p.textSize(this.day1.size);
    p.text(
      `DAY ${this.fromDay}`,
      Math.round(this.day1.x),
      Math.round(this.day1.y)
    );
    p.pop();

    // DAY B (to)
    p.push();
    p.noStroke();
    p.fill(0);
    p.textSize(this.day2.size);
    p.text(
      `DAY ${this.toDay}`,
      Math.round(this.day2.x),
      Math.round(this.day2.y)
    );
    p.pop();

    p.pop(); // <<< restore all state
  }

  isDone() {
    return !this.active;
  }
}
