var allMissiles = [];
var projectiles = [];
var explosions = [];
// global variable to track mouse position 
var mousePos, aimPoint;
var bulletState;
const refreshRate = 20;

// targets to protect
var targets = [];
targets.push(new target(100, 30, "grey", 50, 450, "L1"));
targets.push(new target(100, 30, "grey", 200, 450, "L2"));
targets.push(new target(100, 30, "grey", 420, 450, "R1"));
targets.push(new target(100, 30, "grey", 570, 450, "R2"));

// base for gun
var gunbase = new target(40, 40, "#404040", 340, 440, "gunbase");
var turretbase = new turretCircle();
var turret;

function startGame() {
  // initialise canvas 
  playArea.start();
  // track mouse position and store coordinates
  playArea.canvas.addEventListener('mousemove', function(evt) {
    mousePos = getMousePos(playArea.canvas, evt);
  }, false);
  // click to fire projectile
  playArea.canvas.addEventListener('click', function() {
    // size setting set by user
    projectiles.push(new projectile(mousePos.x, mousePos.y, bulletState));
  });
  allMissiles.push(new missile());
  aimPoint = new track();
  turret = new gun();
}

var playArea = {
  canvas: document.createElement("canvas"),
  start: function() {
    this.canvas.width = 720;
    this.canvas.height = 480;
    this.context = this.canvas.getContext("2d");
    this.interval = setInterval(updateGame, refreshRate);
    this.spawner = setInterval(spawnMissiles, 1400);
    document.body.insertBefore(this.canvas, document.body.childNodes[0]); 
  },
  clear: function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

function updateGame() {
  // insert functions here that need to be updated every frame
  playArea.clear();
  checkBulletType();
  targets.forEach(obj => {obj.load();});
  gunbase.load();
  turretbase.draw();
  aimPoint.drawReticle();
  turret.follow();
  allMissiles.forEach(miss => miss.travel());
  explosions.forEach(exp => exp.trigger());
  projectiles.forEach(proj => proj.fire());
}

function spawnMissiles() {
  // missiles to be spawned at specific intervals
  allMissiles.push(new missile());
}

function checkBulletType() {
  // get selected bullet type 
  if (document.getElementById('bulletType_s').checked) {bulletState = "small"}
  else if (document.getElementById('bulletType_m').checked) {bulletState = "medium"}
  else {bulletState = "large"}
}

function target(width, height, color, x, y, id) {
  this.width = width;
  this.height = height;
  this.color = color;
  this.x = x;
  this.y = y;
  this.id = id;
  // Load when game launches 
  this.load = function() {
    ctx = playArea.context;
    ctx.fillStyle = color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

function turretCircle() {
  this.draw = function() {
    ctx = playArea.context;
    ctx.beginPath();
    ctx.arc(360, 440, 20, 0, 2*Math.PI);
    ctx.fillStyle = "#404040";
    ctx.fill(); 
  }
}

function gun() {
  const width = 8;
  const length = 50;
  // draw turret with gun tracking cursor
  this.follow = function() {
    if (mousePos != undefined) {
      let cursorx = mousePos.x;
      let cursory = mousePos.y;
      let diffx = cursorx - 360;
      let diffy = cursory - 440;
      // find angle from origin to cursor 
      let angle = Math.atan(Math.abs(diffy) / Math.abs(diffx));
      
      ctx = playArea.context;
      // translate to position to rotate gun about 
      ctx.save();
      ctx.translate(360, 440);
      // rotate canvas context
      if (diffx < 0) {
        diffy <= 0 ? ctx.rotate(1.5 * Math.PI + angle) : ctx.rotate(1.5 * Math.PI - angle);
      }
      else if (diffx > 0) {
        diffy <= 0 ? ctx.rotate(0.5 * Math.PI - angle) : ctx.rotate(0.5 * Math.PI + angle);
      }
      ctx.fillStyle = "#404040";
      ctx.fillRect(width * -0.5, length * -1, width, length);
      // reset canvas 
      ctx.restore();
    }
  }
}

function missile() {
  // start coordinates which stay constant
  let startx = Math.random() * 720;
  let starty = 0; 
  // destination x coordinate and fall time in ms 
  let destx = Math.random() * 720;
  const falltime = 12000; 
  // velocity values to increment position 
  const velx = ((destx - startx) / (falltime / refreshRate));
  const vely = 1;
  // initialise coordinates to draw line to 
  let endx = startx; 
  let endy = starty;
  // launch missile 
  this.travel = function() {
    if (!checkHit(endx, endy)) {
      endx += velx;
      endy += vely;
      ctx = playArea.context;
      ctx.beginPath();
      ctx.moveTo(startx, starty);
      ctx.lineTo(endx, endy);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffea00";
      ctx.stroke();
    }
    // if hit, remove missile from list 
    else {
      let delIndex = allMissiles.indexOf(this);
      allMissiles.splice(delIndex, 1); 
    }
  }
  // hit detection (projectile explosion, target, canvas border)
  function checkHit(reachedx, reachedy) {
    let check = false;
    // canvas border
    if (reachedx < 0 || reachedx > 720 || reachedy > 480) {
      check = true;
    }
    // targets
    if (reachedy >= 450) {
      targets.forEach(function(targ) {
        if (reachedx >= targ.x && reachedx <= targ.x + targ.width) {
          check = true;
          // remove target by filtering ID string
          var index = targets.findIndex(obj => obj.id ==  targ.id);
          explosions.push(new explosion(reachedx, reachedy, 50))
          targets.splice(index, 1);
        }
      })
    }
    // check explosions
    explosions.forEach(function(exp) {
      // check if distance between missile and explosion is within radius 
      let hdist = reachedx - exp.x; 
      let vdist = reachedy - exp.y;
      let abdist = Math.sqrt(Math.pow(hdist, 2) + Math.pow(vdist, 2));
      if (abdist <= exp.currentRad) {
        check = true;       
      }
    })
    return check;
  }
}

function projectile(x, y, size) {
  // switch between small, med, large bullets 
  const originx = 360;
  const originy = 440;
  const destx = x;
  const desty = y;
  let velx, vely, absvel;
  let currentx = originx;
  let currenty = originy;
  let idealy = originy;
  let explodeRad;
  
  switch(size) {
    case "small":
      absvel = 500 / (1000 / refreshRate);
      explodeRad = 15;
      break;
    case "medium": 
      absvel = 450 / (1000 / refreshRate);
      explodeRad = 22;
      break;
    case "large": 
      absvel = 400 / (1000 / refreshRate);
      explodeRad = 32;
  }
  // find horizontal and vertical velocities
  let diffx = destx - originx; 
  let diffy = desty - originy; 
  let angle = Math.atan(Math.abs(diffy) / Math.abs(diffx)); // in radians 
  velx = absvel * Math.cos(angle);
  vely = absvel * Math.sin(angle); 
  // projectile direction
  if (destx - originx < 0) {
    velx = velx * -1; 
  } 
  if (desty - originy < 0) {
    vely = vely * -1;
  }
  // grav constant to apply 
  let grav = 0.01; 
  
  this.fire = function() {
    if (!checkDet()) {
      // calculate projectile position and draw
      currentx += velx; 
      currenty += vely + grav;
      // check y coordinate if no grav to get detonation point
      idealy += vely;
      // increment velocity change due to grav;
      grav += 0.08; 
      ctx = playArea.context;
      ctx.beginPath();
      ctx.arc(currentx, currenty, 2, 0, 2*Math.PI);
      ctx.fillStyle = "black";
      ctx.fill(); 
    }
    else {
      // destx reached, add explosion and remove this projectile
      explosions.push(new explosion(currentx, currenty, explodeRad)); 
      let index = projectiles.indexOf(this);
      projectiles.splice(index, 1);
    }
  }
  // condition to detonate projectile 
  function checkDet() {
    let check = false;
    // if destination y smaller than origin
    if (desty <= originy && idealy <= desty) {
      // destination x smaller than origin x
      if (destx <= originx) {
        if (currentx <= destx) {check = true;}
      }
      // destination x larger than origin x
      if (destx > originx) {
        if (currentx >= destx) {check = true;}
      }
    }
    else if (desty >= originy && idealy >= desty) {
      if (destx <= originx) {
        if (currentx <= destx) {check = true;}
      }
      if (destx > originx) {
        if (currentx >= destx) {check = true;}
      }
    }
    return check;
  }
}

function explosion(x, y, startRad) {
  this.x = x;
  this.y = y;
  const duration = 900;
  let endRad = startRad * 1.6; 
  this.currentRad = startRad; 
  let radGrow = (endRad - this.currentRad) / (duration / refreshRate); 
  
  this.trigger = function() {
    if (this.currentRad <= endRad) {
      ctx = playArea.context; 
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.currentRad, 0, 2*Math.PI);
      ctx.fillStyle = "#ffb41f";
      ctx.fill();
      // increase explosion size 
      this.currentRad += radGrow; 
    }
    else {
      explosions.shift();
    }
  }
}

function track() {
  // track and draw mouse position
  this.drawReticle = function() {
    if (mousePos != undefined) {
      ctx = playArea.context;
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 5, 0, 2*Math.PI);
      ctx.strokeStyle = "red";
      ctx.stroke();
    }
  }
}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  }
}