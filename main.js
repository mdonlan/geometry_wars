let gameWidth = window.innerWidth;
let gameHeight = window.innerHeight - 20; // -20px for the top ui div

// initialize the Phaser Game object
let game = new Phaser.Game(
  gameWidth, // width
  gameHeight, // height
  Phaser.CANVAS, // canvas || webgl || auto
  '.game_container', // element?
  { preload: preload, create: create, update: update, render: render }
);

// global state
let state = {
  enemySpawnCooldown: 3000,
  playerSpeed: 200,
  showDebugColliders: false,
  playerCooldown: 200,
  enemiesAlive: 0,
  maxEnemies: 50,
  fadeInTime: 3000,
  basePointsPerHit: 1000,
  playerScore: 0,
  highscore: 0,
  lives: 3,
  isPaused: false
};

// load highscore
let hs = localStorage.getItem("highscore");
if(hs) state.highscore = hs;
setPlayerScore(0);

// all base enemy type data
let enemyTypes = [
  {
    type: 0,
    name: "pinwheel",
    speed: 200,
    targetsPlayer: false,
    scoreMultiplier: 1,
    rotates: true,
  },
  {
    type: 1,
    name: "diamond",
    speed: 150,
    targetsPlayer: true,
    scoreMultiplier: 2,
    rotates: true
  },
  {
    type: 2,
    name: "green_square",
    speed: 250,
    targetsPlayer: true,
    scoreMultiplier: 3,
    rotates: true,   
  },
  {
    type: 3,
    name: "pink_square",
    speed: 250,
    targetsPlayer: true,
    scoreMultiplier: 4,
    rotates: true
  },
  {
    type: 4,
    name: "black_hole",
    speed: 0,
    targetsPlayer: false,
    scoreMultiplier: 5,
    range: 200,
    level: 1,
    levelUpTime: null,
    cooldownLength: 3000,
    rotates: true
  },
  {
    type: 5,
    name: "yellow_triangle",
    speed: 400,
    targetsPlayer: false,
    scoreMultiplier: 6,
    rotates: false,
    hasTarget: false
  }
];

let particleColors = [
  '0xFF5733',
  '0x77FF33',
  '0x33FFDA',
  '0x337DFF',
  '0x5E33FF',
  '0xECFF33',
  '0xFFBE33',
  '0xFF33FF',
  '0xFF3399',
];

document.addEventListener("mousemove", mouseHandler);

// handles mouse movement
// not using standard phaser mouse events b/c we might 
// want to capture mouse outside of game (if the game is not fullscreen)
function mouseHandler(event)
{
  // if player exists set its direction to the mouse on mouse move
  if(typeof player != 'undefined' && !state.isPaused)
  {
    let playerOffsetLeft = (window.innerWidth / 2) - (gameWidth / 2);
    let playerOffsetTop = (window.innerHeight / 2) - (gameHeight / 2);
    let angle = Math.atan2(event.clientY - (player.y + playerOffsetTop), event.clientX - (player.x + playerOffsetLeft));
    player.rotation = angle;
  }
};

function preload() 
{
  // allow for fps cature
  game.time.advancedTiming = true;
  
  // load images
  game.load.image('player', 'assets/images/player.png');
  game.load.image('pinwheel', 'assets/images/pinwheel.png');
  game.load.image('diamond', 'assets/images/diamond.png');
  game.load.image('green_square', 'assets/images/green_square.png');
  game.load.image('pink_square', 'assets/images/pink_square.png');
  game.load.image('rocket_trail', 'assets/images/rocket_trail.png');
  game.load.image('background', 'assets/images/background_1.jpg');
  game.load.image('yellow_triangle', 'assets/images/yellow_triangle2.png');
  game.load.image('double_shot', 'assets/images/double_shot_powerup.png');
  game.load.image('powerup_background', 'assets/images/powerup_background.png');

  // load sounds
  game.load.audio('explosion_01', 'assets/audio/explosion_01.wav');
  game.load.audio('explosion_02', 'assets/audio/explosion_02.wav');
  game.load.audio('explosion_03', 'assets/audio/explosion_03.wav');
  game.load.audio('explosion_04', 'assets/audio/explosion_04.mp3');
  game.load.audio('explosion_05', 'assets/audio/explosion_05.wav');
  
};

function create() 
{

  // create background
  let background = game.add.tileSprite(0, 0, gameWidth, gameHeight, 'background');
  background.alpha = 0.5;

  // create groups
  projectiles = game.add.group();
  enemies = game.add.group();
  emitters = game.add.group();
  powerups = game.add.group();

  // start physics
  game.physics.startSystem(Phaser.Physics.ARCADE);

  // create the player
  player = game.add.sprite((game._width / 2) + 18, (game._height / 2) + 18, 'player');
  player.anchor.setTo(0.5, 0.5);
  game.physics.arcade.enable(player);
  player.body.setSize(20, 20, 10, 10);
  player.body.collideWorldBounds = true;
  
  // set up some timers
  playerCooldownTimer = game.time.time;
  enemySpawnTimer = game.time.time;
  powerupSpawnTimer = game.time.time;
  
  // create triangle image for the projectile
  triangle = game.add.bitmapData(15,10); // w,h
  triangle.ctx.beginPath();
  triangle.ctx.moveTo(15, 0);
  triangle.ctx.lineTo(0, 5);
  triangle.ctx.lineTo(15, 10);
  triangle.ctx.fillStyle = '#dddddd';
  triangle.ctx.fill();

  // create triangle image for the triangle enemy
  triangleEnemySprite = game.add.bitmapData(40, 40);
  triangleEnemySprite.ctx.beginPath();
  triangleEnemySprite.ctx.moveTo(40, 0);
  triangleEnemySprite.ctx.lineTo(0, 20);
  triangleEnemySprite.ctx.lineTo(40, 40);
  triangleEnemySprite.ctx.fillStyle = '#E5E500';
  triangleEnemySprite.ctx.fill();
  game.cache.addBitmapData('yellow_triangle', triangleEnemySprite); // add to cache so we can load it

  // create projectile particle
  line = game.add.bitmapData(5,2);
  line.ctx.beginPath();
  line.ctx.moveTo(0, 0);
  line.ctx.lineTo(0, 2);
  line.ctx.lineTo(5, 2);
  line.ctx.lineTo(5, 0);
  line.ctx.fillStyle = '#dddddd';
  line.ctx.fill();
  game.cache.addBitmapData('line', line); // add to cache so we can load it

  circle = game.add.bitmapData(40, 40);
  circle.ctx.beginPath();
  circle.ctx.arc(20, 20, 20, 0, 2*Math.PI);
  circle.ctx.strokeStyle = "#dddddd";
  circle.ctx.stroke();

  // setup keyboard input
  spaceKey = game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR); // fire -- also mouse1
  wKey = game.input.keyboard.addKey(Phaser.KeyCode.W); // up
  aKey = game.input.keyboard.addKey(Phaser.KeyCode.A); // left
  sKey = game.input.keyboard.addKey(Phaser.KeyCode.S); // down
  dKey = game.input.keyboard.addKey(Phaser.KeyCode.D); // right
  tKey = game.input.keyboard.addKey(Phaser.KeyCode.T); // pause
  tKey.onDown.add(pause);

  // create sounds
  explosion_01 = game.add.audio('explosion_01');
  explosion_02 = game.add.audio('explosion_02');
  explosion_03 = game.add.audio('explosion_03');
  explosion_04 = game.add.audio('explosion_04');
  explosion_05 = game.add.audio('explosion_05');
};

function update()
{
  // if game is not paused
  if(!state.isPaused)
  {      
    // check for collisions
    game.physics.arcade.overlap(projectiles, enemies, projectileHitEnemy);
    game.physics.arcade.overlap(player, enemies, playerHitEnemy); // TURN OFF FOR DEV
    game.physics.arcade.overlap(player, powerups, playerCollectedPowerup); // TURN OFF FOR DEV
    // game.physics.arcade.overlap(enemies, enemies, hitBlackhole);
    playerUpdate();
    enemiesUpdate();
    spawnNewEmemies();
    powerupsUpdate();
  } 
};

function powerupsUpdate()
{
  spawnPowerup();
  for(let i = 0; i < powerups.children.length; i++)
  {
    powerups.children[i].rotation += 0.03;
  }
};

function spawnNewEmemies()
{
  // check if the enemy spawn cooldown is over
  // and that we are under the max enemy limit
  // if so spawn a new batch of enemies// spawn enemy if not in cooldown
  if(enemySpawnTimer < game.time.time && state.enemiesAlive < state.maxEnemies)
  {
    enemySpawnTimer = game.time.time + state.enemySpawnCooldown;
    let numEnemiesToSpawn = Math.floor(Math.random() * 7) + 3; // 3-7
    for(let i = 0; i < numEnemiesToSpawn; i++) 
    {
      spawnEnemySprite();
    }
  }
};

function enemiesUpdate()
{
  // loop through all enemies and see if they need to do anything
  for(let i = 0; i < enemies.children.length; i++)
  {
    let enemy = enemies.children[i];
 
    // update any enemies that are following the player
    if(enemy.data.targetsPlayer && enemy.data.isReady) {
      let rotation = game.math.angleBetween(enemy.x, enemy.y, player.x, player.y);
      enemy.body.velocity.x = Math.cos(rotation) * enemy.data.speed;
      enemy.body.velocity.y = Math.sin(rotation) * enemy.data.speed;
    }

    // give pinwheels a random velocity to move when they are ready
    if(enemy.data.type == 0 && enemy.data.isReady  && enemy.body.velocity.x == 0 && enemy.body.velocity.y == 0)
    {
      getRandomDirection(enemy);
    }

    // rotate any enemies that need to rotate
    if(enemy.data.rotates == true)
    {
      enemy.rotation += 0.02;
    }

    // check if enemy needs a random target
    if(enemy.data.type == 5)
    {
      if(!enemy.data.hasTarget && enemy.data.isReady)
      {
        // if enemy doesn't have a target give it one and 
        // start its movement to target

        enemy.data.hasTarget = true;

        let x = Math.floor(Math.random() * game._width) + 0;
        let y = Math.floor(Math.random() * game._height) + 0;

        let target = {x: x, y: y};

        let dist = game.physics.arcade.distanceBetween(enemy, target);
        let speed = enemy.data.speed;
        let timeToTarget = dist / speed;
        let moveToTarget = game.add.tween(enemy).to(target, (timeToTarget * 1000), null, true);      
        moveToTarget.onComplete.add(() => {
          // after reaching target wait x seconds before getting next target
          setTimeout(() => {
            enemy.data.hasTarget = false;
          }, 2000);
        });
      } 
    }

    // update any enemies that are targeting the player
    if(enemy.data.targetsPlayer && enemy.data.isReady) {
      let rotation = game.math.angleBetween(enemy.x, enemy.y, player.x, player.y);
      enemy.body.velocity.x = Math.cos(rotation) * enemy.data.speed;
      enemy.body.velocity.y = Math.sin(rotation) * enemy.data.speed;
    }
  }
};

function render()
{
  game.debug.text(game.time.fps || '--', 2, 14, "#00ff00");   

  if(state.showDebugColliders) {
    game.debug.body(player);
    game.debug.physicsGroup(enemies);  
  }
};

function playerUpdate()
{
  // update all player related things
  
  // reset the players velocity (movement)
  player.body.velocity.x = 0;
  player.body.velocity.y = 0;

  // check player shoot input
  if(game.input.activePointer.leftButton.isDown || spaceKey.isDown) {
    if(playerCooldownTimer < game.time.time) {
      playerCooldownTimer = game.time.time + state.playerCooldown;
      fire();
    }
  }
  
  // check player movement input
  if(aKey.isDown)
  {
    player.body.velocity.x = -state.playerSpeed;
  }
  else if(dKey.isDown)
  {
    player.body.velocity.x = state.playerSpeed;
  }

  if(wKey.isDown)
  {
    player.body.velocity.y = -state.playerSpeed;
  }
  else if(sKey.isDown)
  {
    player.body.velocity.y = state.playerSpeed;
  }
};

function fire() 
{
  // check if we can revive a dead projectile
  let projectile = projectiles.getFirstDead();
  if(projectile)
  {
    projectile.reset(player.x, player.y);
    projectile.rotation = player.rotation;
    game.physics.arcade.velocityFromRotation(player.rotation, 400, projectile.body.velocity);    
  }
  else
  {
    // create a new projectile if we don't have any we can revive
    let projectile = game.add.sprite(player.x, player.y, triangle); 
    projectile.anchor.setTo(0.5, 0.5);
    game.physics.arcade.enable(projectile);
    projectile.rotation = player.rotation;
    game.physics.arcade.velocityFromRotation(player.rotation, 400, projectile.body.velocity);
    projectile.scale.x *= -1; // flip sprite
    projectile.checkWorldBounds = true;
    projectile.events.onOutOfBounds.add(destroyProjectile);
    projectiles.add(projectile);

    // add trail emitter
    let trail = projectile.addChild(game.make.sprite(8,0, 'rocket_trail'));
    trail.alpha = 0.8
    trail.anchor.setTo(0.5, 0.5);
    trail.scale.setTo(0.5, 0.5);
    trail.rotation += Math.PI * 0.5; // rotate child to match parent rotation
  }
};

function spawnEmitter(sprite, numParticles)
{
  // reuse or create a new emitter
  
  let emitter = emitters.children.find((child) => {return child.alive == false});

  if(emitter)
  {
    // reset dead emitter
    emitter.revive();
    emitter.x = sprite.x;
    emitter.y = sprite.y;
    emitter.start(true, 2000, null, numParticles);
    game.time.events.add(2000, killEmitter, null, emitter);
  }
  else
  {
    // create particle emmiter
    emitter = game.add.emitter(sprite.x, sprite.y, 20); // 100 max num particles
    emitter.makeParticles(game.cache.getBitmapData('line'));
    emitter.start(true, 2000, null, numParticles);
    game.time.events.add(2000, killEmitter, null, emitter);
    emitters.add(emitter);
  }

  // set each particle to have its own color
  emitter.children.forEach((particle) => {
    let color = particleColors[Math.floor(Math.random() * particleColors.length)];
    particle.tint = color;
  });
};

function killEmitter(emitter)
{
  emitter.children.forEach((child) => {
    child.kill();
  });
  emitter.kill();
};

function destroyProjectile(sprite)
{
  // destroy the projectile
  spawnEmitter(sprite, 20);
  // kill and remove from view, can be revived later
  sprite.kill();
};

function destroyEnemy(sprite) 
{
  spawnEmitter(sprite, 20);
  // destroy the projectile that hit world bounds
  sprite.kill();
  state.enemiesAlive--;
};

function spawnEnemySprite()
{
  // we are spawning a new enemy sprite 

  // get a random enemy type for the new enemy
  let enemyTypeData = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  
  // cancel on blackhole
  if(enemyTypeData.type == 4)
  {
    return;
  }

  // get a random spawn pos
  let x = Math.floor(Math.random() * game._width) + 0;
  let y = Math.floor(Math.random() * game._height) + 0;

  let enemy;
  // check if we can revive a dead enemy of this type
  enemy = enemies.children.find((enemy) => {return enemy.alive == false && enemy.data.type == enemyTypeData.type});
  
  // if we find a dead enemy revive and reset it
  if(enemy)
  {
    // reset dead enemy
    enemy.reset(x, y);
    enemy.body.velocity.x = 0; 
    enemy.body.velocity.y = 0; 
    enemy.alpha = 0;
    enemy.data.isReady = false;    
  }
  // if we can't find an enemy to revive then create a new sprite
  else
  {    
    // setup new enemy
    enemy = game.add.sprite(x, y, enemyTypeData.name);
    enemy.data = {...enemyTypeData};
    enemy.anchor.setTo(0.5, 0.5);
    game.physics.arcade.enable(enemy);
    enemy.body.setSize(20, 20, 10, 10);
    enemy.body.collideWorldBounds = true;
    enemy.body.bounce.set(1);
    enemies.add(enemy);
    enemy.alpha = 0;
  }

  // run starting transitions on enemy
  // when complete enable collision flag on enemy
  let fade = game.add.tween(enemy).to({alpha: 1}, state.fadeInTime, Phaser.Easing.Linear.None, true);
  fade.onComplete.add(() => {
    enemy.data.isReady = true;
  });
  enemy.scale.setTo(0.1, 0.1);
  game.add.tween(enemy).to({angle: 360}, state.fadeInTime, Phaser.Easing.Linear.None, true);
  game.add.tween(enemy.scale).to({x: 1, y: 1}, state.fadeInTime, Phaser.Easing.Linear.None, true);

  state.enemiesAlive++;
};

function getRandomDirection(enemy)
{
  // give a random fixed velocity
  let xDir = Math.floor(Math.random() * 2);
  let yDir = Math.floor(Math.random() * 2);
  if (xDir == 0) xDir = -1; 
  if (yDir == 0) yDir = -1; 
  let velX = enemy.data.speed * xDir;
  let velY = enemy.data.speed * yDir;
  enemy.body.velocity.x = velX;
  enemy.body.velocity.y = velY;
};

function projectileHitEnemy(projectile, enemy) 
{
  if(enemy.data.isReady)
  {
    explosion_03.play();
    destroyProjectile(projectile);
    destroyEnemy(enemy);
    setPlayerScore(enemy.data.scoreMultiplier)
  }
};

function setPlayerScore(multiplier) 
{
  state.playerScore += (state.basePointsPerHit * multiplier);
  // update in DOM
  let elem = document.querySelector(".score");
  elem.innerHTML = "SCORE: " + state.playerScore;

  // check if new highscore
  if(state.playerScore >= state.highscore)
  {
    state.highscore = state.playerScore
    let highscoreElem = document.querySelector(".highscore");
    highscoreElem.innerHTML = "HIGHSCORE: " + state.highscore;
  }

  // save score to localstorage
  localStorage.setItem("highscore", state.highscore);
};

function playerHitEnemy(player, enemy) 
{
  // player had a collision with an enemy

  // if the enemy is faded in count the hit
  if(enemy.data.isReady)
  {  
    state.lives--;
    explosion_01.play();

    // if player is dead
    if(state.lives == 0)
    {
      state.showDebugColliders = true;
      // pause game on player death
      setTimeout(() => {
        //game.paused = true;
        // set game over
        pause();
        state.gameOver = true;
      }, 20);
    }

    setlives();
    clearAll();
  }
};

function pause()
{

  // toggle to unpaused
  if(state.isPaused)
  {
    game.physics.arcade.isPaused = false;
    game.tweens.resumeAll();
  }
  // toggle to paused
  else
  {
    game.physics.arcade.isPaused = true;
    game.tweens.pauseAll();
  }

  state.isPaused = state.isPaused ? false : true;
};

function setlives()
{
  let elem = document.querySelector(".lives");
  elem.innerHTML = "LIVES: " + state.lives;
};

function clearAll()
{
  // this is triggered when the player is hit
  // we want to basically reset everything

  // clear enemies
  for(let i = 0; i < enemies.children.length; i++)
  {
    let enemy = enemies.children[i];
    destroyEnemy(enemy);
  }
};

function spawnPowerup()
{
  // check if we should spawn a powerup
  if(powerupSpawnTimer + 1500 < game.time.time)
  {
    // create a popup
    let x = Math.floor(Math.random() * game._width) + 0;
    let y = Math.floor(Math.random() * game._height) + 0;
    
    let powerup = game.add.sprite(x, y, 'double_shot');
    game.physics.arcade.enable(powerup);
    powerup.anchor.setTo(0.5, 0.5);
    powerupSpawnTimer = game.time.time;

    powerup.data.name = "double_shot";
    
    let child = powerup.addChild(game.make.sprite(0,0, 'powerup_background'));
    child.anchor.setTo(0.5, 0.5);
    child.scale.setTo(1.2, 1.2);
    child.alpha = 0.2;

    powerups.add(powerup);
  }
};

function playerCollectedPowerup(player, powerup)
{
  state.playerPowerup = {...powerup.data};
  state.hasPowerup = true;
  powerups.remove(powerup);
  powerup.kill();
};

function spawnNewSprite()
{

};

function reviveSprite()
{

};