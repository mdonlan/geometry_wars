let game = new Phaser.Game(
  window.innerWidth, // width
  window.innerHeight, // height
  Phaser.AUTO, // canvas type?
  '', // element?
  { 
    preload: preload, 
    create: create, 
    update: update 
  }
);

function preload() {
  console.log('preload');

  game.load.image('player', 'assets/player.png');

};

function create() {
  console.log('create');

  // create groups
  projectiles = game.add.group();

  cursors = game.input.keyboard.createCursorKeys();

  game.physics.startSystem(Phaser.Physics.ARCADE);
  
  player = game.add.sprite(0, 0, 'player');
  player.anchor.setTo(0.5, 0.5);

  game.physics.arcade.enable(player);
  player.body.collideWorldBounds = true;

  playerCooldownTimer = game.time.time;

  
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
};

function playerFire() {
  // create a projectile and fire it in the direction of the parent

  let projectile = game.add.sprite(player.x, player.y, triangle); 
  projectile.anchor.setTo(0.5, 0.5);
  game.physics.arcade.enable(projectile);
  projectile.rotation = player.rotation;
  game.physics.arcade.velocityFromRotation(player.rotation, 400, projectile.body.velocity);
  projectile.scale.x *= -1; // flip sprite
  projectile.checkWorldBounds = true;
  projectile.events.onOutOfBounds.add(projectileHitBounds);

  projectiles.add(projectile);

};

function projectileHitBounds(sprite) {
  sprite.destroy();
};