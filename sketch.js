// Helpful error hooks
window.addEventListener('error', e => {
  console.error('[window error]', e.message || '(resource failed)', e.filename, e.lineno, e);
});
window.addEventListener('unhandledrejection', e => {
  console.error('[promise rejection]', e.reason);
});

// ===== Shared canvas/buffer =====
let pix, SCALE = 5, W = 64, H = 64;
let pixelFont, bg_frame;

// CHORE 1 assets
let bg_chore1, item_pot;
let c1GoodImgs = [], c1BadImgs = [], c1BloodImgs = [];

// CHORE 2 assets
let bg_chore2_table, bg_chore_paper, goat_static, goat_open;
let c2GoodImgs = [], c2BadImgs = [];

// CHORE 3 assets
let bg_chore3_river, item_smug, item_sponge;
let clothesImgs = [];

function preload() {
  pixelFont = loadFont("assets/fonts/Pixel Millennium.ttf");

  // ===== CHORE 1 =====
  bg_frame  = loadImage("assets/bg_frame.png");
  bg_chore1 = loadImage("assets/chore1/bg_chore1_kitchen.png");
  item_pot  = loadImage("assets/chore1/item_pot.png");

  c1GoodImgs.push(loadImage("assets/chore1/food_good_carrot.png"));
  c1GoodImgs.push(loadImage("assets/chore1/food_good_mushroom.png"));
  c1GoodImgs.push(loadImage("assets/chore1/food_good_potato.png"));
  c1BadImgs.push(loadImage("assets/chore1/food_bad_bananaPeel.png"));
  c1BadImgs.push(loadImage("assets/chore1/food_bad_halfApple.png"));
  c1BadImgs.push(loadImage("assets/chore1/food_bad_fishBone.png"));
  c1BloodImgs.push(loadImage("assets/chore1/food_blood_finger.png"));
  c1BloodImgs.push(loadImage("assets/chore1/food_blood_ear.png"));
  c1BloodImgs.push(loadImage("assets/chore1/food_blood_eyeBall.png"));

  // ===== CHORE 2 =====
  bg_chore2_table = loadImage("assets/chore2/bg_chore2_table.png");
  bg_chore_paper  = loadImage("assets/chore2/bg_chore_paper.png");
  goat_static     = loadImage("assets/chore2/goat_static.png");
  goat_open       = loadImage("assets/chore2/goat_open.png");

  c2GoodImgs.push(loadImage("assets/chore2/paper_good_1.png"));
  c2GoodImgs.push(loadImage("assets/chore2/paper_good_2.png"));
  c2GoodImgs.push(loadImage("assets/chore2/paper_good_3.png"));
  c2BadImgs.push(loadImage("assets/chore2/paper_bad_1.png"));
  c2BadImgs.push(loadImage("assets/chore2/paper_bad_2.png"));
  c2BadImgs.push(loadImage("assets/chore2/paper_bad_3.png"));
  c2BadImgs.push(loadImage("assets/chore2/paper_blood_1.png"));
  c2BadImgs.push(loadImage("assets/chore2/paper_blood_2.png"));
  c2BadImgs.push(loadImage("assets/chore2/paper_blood_3.png"));

  // ===== CHORE 3 =====
  bg_chore3_river = loadImage("assets/chore3/bg_chore3_river.png");
  item_smug       = loadImage("assets/chore3/item_smug.png");
  item_sponge     = loadImage("assets/chore3/item_sponge.png");
  
  clothesImgs.push(loadImage("assets/chore3/clothes_01_blouse.png"));
  clothesImgs.push(loadImage("assets/chore3/clothes_02_dress.png"));
  clothesImgs.push(loadImage("assets/chore3/clothes_03_shirt.png"));
  
}

let manager;

function setup() {
  pixelDensity(1);
  createCanvas(W * SCALE, H * SCALE);
  noSmooth();

  pix = createGraphics(W, H);
  pix.noSmooth();
  pix.imageMode(CORNER);
  pix.textFont(pixelFont);
  pix.textSize(8);
  pix.textAlign(LEFT, TOP);

  const cnv = document.querySelector("canvas");
  if (cnv) cnv.style.imageRendering = "pixelated";

  manager = new GameManager({ pix, W, H });
  manager.start();
}

function draw() {
  pix.clear();
  // optional frame/background
  if (bg_frame) pix.image(bg_frame, 0, 0, 64, 64);

  manager.update();
  manager.draw();

  image(pix, 0, 0, width, height);

  if (window.__debugDraw) { push(); noSmooth(); __debugDraw(this, manager); pop(); }
}

function mousePressed(){ manager.mousePressed(); }
function mouseDragged(){ manager.mouseDragged(); }
function mouseReleased(){ manager.mouseReleased(); }
function keyPressed(){ manager.keyPressed(key); }

