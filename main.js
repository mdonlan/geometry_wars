
// initialize the Phaser Game object
let game = new Phaser.Game(
  800, // width
  600, // height
  Phaser.CANVAS, // canvas || webgl || auto
  '.game_container', // element?
  { preload: preload, create: create, update: update, render: render }
);

let state = {
  enemySpawnCooldown: 5000,
  playerSpeed: 200,
  showDebugColliders: false,
  playerCooldown: 200,
  enemiesAlive: 0,
  maxEnemies: 50,
  fadeInTime: 3000,
  basePointsPerHit: 1000,
  playerScore: 0
};

let enemyTypes = [
  {
    type: 0,
    name: "pinwheel",
    speed: 200,
    targetsPlayer: false,
    scoreMultiplier: 1
  },
  {
    type: 1,
    name: "diamond",
    speed: 150,
    targetsPlayer: true,
    scoreMultiplier: 2
  },
  {
    type: 2,
    name: "green_square",
    speed: 250,
    targetsPlayer: true,
    scoreMultiplier: 3    
  },
  {
    type: 3,
    name: "pink_square",
    speed: 250,
    targetsPlayer: true,
    scoreMultiplier: 4
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
]

document.addEventListener("mousemove", mouseHandler);

function mouseHandler(event)
{
  if(typeof player != 'undefined')
  {
    let playerOffsetLeft = (window.innerWidth / 2) - 400;
    let playerOffsetTop = (window.innerHeight / 2) - 300;
    let angle = Math.atan2(event.clientY - (player.y + playerOffsetTop), event.clientX - (player.x + playerOffsetLeft));
    player.rotation = angle;
  }
};

function preload() 
{
  game.time.advancedTiming = true;
  
  // load assets
  game.load.image('player', 'assets/player.png');
  game.load.image('pinwheel', 'assets/pinwheel.png');
  game.load.image('diamond', 'assets/diamond.png');
  game.load.image('green_square', 'assets/green_square.png');
  game.load.image('pink_square', 'assets/pink_square.png');
};

function create() 
{
  // create groups
  projectiles = game.add.group();
  enemies = game.add.group();
  emitters = game.add.group();

  // start physics
  game.physics.startSystem(Phaser.Physics.ARCADE);

  // create the player
  player = game.add.sprite(0, 0, 'player');
  player.anchor.setTo(0.5, 0.5);
  game.physics.arcade.enable(player);
  player.body.setSize(20, 20, 10, 10);
  player.body.collideWorldBounds = true;
  
  // set up some timers
  playerCooldownTimer = game.time.time;
  enemySpawnTimer = game.time.time;
  
  // create triangle image for the projectile
  triangle = game.add.bitmapData(10,5); // w,h
  triangle.ctx.beginPath();
  triangle.ctx.moveTo(10, 0);
  triangle.ctx.lineTo(0, 2.5);
  triangle.ctx.lineTo(10, 5);
  triangle.ctx.fillStyle = '#dddddd';
  triangle.ctx.fill();

  // create projectile particle
  line = game.add.bitmapData(3,1);
  line.ctx.beginPath();
  line.ctx.moveTo(0, 0);
  line.ctx.lineTo(0, 1);
  line.ctx.lineTo(2, 1);
  line.ctx.lineTo(2, 0);
  line.ctx.fillStyle = '#dddddd';
  line.ctx.fill();
  game.cache.addBitmapData('line', line); // add to cache so we can load it
  
  // setup keyboard input
  spaceKey = game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
  wKey = game.input.keyboard.addKey(Phaser.KeyCode.W);
  aKey = game.input.keyboard.addKey(Phaser.KeyCode.A);
  sKey = game.input.keyboard.addKey(Phaser.KeyCode.S);
  dKey = game.input.keyboard.addKey(Phaser.KeyCode.D);

  displayPlayerScore();
  
};

function update()
{

  // check for collisions
  game.physics.arcade.overlap(projectiles, enemies, projectileHitEnemy);
  game.physics.arcade.overlap(player, enemies, playerHitEnemy);

  // make sure player is rotated towards the mouse
  //player.rotation = game.physics.arcade.angleToPointer(player);

  //  Reset the players velocity (movement)
  player.body.velocity.x = 0;
  player.body.velocity.y = 0;
 
  // check player shoot input
  if(game.input.activePointer.leftButton.isDown || spaceKey.isDown) {
    if(playerCooldownTimer < game.time.time) {
      playerCooldownTimer = game.time.time + state.playerCooldown;
      playerFire();
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

  // spawn enemy if not in cooldown
  if(enemySpawnTimer < game.time.time && state.enemiesAlive < state.maxEnemies)
  {
    enemySpawnTimer = game.time.time + state.enemySpawnCooldown;
    let numEnemiesToSpawn = Math.floor(Math.random() * 5) + 2; // 2-5
    for(let i = 0; i < numEnemiesToSpawn; i++) 
    {
      spawnEnemy();
    }
  }

  // update any enemies that are targeting the player
  enemies.children.forEach((child) => {
    if(child.data.type.targetsPlayer && child.data.isFadedIn) {
      let rotation = game.math.angleBetween(child.x, child.y, player.x, player.y);
      child.body.velocity.x = Math.cos(rotation) * child.data.type.speed;
      child.body.velocity.y = Math.sin(rotation) * child.data.type.speed;
    }
  });

  // rotate enemies
  enemies.children.forEach((child) => {
    child.rotation += 0.05;
  });
};

function render()
{

  game.debug.text(game.time.fps || '--', 2, 14, "#00ff00");   

  if(state.showDebugColliders) {
    game.debug.body(player);
    game.debug.physicsGroup(enemies);  
  }
};

function playerFire() 
{
  // spawn a projectile

  for(let i = 0; i < projectiles.children.length; i++)
  {
    // check if we can revive an old projectile
    if(!projectiles.children[i].alive) 
    {
      let projectile = projectiles.children[i];
      projectile.reset(player.x, player.y);
      projectile.rotation = player.rotation;
      game.physics.arcade.velocityFromRotation(player.rotation, 400, projectile.body.velocity);    
      return;
    }
  }
  
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
};

function spawnEmitter(sprite)
{
  // reuse or create a new emitter
  
  let emitter = emitters.children.find((child) => {return child.alive == false});

  if(emitter)
  {
    // reset dead enemy
    emitter.revive();
    emitter.x = sprite.x;
    emitter.y = sprite.y;
    emitter.makeParticles(game.cache.getBitmapData('line'));
    emitter.start(true, 1000, null, 3);
    game.time.events.add(1000, killEmitter, null, emitter);
  }
  else
  {
    // create particle emmiter
    let emitter = game.add.emitter(sprite.x, sprite.y, 10);
    emitter.makeParticles(game.cache.getBitmapData('line'));
    emitter.start(true, 1000, null, 10);
    game.time.events.add(1000, killEmitter, null, emitter);
    emitters.add(emitter);
  }

  // set each particle to have its own color
  emitters.children.forEach((particle) => {
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

  spawnEmitter(sprite);
  // kill and remove from view, can be revived later
  sprite.kill();
};

function destroyEnemy(sprite) 
{
  
  spawnEmitter(sprite);
  // destroy the projectile that hit world bounds
  sprite.kill();
  state.enemiesAlive--;
};

function spawnEnemy() 
{
  // spawn a new enemy

  // // get a random enemy type for the new enemy
  let randEnemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

  switch(randEnemyType.type) {
    case 0:
      createPinwheel();
      break;
    case 1:
      createDiamond();
      break;
    case 2:
      createGreenSquare();
      break; 
    case 3:
      createPinkSquare();
      break; 
  }
};

function createPinkSquare()
{
  // create a new green square enemy
  
  // // get random spawn location
  let x = Math.floor(Math.random() * game._width) + 0;
  let y = Math.floor(Math.random() * game._height) + 0;

  let xOffset = 0;
  let yOffset = 0;

  let enemy = enemies.children.find((child) => {return child.alive == false && child.data.type.type == 3});
  if(enemy)
  {
    // reset dead enemy
    enemy.reset(x + xOffset, y + yOffset);
    enemy.body.velocity.x = 0;
    enemy.body.velocity.y = 0;
    enemy.alpha = 0;
    enemy.data.isFadedIn = false;
    setSpriteFadeIn(enemy);
  }    
  if(!enemy)
  {
    // create new enemy
    let enemy = game.add.sprite(x + xOffset, y + yOffset, enemyTypes[3].name);
    enemy.alpha = 0;
    setSpriteFadeIn(enemy);
    enemy.data.type = enemyTypes[3];
    enemy.anchor.setTo(0.5, 0.5);
    game.physics.arcade.enable(enemy);
    enemy.body.setSize(20, 20, 10, 10);
    enemy.body.collideWorldBounds = true;
    enemy.body.bounce.set(1);
    enemies.add(enemy);
  }
  
  // set x, y for next in group
  xOffset += 40;
  if(xOffset >= 120)
  {
    xOffset = 0;
    yOffset += 40;
  } 

  // increase enemy count
  state.enemiesAlive++;

};

function createGreenSquare() 
{
  // create a new green square enemy
  
  // // get random spawn location
  let x = Math.floor(Math.random() * game._width) + 0;
  let y = Math.floor(Math.random() * game._height) + 0;

  let xOffset = 0;
  let yOffset = 0;

  let enemy = enemies.children.find((child) => {return child.alive == false && child.data.type.type == 2});
  if(enemy)
  {
    // reset dead enemy
    enemy.reset(x + xOffset, y + yOffset);
    enemy.body.velocity.x = 0;
    enemy.body.velocity.y = 0;
    enemy.alpha = 0;
    enemy.data.isFadedIn = false;
    setSpriteFadeIn(enemy);
  }    
  if(!enemy)
  {
    // create new enemy
    let enemy = game.add.sprite(x + xOffset, y + yOffset, enemyTypes[2].name);
    enemy.alpha = 0;
    setSpriteFadeIn(enemy);
    enemy.data.type = enemyTypes[2];
    enemy.anchor.setTo(0.5, 0.5);
    game.physics.arcade.enable(enemy);
    enemy.body.setSize(20, 20, 10, 10);
    enemy.body.collideWorldBounds = true;
    enemy.body.bounce.set(1);
    enemies.add(enemy);
  }
  
  // set x, y for next in group
  xOffset += 40;
  if(xOffset >= 120)
  {
    xOffset = 0;
    yOffset += 40;
  } 

  // increase enemy count
  state.enemiesAlive++;

};

function setSpriteFadeIn(sprite) 
{
  let fadeInTween = game.add.tween(sprite).to( { alpha: 1 }, state.fadeInTime, Phaser.Easing.Linear.None, true);
  fadeInTween.onComplete.add(enemyFadedIn);
  sprite.scale.setTo(0.1, 0.1);
  game.add.tween(sprite).to( { angle: 360 }, state.fadeInTime, Phaser.Easing.Linear.None, true);
  game.add.tween(sprite.scale).to( { x: 1, y: 1 }, state.fadeInTime, Phaser.Easing.Linear.None, true);
};

function createPinwheel() 
{
  // create a new pinwheel enemy

  // // get random spawn location
  let x = Math.floor(Math.random() * game._width) + 0;
  let y = Math.floor(Math.random() * game._height) + 0;

  let enemy = enemies.children.find((child) => {return child.alive == false && child.data.type.type == 0});

  if(enemy)
  {
    // reset dead enemy
    enemy.reset(x, y);
    enemy.body.velocity.x = 0;
    enemy.body.velocity.y = 0;
    enemy.alpha = 0;
    enemy.data.isFadedIn = false;
    setSpriteFadeIn(enemy);
  }
  else
  {    
    // if we got to this point it means we can't revive
    // so create a new one, this is more expensive
    
    let enemy = game.add.sprite(x, y, enemyTypes[0].name);
    enemy.alpha = 0;
    setSpriteFadeIn(enemy);
    enemy.data.type = enemyTypes[0];
    enemy.anchor.setTo(0.5, 0.5);
    game.physics.arcade.enable(enemy);
    enemy.body.setSize(20, 20, 10, 10);
    enemy.body.collideWorldBounds = true;
    enemy.body.bounce.set(1);
    enemies.add(enemy);
  }

  // increase enemy count
  state.enemiesAlive++;

};

function createDiamond() 
{
  // create a new diamond enemy group

  // // get random spawn location
  let x = Math.floor(Math.random() * game._width) + 0;
  let y = Math.floor(Math.random() * game._height) + 0;

  let xOffset = 0;
  let yOffset = 0;

  let diamondGroup = [];

  // we are going to spawn nine diamonds
  for(let i = 0; i < 9; i++)
  {
    let enemy = enemies.children.find((child) => {return child.alive == false && child.data.type.type == 1});
    if(enemy)
    {
      // reset dead enemy
      enemy.reset(x + xOffset, y + yOffset);
      enemy.body.velocity.x = 0;
      enemy.body.velocity.y = 0;
      enemy.alpha = 0;
      enemy.data.isFadedIn = false;
      setSpriteFadeIn(enemy);
    }    
    if(!enemy)
    {
      // create new enemy
      let enemy = game.add.sprite(x + xOffset, y + yOffset, enemyTypes[1].name);
      enemy.alpha = 0;
      setSpriteFadeIn(enemy);
      enemy.data.type = enemyTypes[1];
      enemy.anchor.setTo(0.5, 0.5);
      game.physics.arcade.enable(enemy);
      enemy.body.setSize(20, 20, 10, 10);
      enemy.body.collideWorldBounds = true;
      enemy.body.bounce.set(1);
      enemies.add(enemy);
    }
    
    // set x, y for next in group
    xOffset += 40;
    if(xOffset >= 120)
    {
      xOffset = 0;
      yOffset += 40;
    } 
  }

  // increase enemy count
  state.enemiesAlive += 9;

};

function enemyFadedIn(enemy) 
{
  // once an enemy has faded in set its random direction
  // and add it to group for collision

  let xDir = Math.floor(Math.random() * 2);
  let yDir = Math.floor(Math.random() * 2);
  if (xDir == 0) xDir = -1; 
  if (yDir == 0) yDir = -1; 
  let velX = enemy.data.type.speed * xDir;
  let velY = enemy.data.type.speed * yDir;
  enemy.body.velocity.x = velX;
  enemy.body.velocity.y = velY;

  // (FIX): does this sometimes add sprites to
  // group multiple times or can they only be added once?   
  enemies.add(enemy);
  
  enemy.data.isFadedIn = true;
};

function projectileHitEnemy(projectile, enemy) 
{
  if(enemy.data.isFadedIn)
  {
    destroyProjectile(projectile);
    destroyEnemy(enemy);
    setPlayerScore(enemy.data.type.scoreMultiplier)
  }
};

function setPlayerScore(multiplier) 
{
  state.playerScore += (state.basePointsPerHit * multiplier);
  displayPlayerScore();
};

function displayPlayerScore()
{
  let elem = document.querySelector(".score");
  elem.innerHTML = "SCORE: " + state.playerScore;
};

function playerHitEnemy(player, enemy) 
{
  // player had a collision with an enemy

  // if the enemy is faded in count the hit
  if(enemy.data.isFadedIn)
  {  
    state.showDebugColliders = true;
    // pause game on player death

    setTimeout(() => {
      pause();
    }, 20);
  }
};

function pause() 
{
  game.paused = true;
};