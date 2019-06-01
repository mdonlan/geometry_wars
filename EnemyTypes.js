// all base enemy type data
let enemyTypes = [
  {
    type: 0,
    name: "pinwheel",
    speed: 200,
    targetsPlayer: false,
    scoreMultiplier: 1,
    rotates: true,
    color: '0xF740E3'
  },
  {
    type: 1,
    name: "diamond",
    speed: 150,
    targetsPlayer: true,
    scoreMultiplier: 2,
    rotates: true,
    color: '0x40F4F7'
  },
  {
    type: 2,
    name: "green_square",
    speed: 250,
    targetsPlayer: true,
    scoreMultiplier: 3,
    rotates: true,  
    color: '0x0FB219' 
  },
  {
    type: 3,
    name: "pink_square",
    speed: 250,
    targetsPlayer: true,
    scoreMultiplier: 4,
    rotates: true,
    color: '0xB20F72'
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
    hasTarget: false,
    color: '0xDED21D',
    needsTarget: true
  },
  {
    type: 6,
    name: "red_box",
    speed: 100,
    targetsPlayer: false,
    scoreMultiplier: 3,
    rotates: true
  }
];