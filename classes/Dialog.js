// classes/Dialog.js

(function () {
  // UI geometry (64×64 buffer)
  const UI = {
    // dialog box image (62×20) drawn at (1,43)
    boxImg: null,
    boxPath: "assets/ui/ui_dialogBox.png",
    boxX: 1,
    boxY: 43,
    boxW: 62,
    boxH: 20,

    // inner text region (58×16) at (2,44)
    textX: 4,
    textY: 45,
    textW: 58,
    textH: 16,
  };

  // Behavior knobs
  const DEFAULTS = {
    typewriterCPS: 35, // characters per second
    arrowBlinkMs: 550, // > blink rate
  };

  // Cache CG images: key -> p5.Image (looked up under assets/dialog/<key>.png)
  const CG_CACHE = new Map();

  window.Dialog = class {
    static preload() {
      UI.boxImg = loadImage(UI.boxPath);
    }

    constructor(shared) {
      this.pix = shared.pix;
      this.W = shared.W;
      this.H = shared.H;
      this.SCALE = shared.SCALE ?? 5;
      this.font = shared.font;

      this.cfg = { ...DEFAULTS };

      // data / config for current run
      this.mode = "normal"; // "normal" | "ending"
      this.lines = []; // [{cg?:string, text:string}, ...]
      this.endingCGPath = null;
      this.endingCG = null; // p5.Image (optional, only for ending mode)

      // runtime state
      this.index = 0;
      this.lineStartMs = 0;
      this.revealed = 0; // typewriter revealed char count for current line
      this.finished = false; // all lines consumed
      this._isOver = false; // dialog fully done (and clicked if ending)

      // text wrapping cache
      this._wrapCache = null;
      this._lastText = null;
      this._arrowBlinkAnchor = millis();

      // current CG for the active line
      this.currentCGKey = null;
      this.currentCGImg = null;
    }

    start({ id, mode = "normal" } = {}) {
      this.mode = mode;

      // Pull structured data from global DIALOGS
      const entry = typeof DIALOGS !== "undefined" ? DIALOGS[id] : null;
      if (!entry) {
        console.warn(`[Dialog] Missing DIALOGS entry "${id}"`);
        this.lines = [{ text: "(missing dialog)" }];
        this.endingCGPath = null;
      } else if (Array.isArray(entry)) {
        // Backward-compat: plain array of strings → convert
        this.lines = entry.map((t) => ({ cg: null, text: String(t) }));
        this.endingCGPath = null;
      } else {
        // Object form: { lines: [...], endingCG?: "path" }
        this.lines = (entry.lines || []).map((obj) => {
          if (typeof obj === "string") return { cg: null, text: obj };
          return { cg: obj.cg || null, text: String(obj.text || "") };
        });
        this.endingCGPath = entry.endingCG || null;
      }

      // reset runtime
      this.index = 0;
      this.lineStartMs = millis();
      this.revealed = 0;
      this.finished = false;
      this._isOver = false;
      this._wrapCache = null;
      this._lastText = null;
      this._arrowBlinkAnchor = millis();

      // load ending CG if needed (only for mode "ending")
      this.endingCG = null;
      if (this.mode === "ending") {
        if (entry.endingCG) {
          // Try to load from path; if it fails, fall back to key (if present)
          this.endingCG = loadImage(
            entry.endingCG,
            () => {}, // success noop
            () => {
              if (this.endingCGKey && window[this.endingCGKey]) {
                this.endingCG = window[this.endingCGKey];
              } else {
                console.warn(
                  "[Dialog] endingCG failed to load and no valid endingCGKey fallback."
                );
              }
            }
          );
        } else if (this.endingCGKey && window[this.endingCGKey]) {
          // Directly use preloaded image by key
          this.endingCG = window[this.endingCGKey];
        }
      }
      // set up the first line (including CG)
      this._prepareLineCGAndText();
    }

    update(dt) {
      if (this._isOver) return;

      if (this.finished && this.mode === "normal") {
        // Normal mode: auto-finish when last line is done
        this._isOver = true;
        return;
      }

      // typewriter
      if (!this.finished) {
        const cps = this.cfg.typewriterCPS;
        const elapsed = (millis() - this.lineStartMs) / 1000;
        const target = Math.floor(elapsed * cps);
        const full = this._currentText();
        if (full && this.revealed < full.length) {
          this.revealed = Math.min(full.length, target);
        }
      }
    }

    draw() {
      const p = this.pix;
      p.push();
      p.textFont?.(this.font);
      p.textSize(8);
      p.textAlign(LEFT, TOP);

      // Draw current CG behind the dialog box while lines are active
      if (!this.finished) {
        if (this.currentCGImg && this.currentCGImg.width) {
          p.image(this.currentCGImg, 0, 0, this.W, this.H);
        }
      }

      if (this.finished) {
        // Ending screen if we're in "ending" mode
        if (this.mode === "ending") {
          if (this.endingCG && this.endingCG.width) {
            // Just draw the ending card image, no overlay text
            p.image(this.endingCG, 0, 0, this.W, this.H);
          }
        }
        p.pop();
        return;
      }

      // Dialog box image
      if (UI.boxImg) p.image(UI.boxImg, UI.boxX, UI.boxY, UI.boxW, UI.boxH);

      // Visible (typewriter) text
      const visible = this._visibleText();
      const wrapped = this._wrap(visible, UI.textW);
      let ty = UI.textY;

      p.fill(255);
      for (const ln of wrapped) {
        p.text(ln, UI.textX, ty);
        ty += 8;
        if (ty > UI.textY + UI.textH - 6) break;
      }

      // ▼ continue arrow (blink) when line fully revealed
      const full = this._currentText() || "";
      if (visible.length === full.length && full.length > 0) {
        const t = millis() - this._arrowBlinkAnchor;
        const show = Math.floor(t / this.cfg.arrowBlinkMs) % 2 === 0;
        if (show) {
          p.textAlign(RIGHT, BOTTOM);
          p.text(
            DIALOG_ARROW_POS.arrowText,
            DIALOG_ARROW_POS.textX + DIALOG_ARROW_POS.textW - 2,
            DIALOG_ARROW_POS.textY + DIALOG_ARROW_POS.textH - 1
          );
          p.textAlign(LEFT, TOP);
        }
      }

      p.pop();
    }

    // ---------- input ----------
    mousePressed() {
      if (this._isOver) return;

      if (this.finished && this.mode === "ending") {
        // click to leave ending card
        this._isOver = true;
        return;
      }

      const full = this._currentText() || "";
      const visible = this._visibleText();

      if (visible.length < full.length) {
        // complete current line instantly
        this.revealed = full.length;
      } else {
        // advance to next line
        this.index++;
        if (this.index >= this.lines.length) {
          this.finished = true;
          return;
        }
        this._startLine();
        this._prepareLineCGAndText();
      }
    }

    keyPressed(k) {
      if (k === " " || k === "Enter") this.mousePressed();
    }

    isOver() {
      return this._isOver;
    }

    // ---------- internals ----------
    _currentText() {
      const e = this.lines[this.index];
      return e ? e.text || "" : "";
    }

    _visibleText() {
      const t = this._currentText();
      return t.substring(0, this.revealed);
    }

    _startLine() {
      this.lineStartMs = millis();
      this.revealed = 0;
      this._wrapCache = null;
      this._lastText = null;
      this._arrowBlinkAnchor = millis();
    }

    _prepareLineCGAndText() {
      // Set CG for this line if provided
      const e = this.lines[this.index] || null;
      if (e && e.cg) this._setCurrentCG(e.cg);
      // text typewriter resets handled in _startLine above
    }

    _setCurrentCG(key) {
      this.currentCGKey = key;
      this.currentCGImg = null;
      const path = `assets/dialog/${key}.png`; // <--- CGs now in assets/dialog/
      if (CG_CACHE.has(key)) {
        this.currentCGImg = CG_CACHE.get(key);
      } else {
        const img = loadImage(
          path,
          () => {},
          () => {}
        );
        CG_CACHE.set(key, img);
        this.currentCGImg = img;
      }
    }

    _wrap(text, maxWidth) {
      if (text === this._lastText && this._wrapCache) return this._wrapCache;

      const p = this.pix;
      p.textFont?.(this.font);
      p.textSize(8);

      const words = text.split(/\s+/);
      const out = [];
      let line = "";

      for (let i = 0; i < words.length; i++) {
        const test = line ? line + " " + words[i] : words[i];
        if (p.textWidth(test) <= maxWidth) {
          line = test;
        } else {
          if (line) out.push(line);
          if (p.textWidth(words[i]) > maxWidth) {
            // Very long word: hard break (with pixel fonts, this is rare)
            out.push(words[i]);
            line = "";
          } else {
            line = words[i];
          }
        }
      }
      if (line) out.push(line);

      this._lastText = text;
      this._wrapCache = out;
      return out;
    }
  };
})();
