
// initialize the Phaser Game object
let game = new Phaser.Game(
  window.innerWidth, // width
  window.innerHeight, // height
  Phaser.AUTO, // canvas type?
  '', // element?
  { preload: preload, create: create, update: update, render: render }
);

let state = {
  enemySpawnCooldown: 1500,
  playerSpeed: 200,
};

let enemyTypes = [
  {
    name: "pinwheel",
    speed: 200,
    targetsPlayer: false
  },
  {
    name: "diamond",
    speed: 150,
    targetsPlayer: true
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

function preload() {
  // load assets
  game.load.image('player', 'assets/player.png');
  game.load.image('pinwheel', 'assets/pinwheel.png');
  game.load.image('diamond', 'assets/diamond.png');
};

function create() {
  // create groups
  projectiles = game.add.group();
  enemies = game.add.group();

  // start physics
  game.physics.startSystem(Phaser.Physics.ARCADE);

  // create the player
  player = game.add.sprite(0, 0, 'player');
  player.anchor.setTo(0.5, 0.5);
  game.physics.arcade.enable(player);
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

  // create line particle
  line = game.add.bitmapData(6,2);
  line.ctx.beginPath();
  line.ctx.moveTo(0, 0);
  line.ctx.lineTo(0, 2);
  line.ctx.lineTo(6, 2);
  line.ctx.lineTo(6, 0);
  line.ctx.fillStyle = '#dddddd';
  line.ctx.fill();
  game.cache.addBitmapData('line', line); // add to cache so we can load it
  
  // setup keyboard input
  spaceKey = game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
  wKey = game.input.keyboard.addKey(Phaser.KeyCode.W);
  aKey = game.input.keyboard.addKey(Phaser.KeyCode.A);
  sKey = game.input.keyboard.addKey(Phaser.KeyCode.S);
  dKey = game.input.keyboard.addKey(Phaser.KeyCode.D);
};

function update() {

  // check for collisions
  game.physics.arcade.overlap(projectiles, enemies, projectileHitEnemy);
  game.physics.arcade.overlap(player, enemies, playerHitEnemy);

  // make sure player is rotated towards the mouse
  player.rotation = game.physics.arcade.angleToPointer(player);

  //  Reset the players velocity (movement)
  player.body.velocity.x = 0;
  player.body.velocity.y = 0;
 
  // check player shoot input
  if(game.input.activePointer.leftButton.isDown || spaceKey.isDown) {
    if(playerCooldownTimer < game.time.time) {
      playerCooldownTimer = game.time.time + 100;
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
  if(enemySpawnTimer < game.time.time) {
    enemySpawnTimer = game.time.time + state.enemySpawnCooldown;
    spawnEnemy();
  }

  // update any enemies that are targeting the player
  enemies.children.forEach((child) => {
    if(child.data.type.targetsPlayer) {
      let rotation = game.math.angleBetween(child.x, child.y, player.x, player.y);
      child.body.velocity.x = Math.cos(rotation) * child.data.type.speed;
      child.body.velocity.y = Math.sin(rotation) * child.data.type.speed;
    }
  });
};

function render() {
  game.debug.body(player);
  game.debug.physicsGroup(enemies);
};

function playerFire() {
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

function destroyProjectile(sprite) {
  // destroy the projectile

  // create particle emmiter
  let emitter = game.add.emitter(sprite.x, sprite.y, 50);
  emitter.makeParticles(game.cache.getBitmapData('line'));
  emitter.start(true, 2000, null, 10);

  // set each particle to have its own color
  emitter.children.forEach((particle) => {
    let color = particleColors[Math.floor(Math.random() * particleColors.length)];
    particle.tint = color;
  });
  
  // kill and remove from view, can be revived later
  sprite.kill();
};

function destroyEnemy(sprite) {
  
  //create emmiter
  let emitter = game.add.emitter(sprite.x, sprite.y, 50);
  emitter.makeParticles(game.cache.getBitmapData('line'));
  emitter.start(true, 2000, null, 10);
  
  // destroy the projectile that hit world bounds
  // remove from group
  sprite.kill();
};

function spawnEnemy() {
  // spawn a new enemy

  // get a random enemy type for the new enemy
  let enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

  // get random spawn location
  let x = Math.floor(Math.random() * game._width) + 0;
  let y = Math.floor(Math.random() * game._height) + 0;

  // check if we can revive an old enemy of same type
  for(let i = 0; i < enemies.children.length; i++) {
    let enemy = enemies.children[i];
    if(!enemy.alive && enemy.data.type.name == enemyType.name) {
      // reviving enemy
      enemy.reset(x, y);
      enemy.alpha = 0;
      let fadeIn = game.add.tween(enemy).to( { alpha: 1 }, 2000, Phaser.Easing.Linear.None, true);
      fadeIn.onComplete.add(enemyFadedIn);
      return;
    }
  }

  // if we can't revive create a new enemy
  let enemy = game.add.sprite(x, y, enemyType.name);
  enemy.alpha = 0;
  let fadeIn = game.add.tween(enemy).to( { alpha: 1 }, 2000, Phaser.Easing.Linear.None, true);
  fadeIn.onComplete.add(enemyFadedIn);
  enemy.data.type = enemyType;
  enemy.anchor.setTo(0.5, 0.5);
  game.physics.arcade.enable(enemy);
  enemy.body.collideWorldBounds = true;
  enemy.scale.setTo(0.5, 0.5);
  enemy.body.bounce.set(1);
};

function enemyFadedIn(enemy) {
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
  enemies.add(enemy);   
};

function projectileHitEnemy(projectile, enemy) {
  destroyProjectile(projectile);
  destroyEnemy(enemy);
};

function playerHitEnemy(player, enemy) {
  player.kill();
  enemy.kill();

  // pause game on player death
  game.paused = true;
};