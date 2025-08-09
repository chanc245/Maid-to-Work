window.__debugDraw = function(p, mgr){
  p.fill(0, 180); p.rect(0, 0, 140, 28);
  p.fill(255); p.textSize(10);
  p.text(`Day ${mgr.day+1}  Chore ${mgr.choreIndex+1}  Score ${mgr.globalScore}`, 6, 18);
};