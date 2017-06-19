var initialtime = 60;
var timeleft = 60;
var score = 0;


function Level(plan) {
  this.width = plan[0].length;
  this.height = plan.length;
  //grid array holds the plan - 2d array
  this.grid = [];
  //actors array is an array of objects that stores the current position and state of ONLY the dynamically changing elements (called actors)
  this.actors = [];

  for (var y = 0; y < this.height; y++) {
    var line = plan[y], gridLine = [];
    for (var x = 0; x < this.width; x++) {
      var ch = line[x], fieldType = null;
      var Actor = actorChars[ch];
      if (Actor)
        this.actors.push(new Actor(new Vector(x, y), ch));
      else if (ch == "x")
        fieldType = "wall";
      gridLine.push(fieldType);
    }
    this.grid.push(gridLine);
  }

  //find the actor that is the player and store it as the level property
  this.player = this.actors.filter(function(actor) {
    return actor.type == "player";
  })[0];
  //to check whether the player has won or lost
  //finishDelay is used to keep the level active for a short period of time so that a simple animation can be shown.
  this.status = null;
  this.finishDelay = null;
}


//tells the status whether the player has finished the level
  Level.prototype.isFinished = function() {
    return this.status != null && this.finishDelay < 0;
  };

//to maintain the position
function Vector(x, y) {
  this.x = x; this.y = y;
}
Vector.prototype.plus = function(other) {
  return new Vector(this.x + other.x, this.y + other.y);
};
Vector.prototype.times = function(factor) {
  return new Vector(this.x * factor, this.y * factor);
};


//a legend for the level map
var actorChars = {
  "@": Player,
  "o": Coin,
  "0": Portal
};



//to create a constructor for player
function Player(pos) {
  this.pos = pos.plus(new Vector(0, -0.5));
  this.size = new Vector(0.9, 0.9);
  this.speed = new Vector(0, 0);
}
Player.prototype.type = "player";


//to create constructor for coin
//wobble is to give the coins a wobbling effect
function Coin(pos) {
  this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
  this.size = new Vector(0.6, 0.6);
  this.wobble = Math.random() * Math.PI * 2;
}
Coin.prototype.type = "coin";


//constructor for portal
function Portal(pos) {
  this.pos = pos;
  this.size = new Vector(1.5, 1.5);
}
Portal.prototype.type = "portal";

var scale = 45;

//to draw the elements

//whether a rectangle (specified by a position and a size) overlaps with any nonempty space on the background grid
Level.prototype.obstacleAt = function(pos, size) {
  var xStart = Math.floor(pos.x);
  var xEnd = Math.ceil(pos.x + size.x);
  var yStart = Math.floor(pos.y);
  var yEnd = Math.ceil(pos.y + size.y);

  if (xStart < 0 || xEnd > this.width || yStart < 0)
    return "wall";
  if (yEnd > this.height)
    return "wall"
  // we loop over the block of grid squares found by rounding the coordinates and return the content of the first nonempty square we find.
  for (var y = yStart; y < yEnd; y++) {
    for (var x = xStart; x < xEnd; x++) {
      var fieldType = this.grid[y][x];
      if (fieldType) return fieldType;
    }
  }
};



//This method scans the array of actors, looking for an actor that overlaps the one given as an argument
Level.prototype.actorAt = function(actor) {
  for (var i = 0; i < this.actors.length; i++) {
    var other = this.actors[i];
    if (other != actor &&
        actor.pos.x + actor.size.x > other.pos.x &&
        actor.pos.x < other.pos.x + other.size.x &&
        actor.pos.y + actor.size.y > other.pos.y &&
        actor.pos.y < other.pos.y + other.size.y)
      return other;
  }
};



//gives all actors in the level a chance to move.
//Its step argument is the time step in seconds. 
//The keys object contains information about the arrow keys the player has pressed.
var maxStep = 0.05;

Level.prototype.animate = function(step, keys) {
  if (this.status != null)
    this.finishDelay -= step;

  while (step > 0) {
    var thisStep = Math.min(step, maxStep);
    this.actors.forEach(function(actor) {
      actor.act(thisStep, this, keys);
    }, this);
    step -= thisStep;
  }
};


//coin
var wobbleSpeed = 8, wobbleDist = 0.07;

Coin.prototype.act = function(step) {
  this.wobble += step * wobbleSpeed;
  var wobblePos = Math.sin(this.wobble) * wobbleDist;
  this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

//portal
Portal.prototype.act = function(step) {
};

//player x
var playerXSpeed = 7;

Player.prototype.moveX = function(step, level, keys) {
  this.speed.x = 0;
  //if(keys.up || keys.down) return;
  if (keys.left) this.speed.x -= playerXSpeed;
  if (keys.right) this.speed.x += playerXSpeed;

  var motion = new Vector(this.speed.x * step, 0);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle)
    level.playerTouched(obstacle);
  else
    this.pos = newPos;
};

//player y
var playerYSpeed = 7;
Player.prototype.moveY = function(step, level, keys) {
  this.speed.y = 0;
  //if(keys.left || keys.right) return;
  if(keys.up)
    this.speed.y -= playerYSpeed;
  if(keys.down)
    this.speed.y += playerXSpeed;
  var motion = new Vector(0,this.speed.y * step);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle)
    level.playerTouched(obstacle);
  else
    this.pos = newPos;
};

//player act
Player.prototype.act = function(step, level, keys) {
  this.moveX(step, level, keys);
  this.moveY(step, level, keys);

  var otherActor = level.actorAt(this);
  if (otherActor)
    level.playerTouched(otherActor.type, otherActor);

  // Losing animation
  if (level.status == "lost") {
    this.pos.y += step;
    this.size.y -= step;
  }
};


//And here is the method that handles collisions between the player and other objects
Level.prototype.playerTouched = function(type, actor) {
  if (type == "coin") {
    score += 1;
    this.actors = this.actors.filter(function(other) {
      return other != actor;
    });
  }
  else if (type == "portal"){
    this.actors = this.actors.filter(function(other){
      if(other.type !== "player"){
        return other;
      }
    });
    this.status = "won";
    this.finishDelay = 1;
  }
};


//keys
var arrowCodes = {37: "left", 38: "up", 39: "right", 40: "down"};

function trackKeys(codes) {
  var pressed = Object.create(null);
  function handler(event) {
    if (codes.hasOwnProperty(event.keyCode)) {
      var down = event.type == "keydown";
      pressed[codes[event.keyCode]] = down;
      event.preventDefault();
    }
  }
  addEventListener("keydown", handler);
  addEventListener("keyup", handler);
  return pressed;
}

function runAnimation(frameFunc) {
  var lastTime = null;
  function frame(time) {
    var stop = false;
    if (lastTime != null) {
      var timeStep = Math.min(time - lastTime, 100) / 1000;
      stop = frameFunc(timeStep) === false;
    }
    lastTime = time;
    if (!stop)
      requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}


//running a level
var arrows = trackKeys(arrowCodes);

//var timediv = document.getElementById("time");


function runLevel(level, Display, andThen) {
  var display = new Display(document.getElementById("game"), level);
  timeleft = 60;
  

  runAnimation(function(step) {
    timeleft -= step;
    console.log(timeleft);
    if(display.animationTime > initialtime && display.level.status == null){
    display.level.status = "lost";
    display.level.finishDelay = 1;
  }
    
    level.animate(step, arrows);
    display.drawFrame(step);
    if (level.isFinished()) {
      display.clear();
      if (andThen)
        andThen(level.status);
      return false;
    }
  });
}


//game is a set of levels
function runGame(plans, Display) {
  function startLevel(n) {
    document.getElementById("status").innerHTML = "Level :" + (n+1);
    runLevel(new Level(plans[n]), Display, function(status) {
      if (status == "lost")
        startLevel(n);
      else if (n < plans.length - 1)
        startLevel(n + 1);
      else{
        document.getElementById("status").innerHTML = "You win!";
        document.getElementById("bgsound").src = "";
        console.log("You win!");
      }
    });
  }
  startLevel(0);
}


function CanvasDisplay(parent, level) {
  this.canvas = document.createElement("canvas");
  this.canvas.width = Math.min(600, level.width * scale);
  this.canvas.height = Math.min(450, level.height * scale);
  parent.appendChild(this.canvas);
  this.cx = this.canvas.getContext("2d");

  this.level = level;
  this.animationTime = 0;
  this.flipPlayer = false;

  this.viewport = {
    left: 0,
    top: 0,
    width: this.canvas.width / scale,
    height: this.canvas.height / scale
  };

  this.drawFrame(0);
}

CanvasDisplay.prototype.clear = function() {
  this.canvas.parentNode.removeChild(this.canvas);
};

CanvasDisplay.prototype.drawFrame = function(step) {
  this.animationTime += step;
  this.updateViewport();
  this.clearDisplay();
  this.drawBackground();
  this.drawActors();
};


CanvasDisplay.prototype.updateViewport = function() {
  var view = this.viewport, margin = view.width / 3;
  var player = this.level.player;
  var center = player.pos.plus(player.size.times(0.5));

  if (center.x < view.left + margin)
    view.left = Math.max(center.x - margin, 0);
  else if (center.x > view.left + view.width - margin)
    view.left = Math.min(center.x + margin - view.width,this.level.width - view.width);
  if (center.y < view.top + margin)
    view.top = Math.max(center.y - margin, 0);
  else if (center.y > view.top + view.height - margin)
    view.top = Math.min(center.y + margin - view.height,this.level.height - view.height);
};

CanvasDisplay.prototype.clearDisplay = function() {
  if (this.level.status == "won")
    this.cx.fillStyle = "#131521";
  else if (this.level.status == "lost")
    this.cx.fillStyle = "#6E1C1C";
  else
    this.cx.fillStyle = "#222222";
  this.cx.fillRect(0, 0, this.canvas.width, this.canvas.height);
};


CanvasDisplay.prototype.updateViewport = function() {
  var view = this.viewport, margin = view.width / 3;
  var player = this.level.player;
  var center = player.pos.plus(player.size.times(0.5));

  if (center.x < view.left + margin)
    view.left = Math.max(center.x - margin, 0);
  else if (center.x > view.left + view.width - margin)
    view.left = Math.min(center.x + margin - view.width,this.level.width - view.width);
  if (center.y < view.top + margin)
    view.top = Math.max(center.y - margin, 0);
  else if (center.y > view.top + view.height - margin)
    view.top = Math.min(center.y + margin - view.height,this.level.height - view.height);
};


CanvasDisplay.prototype.drawBackground = function() {
  var view = this.viewport;
  var xStart = Math.floor(view.left);
  var xEnd = Math.ceil(view.left + view.width);
  var yStart = Math.floor(view.top);
  var yEnd = Math.ceil(view.top + view.height);

  for (var y = yStart; y < yEnd; y++) {
    for (var x = xStart; x < xEnd; x++) {
      var tile = this.level.grid[y][x];
      if (tile == null) continue;
      var screenX = (x - view.left) * scale;
      var screenY = (y - view.top) * scale;
      if (tile == "wall"){
        this.cx.fillStyle = "#c0c0c0";
        this.cx.strokeStyle = "000";
        this.cx.fillRect(screenX, screenY, scale, scale);
        this.cx.strokeRect(screenX, screenY, scale, scale);
      }
    }
  }
};

CanvasDisplay.prototype.drawPlayer = function(x, y, width, height) {
  var ball=this.cx.createRadialGradient(5,5,50,5,5,0);
    ball.addColorStop(1,"red");
    ball.addColorStop(0,"white");

  this.cx.beginPath();
  this.cx.arc(x+width/2, y+height/2, (height + width)/4, 0, 2 * Math.PI);
  this.cx.fillStyle = ball;
  this.cx.lineWidth = 4;
  this.cx.strokeStyle = '#000000';
  this.cx.stroke();
  this.cx.fill(); 
 
};


CanvasDisplay.prototype.drawActors = function() {
  this.level.actors.forEach(function(actor) {
    var width = actor.size.x * scale;
    var height = actor.size.y * scale;
    var x = (actor.pos.x - this.viewport.left) * scale;
    var y = (actor.pos.y - this.viewport.top) * scale;

    var lavacolor = this.cx.createLinearGradient(0, 0, 0, 170);
    lavacolor.addColorStop(0, "yellow");
    lavacolor.addColorStop(1, "red");

    var grd=this.cx.createRadialGradient(20,20,50,20,20,0);
    grd.addColorStop(1,"black");
    grd.addColorStop(0,"blue");


    if (actor.type == "player") {
      this.drawPlayer(x, y, width, height);
    }
    else if (actor.type == "coin"){
      this.cx.beginPath();
      this.cx.arc(x+width/2, y+height/2, width/2, 0, 2 * Math.PI);
      this.cx.fillStyle = '#ffcc00';
      this.cx.lineWidth = 4;
      this.cx.strokeStyle = '#000000';
      this.cx.stroke();
      this.cx.fill();
    }
    else if (actor.type == "portal"){
      this.cx.beginPath();
      this.cx.arc(x+width/2, y, width/2, 0, 2 * Math.PI);
      this.cx.fillStyle = grd;
      this.cx.lineWidth = 4;
      this.cx.strokeStyle = '#000000';
      this.cx.stroke();
      this.cx.fill();
    }
  }, this);
};


var GAME_LEVELS = [];
GAME_LEVELS[0] = [
  "  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ",
  "  x                                                                               x  ",
  "  x                                                                               x  ",
  "  x                                                                               x  ",
  "  x                                                                               x  ",
  "  x                                                                               x  ",
  "  x                                                                               x  ",
  "  x                                                                               x  ",
  "  x                                                                               x  ",
  "  x                                            xxxxxxx                            x  ",
  "  x                          xxxxx             x oo  x                            x  ",
  "  x                          xxvxx             x     x  xxxxxxxxxxxx              x  ",
  "  x                xxxx                         x    x                            x  ",
  "  x                   x                         x    x                            x  ",
  "  x         o o       x o                       x    x                            x  ",
  "    @    xxxxx      x o                         x    x                            x  ",
  "  xxxxx      x      o x o                            o x                          x  ",
  "  xo         x     xxxxxx ooooooooo        o  o  o  xxxx  oo o o o           oo0  x  ",
  "  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ",
  "                                                                                     "
];
GAME_LEVELS[1] = [
  "  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ",
  "  x                                                                               x  ",
  "  x                                                                               x  ",
  "  x   xx                                                                          x  ",
  "  xo   x                                                                          x  ",
  "  xo   x                                                                          x  ",
  "  xo   x                                                                          x  ",
  "  x    x     xxxxxxxx                                                             x  ",
  "  x    x     x                                                                    x  ",
  "  x    x     x      x                          xxxxxxx                            x  ",
  "  x    x xxxxx      x        xxxxx             x oo  x                            x  ",
  "  x    x x         xx        xxvxx             x     x  xxxxxxxxxxxx              x  ",
  "  x    x x         xxxx                         x    x                            x  ",
  "  xxxxxx x            x                         x    x                            x  ",
  "  x      x  o o       x o                       x    x                            x  ",
  "    @    xxxxx      x o                         x    x                            x  ",
  "  xxxxx      x      o x o                            o x                          x  ",
  "  xo         x     xxxxxx ooooooooo        o  o  o  xxxx  oo o o o           oo0  x  ",
  "  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ",
  "                                                                                     "
];

runGame(GAME_LEVELS, CanvasDisplay);

function TimeScoreDisplay(){
  document.getElementById("time").innerHTML = "Score :" + score + "<br>Time Left :" + Math.floor(timeleft) + "s";
}
window.onload = function() {
  TimeScoreDisplay();
};
var Repeat = setInterval(TimeScoreDisplay, 10);