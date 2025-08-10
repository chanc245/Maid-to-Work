// classes/EndingTrue.js

(function () {
  const DEFAULTS = {
    sceneRepeatTarget: 2,
    webSize: 25,
    webPadding: 2,
    fadeInSpeed: 12,
    gifDurationMs: 2200,
    dusterSize: 20,
  };

  let ASSETS = {
    path: "assets/chore4_endingTrue",
    bgPng: null,
    bgGifPath: null,
    web: null,
    duster: null,
  };

  window.EndingTrue = class {
    static preload(path) {
      ASSETS.path = path || ASSETS.path;
      ASSETS.bgGifPath = `${ASSETS.path}/bg_end_basementStair_ani.gif`;
      ASSETS.bgPng = loadImage(`${ASSETS.path}/bg_end_basementStair.png`);
      ASSETS.web = loadImage(`${ASSETS.path}/item_web.png`);
      ASSETS.duster = loadImage(`${ASSETS.path}/item_duster.png`);
    }

    constructor(shared) {
      this.shared = shared; // { pix, W, H, SCALE }
      this._isOver = false;

      this.state = "cycle";
      this.cyclesRemaining = DEFAULTS.sceneRepeatTarget;
      this.cfg = { ...DEFAULTS };

      this.webs = []; // {x,y,alive,alpha}
      this.animStartMs = 0;
      this.stairGifEl = null;

      this.usesCustomCursor = true;
    }

    start(cfg = {}) {
      this.cfg = { ...DEFAULTS, ...cfg };
      this.cyclesRemaining = this.cfg.sceneRepeatTarget;
      this._isOver = false;
      this.state = "cycle";

      if (!this.stairGifEl) {
        this.stairGifEl = createImg(ASSETS.bgGifPath, "");
        this.stairGifEl.size(width, height);
        this.stairGifEl.position(0, 0);
        this.stairGifEl.style("pointer-events", "none");
        this.stairGifEl.style("image-rendering", "pixelated");
      }
      this.stairGifEl.hide();

      this._startNewCycle();
    }

    update(dt) {}

    draw() {
      const { pix, W, H, SCALE = 5 } = this.shared;
      pix.clear();

      if (this.state === "cycle") {
        pix.image(ASSETS.bgPng, 0, 0, W, H);

        let anyAlive = false;
        for (const w of this.webs) {
          if (!w.alive) continue;
          anyAlive = true;
          if (w.alpha < 255)
            w.alpha = Math.min(255, w.alpha + this.cfg.fadeInSpeed);
          pix.tint(255, w.alpha);
          pix.image(
            ASSETS.web,
            w.x - this.cfg.webSize / 2,
            w.y - this.cfg.webSize / 2,
            this.cfg.webSize,
            this.cfg.webSize
          );
          pix.noTint();
        }

        if (this.webs.length > 0 && !anyAlive) {
          this.state = "anim";
          this.animStartMs = millis();
          this.stairGifEl.show();
        }
      } else if (this.state === "anim") {
        pix.image(ASSETS.bgPng, 0, 0, W, H);
        if (millis() - this.animStartMs >= this.cfg.gifDurationMs) {
          this.stairGifEl.hide();
          this.cyclesRemaining--;
          if (this.cyclesRemaining > 0) {
            this._startNewCycle();
          } else {
            this.state = "end";
          }
        }
      } else if (this.state === "end") {
        // pix.push();
        // pix.image(ASSETS.bgPng, 0, 0, W, H);
        // pix.fill(0, 200);
        // pix.rect(0, 0, W, H);
        // pix.fill(255);
        // pix.textAlign(CENTER, CENTER);
        // pix.textSize(12);
        // pix.text("TRUE END", W / 2, H / 2 - 6);
        // pix.textSize(8);
        // pix.text("Click to continue", W / 2, H / 2 + 8);
        // pix.textAlign(LEFT, TOP);
        // pix.pop();
      }

      // duster cursor on top
      if (ASSETS.duster) {
        const off = this.cfg.dusterSize * 0.5;
        pix.image(
          ASSETS.duster,
          mouseX / this.shared.SCALE - off,
          mouseY / this.shared.SCALE - off,
          this.cfg.dusterSize,
          this.cfg.dusterSize
        );
      }
    }

    mousePressed() {
      const { W, H } = this.shared;

      if (this.state === "cycle") {
        const sx = (mouseX / width) * W;
        const sy = (mouseY / height) * H;
        const hitR = this.cfg.webSize * 0.5;

        for (const w of this.webs) {
          if (!w.alive) continue;
          const d = dist(sx, sy, w.x, w.y);
          if (d <= hitR) {
            w.alive = false;
            break;
          }
        }
      } else if (this.state === "end") {
        this._isOver = true;
        this.stairGifEl?.hide();
      }
    }
    mouseDragged() {}
    mouseReleased() {}
    keyPressed(k) {}

    isOver() {
      return this._isOver;
    }
    getScoreDelta() {
      return 0;
    }

    _startNewCycle() {
      const { W, H } = this.shared;
      this.state = "cycle";
      this.stairGifEl?.hide();

      const targetCount = randInt(1, 4);
      this.webs = [];

      for (let i = 0; i < targetCount; i++) {
        const pos = this._placeWebNonOverlapping(this.webs, H, 300);
        if (pos) {
          pos.alive = true;
          pos.alpha = 0;
          this.webs.push(pos);
        } else break;
      }
    }

    _placeWebNonOverlapping(existing, yMax, maxAttempts = 300) {
      const half = this.cfg.webSize / 2;
      const minX = half,
        maxX = this.shared.W - half;
      const minY = half,
        maxY = yMax - half;
      const minDist2 = Math.pow(this.cfg.webSize + this.cfg.webPadding, 2);

      for (
        let attempt = 0;
        attempt < Math.floor(maxAttempts * 0.6);
        attempt++
      ) {
        const x = this._biasedEdgeCoord(minX, maxX);
        const y = this._biasedEdgeCoord(minY, maxY);
        if (this._clearHere(x, y, existing, minDist2)) return { x, y };
      }
      for (
        let attempt = 0;
        attempt < Math.floor(maxAttempts * 0.4);
        attempt++
      ) {
        const x = random(minX, maxX);
        const y = random(minY, maxY);
        if (this._clearHere(x, y, existing, minDist2)) return { x, y };
      }
      return null;
    }

    _clearHere(x, y, existing, minDist2) {
      for (const w of existing) {
        const dx = x - w.x,
          dy = y - w.y;
        if (dx * dx + dy * dy < minDist2) return false;
      }
      return true;
    }

    _biasedEdgeCoord(min, max) {
      const mid = (min + max) / 2;
      const pickLower = random() < 0.5;
      if (pickLower) {
        const lowerEnd = lerp(min, mid, 0.6);
        return this._biasedRange(min, lowerEnd, true);
      } else {
        const upperStart = lerp(mid, max, 0.4);
        return this._biasedRange(upperStart, max, false);
      }
    }
    _biasedRange(a, b, towardMin) {
      const t = random(),
        q = t * t;
      return towardMin ? lerp(a, b, q) : lerp(a, b, 1 - q);
    }
  };

  function randInt(minInclusive, maxExclusive) {
    return Math.floor(random(minInclusive, maxExclusive));
  }
})();
