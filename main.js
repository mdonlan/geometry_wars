
// initialize the Phaser Game object
let game = new Phaser.Game(
  window.innerWidth, // width
  window.innerHeight, // height
  Phaser.AUTO, // canvas type?
  '', // element?
  { preload: preload, create: create, update: update }
);

let state = {
  enemySpawnCooldown: 2000,
}

let enemyTypes = [
  {
    name: "pinwheel",
    speed: 200,
    targetsPlayer: false
  },
  {
    name: "diamond",
    speed: 100,
    targetsPlayer: true
  }
]

function preload() {
  console.log('preload');

  // load assets
  game.load.image('player', 'assets/player.png');
  game.load.image('pinwheel', 'assets/pinwheel.png');
  game.load.image('diamond', 'assets/diamond.png');
};

function create() {
  console.log('create');

  // create groups
  projectiles = game.add.group();
  projectilesDead = game.add.group();
  enemies = game.add.group();
  enemiesDead = game.add.group();

  cursors = game.input.keyboard.createCursorKeys();

  game.physics.startSystem(Phaser.Physics.ARCADE);
  
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

  spaceKey = game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
  wKey = game.input.keyboard.addKey(Phaser.KeyCode.W);
  aKey = game.input.keyboard.addKey(Phaser.KeyCode.A);
  sKey = game.input.keyboard.addKey(Phaser.KeyCode.S);
  dKey = game.input.keyboard.addKey(Phaser.KeyCode.D);
};

function update() {
  // console.log('update');


  game.physics.arcade.overlap(projectiles, enemies, projectileHitEnemy);

  player.rotation = game.physics.arcade.angleToPointer(player);

  //  Reset the players velocity (movement)
  player.body.velocity.x = 0;
  player.body.velocity.y = 0;
 
  // check player shoot input
  if(game.input.activePointer.leftButton.isDown || spaceKey.isDown) {
    console.log('clicked left button')
    if(playerCooldownTimer < game.time.time) {
      playerCooldownTimer = game.time.time + 100;

      playerFire();
    }
  }

  // check player movement input
  if (cursors.left.isDown || aKey.isDown)
  {
    //  Move to the left
    player.body.velocity.x = -150;
  }
  else if (cursors.right.isDown || dKey.isDown)
  {
    //  Move to the right
    player.body.velocity.x = 150;
  }

  if(cursors.up.isDown || wKey.isDown)
  {
    player.body.velocity.y = -150;
  }
  else if(cursors.down.isDown || sKey.isDown) {
    player.body.velocity.y = 150;
  }

  if(enemySpawnTimer < game.time.time) {
    enemySpawnTimer = game.time.time + state.enemySpawnCooldown;
    spawnEnemy();
  }
};

function playerFire() {
  // create a projectile and fire it in the direction of the parent


  // check if we can revive a dead sprite ---- more efficient
  if(projectilesDead.children.length > 0)
  {
    console.log('reviving projectile');
    let projectile = projectilesDead.children[0];
    console.log(projectile)
    projectile.reset(player.x, player.y);
    projectile.rotation = player.rotation;
    game.physics.arcade.velocityFromRotation(player.rotation, 400, projectile.body.velocity);    
    projectiles.add(projectile);
  } 
  else // otherwise create a new projectile
  {
    console.log('creating new projectile');  
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
  projectiles.remove(sprite);
  projectilesDead.add(sprite);
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
  enemies.remove(sprite);
  enemiesDead.add(sprite);
};

function spawnEnemy() {
  console.log('spawning enemy');
  let enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

  // get a random enemy type
  let x = Math.floor(Math.random() * game._width) + 0;
  let y = Math.floor(Math.random() * game._height) + 0;

  // check if we can revive a dead sprite ---- more efficient
  if(enemiesDead.children.length > 0)
  {
    for(let i = 0; i < enemiesDead.children.length; i++)
    {
      if(enemiesDead.children[i].data.type.name == enemyType.name)
      {
        console.log('reviving enemy');

        let enemy = enemiesDead.children[i];
        enemy.reset(x, y);
        let xDir = Math.floor(Math.random() * 2);
        let yDir = Math.floor(Math.random() * 2);
        if (xDir == 0) xDir = -1; 
        if (yDir == 0) yDir = -1; 
        let velX = enemyType.speed * xDir;
        let velY = enemyType.speed * yDir;
        enemy.body.velocity.x = velX;
        enemy.body.velocity.y = velY;
        enemies.add(enemy);      
        break;
      }
    }    
  } 
  else // otherwise create a new enemy
  {
    console.log('creating new enemy sprite')
    let enemy = game.add.sprite(x, y, enemyType.name);
    enemy.data.type = enemyType;
    enemy.anchor.setTo(0.5, 0.5);
    game.physics.arcade.enable(enemy);
    enemy.body.collideWorldBounds = true;
    enemy.scale.setTo(0.5, 0.5);
    let xDir = Math.floor(Math.random() * 2);
    let yDir = Math.floor(Math.random() * 2);
    if (xDir == 0) xDir = -1; 
    if (yDir == 0) yDir = -1; 
    let velX = enemyType.speed * xDir;
    let velY = enemyType.speed * yDir;
    enemy.body.velocity.x = velX;
    enemy.body.velocity.y = velY;
    enemy.body.bounce.set(1);
    enemies.add(enemy);   
  }
};

function projectileHitEnemy(projectile, enemy) {
  destroyProjectile(projectile);
  destroyEnemy(enemy);
};

