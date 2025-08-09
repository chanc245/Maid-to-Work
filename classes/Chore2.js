(function () {
  // Paper sorting (drag left for bad, right for good). Goat opens mouth briefly on correct bad drop.
  window.Chore2 = class {
    constructor(shared) {
      this.shared = shared;
      this._isOver = false;
      this._score = 0;
    }

    start(cfg) {
      const W = this.shared.W, H = this.shared.H, pix = this.shared.pix;

      let GOOD_RATE = cfg.goodSpawnPercent;              // %
      let BAD_RATE  = cfg.badSpawnPercent;               // %
      let GOAT_ANIM_MS = cfg.goatAnimationDurationMs;    // ms

      let score = 0;
      let state = "countdown";
      let countdownStartMs = millis();

      const GAME_DURATION_MS = 30 * 1000; // fixed per day by DIFFICULTY? You can add another knob later
      let gameStartMs = 0;

      // goat
      let goatState = "static"; // 'static' | 'open'
      let goatAnimStart = 0;

      // draggable item
      let item = null; // {x,y,w,h, kind:'good'|'bad', img, dragging, offsetX, offsetY}

      function spawnItem() {
        const total = max(1, GOOD_RATE + BAD_RATE);
        const roll = random(0, total);
        const kind = (roll < GOOD_RATE) ? "good" : "bad";
        const img = (kind === "good") ? random(c2GoodImgs) : random(c2BadImgs);
        item = { x: 16, y: 14, w: 30, h: 36, kind, img, dragging:false, offsetX:0, offsetY:0 };
      }

      const inside = (mx,my, r) => (mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h);

      // input routed from manager
      this.handleMousePressed = () => {
        const mx = mouseX / (W*5) * W*5; // scale-agnostic hit test
        const my = mouseY / (H*5) * H*5;

        if (state === "end") { // click-to-restart (keeps flow with other chores)
          state="countdown"; countdownStartMs=millis(); score=0; item=null; goatState="static";
          return;
        }

        if (state !== "playing" || !item) return;
        const sx = mouseX / (width) * W, sy = mouseY / (height) * H;
        if (inside(sx, sy, item)) {
          item.dragging = true;
          item.offsetX = sx - item.x;
          item.offsetY = sy - item.y;
        }
      };

      this.handleMouseDragged = () => {
        if (state !== "playing" || !item || !item.dragging) return;
        const sx = mouseX / (width) * W, sy = mouseY / (height) * H;
        item.x = constrain(sx - item.offsetX, 0, W - item.w);
        item.y = constrain(sy - item.offsetY, 0, H - item.h);

        const centerX = item.x + item.w/2;
        if (item.kind === "bad" && centerX <= 27) goatState = "open";
        else if (goatState !== "open") goatState = "static";
      };

      this.handleMouseReleased = () => {
        if (state !== "playing" || !item || !item.dragging) return;
        item.dragging = false;

        const centerX = item.x + item.w/2;
        let correct = false;
        if (item.kind === "good" && centerX >= 37) { score += 1; correct = true; }
        else if (item.kind === "bad" && centerX <= 27) { score += 1; correct = true; goatState="open"; goatAnimStart=millis(); }
        else { score -= 1; }

        spawnItem();
      };

      const step = () => {
        // bg & goat
        pix.image(bg_chore2_table, 0, 0, 64, 64);
        pix.image(bg_chore_paper, 51, 0, 13, 64);

        if (goatState === "open") {
          pix.image(goat_open, 0, 0, 64, 64);
          if (millis() - goatAnimStart > GOAT_ANIM_MS) goatState = "static";
        } else {
          pix.image(goat_static, 0, 0, 64, 64);
        }

        if (state === "countdown") {
          const remaining = ceil(4 - (millis() - countdownStartMs)/1000);
          drawCountdownShared(pix, 64, 64, remaining > 0 ? remaining : 0, "sort!");
          if (remaining <= 0) { state="playing"; gameStartMs = millis(); spawnItem(); }
          drawHUD(score, 30);
          this._score = score; this._isOver = false; return;
        }

        if (state === "playing") {
          const timeLeft = max(0, 30 - floor((millis()-gameStartMs)/1000));
          if (timeLeft <= 0) { state="end"; }
          if (item) pix.image(item.img, item.x, item.y, item.w, item.h);
          drawHUD(score, timeLeft);
          this._score = score; this._isOver = false; return;
        }

        if (state === "end") {
          pix.fill(0,200); pix.rect(0,0,64,64);
          pix.fill(255); pix.textAlign(LEFT, CENTER);
          pix.textSize(16); pix.text("END", 0, 22);
          pix.textSize(8); pix.text(`Score: ${score}`, 0, 36);
          pix.text("Click to play again", 0, 50);
          pix.textAlign(LEFT, TOP); pix.textSize(8);
          this._score = score; this._isOver = true; return;
        }
      };

      function drawHUD(score, timeLeft) {
        pix.fill(255);
        pix.textAlign(RIGHT, TOP);
        pix.textSize(8);
        pix.text(`${score}`, 2, 2);
        pix.text(`${timeLeft}s`, 2, 10);
      }

      this._step = step;
      this._getScore = () => score;
      this._getState = () => state;
    }

    update(_) {}
    draw(_) { if (this._step) this._step(); }
    isOver() { return this._isOver; }
    getScoreDelta() { return this._score; }
    handleMousePressed() {}
    handleMouseDragged() {}
    handleMouseReleased() {}
    handleKeyPressed(_) {}
  };
})();