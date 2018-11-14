
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

function preload() {
  // load assets
  game.load.image('player', 'assets/player.png');
  game.load.image('pinwheel', 'assets/pinwheel.png');
  game.load.image('diamond', 'assets/diamond.png');
};

function create() {
  // create groups
  projectiles = game.add.group();
  projectilesDead = game.add.group();
  enemies = game.add.group();
  enemiesDead = game.add.group();

  cursors = game.input.keyboard.createCursorKeys();

  game.physics.startSystem(Phaser.Physics.ARCADE);
  
  player = game.add.sprite(0, 0, 'player');
  let playerOutline = player.addChild(game.make.sprite(0, 0, 'player'));
  playerOutline.scale.setTo(1.1, 1.1);
  playerOutline.anchor.setTo(0.5, 0.5);
  playerOutline.tint = "0x5AF21C";

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
  if (cursors.left.isDown || aKey.isDown)
  {
    player.body.velocity.x = -state.playerSpeed;
  }
  else if (cursors.right.isDown || dKey.isDown)
  {
    player.body.velocity.x = state.playerSpeed;
  }

  if(cursors.up.isDown || wKey.isDown)
  {
    player.body.velocity.y = -state.playerSpeed;
  }
  else if(cursors.down.isDown || sKey.isDown)
  {
    player.body.velocity.y = state.playerSpeed;
  }

  if(enemySpawnTimer < game.time.time) {
    // console.log('true')
    enemySpawnTimer = game.time.time + state.enemySpawnCooldown;
    spawnEnemy();
  }

  // update any enemies that have a non-fixed velocity
  enemies.children.forEach((child) => {
    if(child.data.type.targetsPlayer) {
      let rotation = game.math.angleBetween(child.x, child.y, player.x, player.y);
      // Calculate velocity vector based on rotation and this.MAX_SPEED
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
  // create a projectile and fire it in the direction of the parent

  // check if we can revive a dead sprite ---- more efficient
  if(projectilesDead.children.length > 0)
  {
    // console.log('reviving projectile');
    let projectile = projectilesDead.children[0];
    // console.log(projectile)
    projectile.reset(player.x, player.y);
    projectile.rotation = player.rotation;
    game.physics.arcade.velocityFromRotation(player.rotation, 400, projectile.body.velocity);    
    projectiles.add(projectile);
  } 
  else // otherwise create a new projectile
  {
    // console.log('creating new projectile');  
    let projectile = game.add.sprite(player.x, player.y, triangle); 
    projectile.anchor.setTo(0.5, 0.5);
    game.physics.arcade.enable(projectile);
    projectile.rotation = player.rotation;
    game.physics.arcade.velocityFromRotation(player.rotation, 400, projectile.body.velocity);
    projectile.scale.x *= -1; // flip sprite
    projectile.checkWorldBounds = true;
    projectile.events.onOutOfBounds.add(projectileHitBounds);

    projectiles.add(projectile);    
  }


};

function projectileHitBounds(sprite) {
  // projectile has collided with world bounds

  destroyProjectile(sprite);
};

function destroyProjectile(sprite) {

  // create particle line img
  let line = game.add.bitmapData(6,2);
  line.ctx.beginPath();
  line.ctx.moveTo(0, 0);
  line.ctx.lineTo(0, 2);
  line.ctx.lineTo(6, 2);
  line.ctx.lineTo(6, 0);
  line.ctx.fillStyle = '#dddddd';
  line.ctx.fill();
  game.cache.addBitmapData('line', line); // add to cache so we can load it

  //create emmiter
  let emitter = game.add.emitter(sprite.x, sprite.y, 50);
  emitter.makeParticles(game.cache.getBitmapData('line'));
  emitter.start(true, 2000, null, 10);

  // set each particle to have its own color

  let colors = [
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
  // give each particle the emitter made a color
  emitter.children.forEach((particle) => {
    let color = colors[Math.floor(Math.random() * colors.length)];
    particle.tint = color;
  });
  
  // destroy the projectile that hit world bounds
  // remove from group
  sprite.kill();
};


function destroyEnemy(sprite) {
  // create particle line img
  let line = game.add.bitmapData(10,3);
  line.ctx.beginPath();
  line.ctx.moveTo(0, 0);
  line.ctx.lineTo(0, 3);
  line.ctx.lineTo(10, 3);
  line.ctx.lineTo(10, 0);
  line.ctx.fillStyle = '#dddddd';
  line.ctx.fill();
  game.cache.addBitmapData('line', line); // add to cache so we can load it

  //create emmiter
  let emitter = game.add.emitter(sprite.x, sprite.y, 50);
  emitter.makeParticles(game.cache.getBitmapData('line'));
  emitter.start(true, 2000, null, 10);
  
  // destroy the projectile that hit world bounds
  // remove from group
  sprite.kill();
};

function spawnEnemy() {

  // get a random enemy type
  let enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  // get random spawn location
  let x = Math.floor(Math.random() * game._width) + 0;
  let y = Math.floor(Math.random() * game._height) + 0;

  let deadEnemy = enemies.getFirstDead();
  
  for(let i = 0; i < enemies.children.length; i++) {
    let enemy = enemies.children[i];
    if(!enemy.alive && enemy.data.type.name == enemyType.name) {
      enemy.reset(x, y);
      enemy.alpha = 0;
      let fadeIn = game.add.tween(enemy).to( { alpha: 1 }, 2000, Phaser.Easing.Linear.None, true);
      fadeIn.onComplete.add(enemyFadedIn);
      return;
    }
  }
  // check if we can revive a dead sprite ---- more efficient
    // for(let i = 0; i < enemies.children.length; i++)
    // {
    //   console.log(enemies.children[i]);
    //   // if(enemies.children[i].data.type.name == enemyType.name)
    //   // {
    //   //   // console.log('reviving enemy');
    //   //   let enemy = enemies.children[i];
    //   //   enemy.reset(x, y);
    //   //   enemy.alpha = 0;
    //   //   // console.log(enemy);
    //   //   // fade in enemy so that the player can see where enemies will be
    //   //   // do not enable body/collision until full faded in
    //   //   let fadeIn = game.add.tween(enemy).to( { alpha: 1 }, 2000, Phaser.Easing.Linear.None, true);
    //   //   fadeIn.onComplete.add(enemyFadedIn);
    //   //   return;
    //   // }
    // } 
  // console.log('creating new enemy sprite')
  let enemy = game.add.sprite(x, y, enemyType.name);
  // console.log(enemy);
  // fade in enemy so that the player can see where enemies will be
  // do not enable body/collision until full faded in
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
  // console.log("GAME OVER: PLAYER WAS HIT BY ENEMY");
  player.kill();
  enemy.kill();

  // stop the game in its current state

  // pause all physics
  game.physics.arcade.isPaused = true;
};