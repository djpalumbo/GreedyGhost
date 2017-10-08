function initGame()
{ initLevel(4); }

var renderer, rendererHUD;
var scene;
var camera, cameraHUD;
var light = [], lightTarget = [];

var level;
var rc;
var maze;

var sq = 20; // Size of each space
var tile = [];
var outerWall = [], post = []; wall = [];

var firstrow, lastrow, firstcol, lastcol;

var radius = 5;
var player;
var jump = 1.2, jumpRest = false;

var monster = {
                arr  : [],
                dir  : [], // N S E W
                mv   : []
              };
var mvDist = sq / Math.pow(2, 7);
var speedInc = false;
var monstFloat = Math.PI / 2;

var diamond = [], diamond_edge = [];

var help = false, helpRest = false;

var alive = true;
var score = 0, scoreStr = "";
var gameOver = false;

var music;
var music_play = true;

// Make Physijs work correctly
Physijs.scripts.worker = 'libs/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

function initLevel(lvl)
{
  level = lvl;
  rc = 3 * lvl;

  scene = new Physijs.Scene();
  scene.setGravity(new THREE.Vector3(0, 0, -30));

  maze = generateMaze(rc, rc);

  firstrow =  (0.5 * sq * (maze.rows - 1));
  lastrow  = -(0.5 * sq * (maze.rows - 1));
  firstcol = -(0.5 * sq * (maze.cols - 1));
  lastcol  =  (0.5 * sq * (maze.cols - 1));

  createGround();
  createWalls();

  setupCameras();
  setupRenderers();
  addLights();

  createPlayer();
  createMonsters();
  createDiamonds();

  document.getElementById("game").appendChild(renderer.domElement);
  document.getElementById("hud").appendChild(rendererHUD.domElement);

  render();
}

function render()
{
  scene.simulate(); // Physics simulation

  keyboardControls();

  cameraFollow();

  floatMonsters();
  moveMonsters();
  spinDiamonds();
  collectDiamonds();
  updateScore()

  if (!helpRest)
  {
    setTimeout(function () { helpMenu(); helpRest = false; }, 100);
    helpRest = true;
  }

  checkGameStatus();

  requestAnimationFrame(render);
  renderer.render(scene, camera);
  rendererHUD.render(scene, cameraHUD);
}

function setupRenderers()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x000000, 1.0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  rendererHUD = new THREE.WebGLRenderer();
  rendererHUD.setClearColor(0x000000, 0);
  rendererHUD.setSize(document.getElementById("hud").clientHeight,
    document.getElementById("hud").clientHeight);
  rendererHUD.shadowMap.enabled = true;
}

function cameraFollow()
{
  camera.rotation.y;

  camera.position.x = player.position.x + (1 * radius) * Math.sin(camera.rotation.y);
  camera.position.y = player.position.y - (1 * radius) * Math.cos(camera.rotation.y);
  camera.position.z = player.position.z + (1.3 * radius);
}

function setupCameras()
{
  camera = new THREE.PerspectiveCamera(45,
    window.innerWidth / window.innerHeight, 0.1, 1000);

  camera.rotation.x = Math.PI / 2;
  if (!maze.edges[maze.edges.length - 1].active
      && !maze.edges[maze.edges.length - maze.cols].active)
    camera.rotation.y = Math.PI / 4;
  else if (!maze.edges[maze.edges.length - 1].active)
    camera.rotation.y = Math.PI / 2;

  cameraHUD = new THREE.PerspectiveCamera(45,
    document.getElementById("hud").clientHeight
      / document.getElementById("hud").clientHeight,
    0.1, 1000);

  cameraHUD.position.set(0, 0, 25 * rc);
  cameraHUD.lookAt(scene.position);
}

function createGround()
{
  var texture = new THREE.TextureLoader().load('images/dirt.png');
  var mat = new Physijs.createMaterial(
                                  new THREE.MeshLambertMaterial({map:texture}),
                                  0.8,
                                  0.8);
  var geo = new THREE.PlaneGeometry(sq, sq, 1);

  for (var i = 0; i < maze.rows; i++)
  {
    for (var j = 0; j < maze.cols; j++)
    {
      tile[i * maze.cols + j] = new Physijs.BoxMesh(geo, mat, 0);

      tile[i * maze.cols + j].name = "Tile" + (i * maze.cols + j);

      tile[i * maze.cols + j].position.x = (j * sq) - lastcol;
      tile[i * maze.cols + j].position.y = firstrow - (i * sq);

      scene.add(tile[i * maze.cols + j]);
    }
  }

  tile[0].addEventListener('collision',
    function (other_object, linear_velocity, angular_velocity)
    {
      if (other_object.name.includes("Player") && score > 1)
        gameOver = true;
    });
}

function createWalls()
{
  var texture = new THREE.TextureLoader().load('images/stonewall.jpg',
    function (texture)
    {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.offset.set(0, 0);
      texture.repeat.set(maze.rows*2, maze.rows/2);
    });

  // Create outer walls
  for (var i = 0; i < 4; i++)
  {
    outerWall[i] = new Physijs.BoxMesh(
      new THREE.BoxGeometry(sq * maze.cols - 1, 1, 2 * sq),
      new Physijs.createMaterial(new THREE.MeshLambertMaterial({map:texture}),
                                 0.0,
                                 0.8),
      0);
    outerWall[i].name = "OuterWall" + i;

    outerWall[i].position.z = 0.5 * sq;
    switch (i)
    {
      case 0:
        outerWall[i].position.y =  0.5 * sq * maze.rows - 1;
        break;
      case 1:
        outerWall[i].position.y = -0.5 * sq * maze.rows + 1;
        break;
      case 2:
        outerWall[i].position.x =  0.5 * sq * maze.cols - 1;
        outerWall[i].rotation.z = Math.PI / 2;
        break;
      case 3:
        outerWall[i].position.x = -0.5 * sq * maze.cols + 1;
        outerWall[i].rotation.z = Math.PI / 2;
        break;
    }

    scene.add(outerWall[i]);
  }

  texture = new THREE.TextureLoader().load('images/wood.jpg');

  // Create posts connecting each wall
  for (var i = 0; i < (maze.rows - 1); i++)
  {
    for (var j = 0; j < (maze.cols - 1); j++)
    {
      post[i * maze.cols + j] = new Physijs.BoxMesh(
        new THREE.BoxGeometry(2, 2, sq),
        new Physijs.createMaterial(
          new THREE.MeshLambertMaterial({map:texture}),
          0.0,
          0.8),
        0);
      post[i * maze.cols + j].name = "Post" + (i * maze.cols + j);

      post[i * maze.cols + j].position.x = (j * sq) - (0.5 * sq * (maze.cols - 2));
      post[i * maze.cols + j].position.y = (0.5 * sq * (maze.rows - 2)) - (i * sq);
      post[i * maze.cols + j].position.z = 0.5 * sq;

      scene.add(post[i * maze.cols + j]);
    }
  }

  texture = new THREE.TextureLoader().load('images/stonewall.jpg');

  // Create inner walls
  for (var i = 0; i < maze.edges.length; i++)
  {
    if (!maze.edges[i].active)
      continue;

    var axis = maze.edges[i].b - maze.edges[i].a > 1 ? 'x' : 'y';

    wall[i] = new Physijs.BoxMesh(
      new THREE.BoxGeometry((axis === 'x' ? sq - 2 : 2),
                            (axis === 'y' ? sq - 2 : 2),
                            (sq - 2)),
      new Physijs.createMaterial(new THREE.MeshPhongMaterial({map:texture}),
                                 0.0, 0.8),
      0);
    wall[i].name = "Wall" + i;

    wall[i].position.z = 0.5 * (sq - 2);

    if (axis === 'x')
    {
      wall[i].position.x = (maze.nodes[maze.edges[i].a].c * sq)
                           - lastcol;
      wall[i].position.y = (0.5 * sq * (maze.rows - 2))
                           - (maze.nodes[maze.edges[i].a].r * sq);
    }
    else // if (axis === 'y')
    {
      wall[i].position.x = (maze.nodes[maze.edges[i].a].c * sq)
                           - (0.5 * sq * (maze.cols - 2));
      wall[i].position.y = firstrow
                           - (maze.nodes[maze.edges[i].a].r * sq);
      wall[i].rotation.x = Math.PI / 2;
    }

    scene.add(wall[i]);
  }
}

function createPlayer()
{
  var mat = new Physijs.createMaterial(
    new THREE.MeshLambertMaterial({color:"white", opacity: 0.7,
    transparent: true}), 0.8, 0.3);

  var geo = new THREE.SphereGeometry(radius, 32, 32);

  player = new Physijs.SphereMesh(geo, mat, 1);

  player.name = "Player";

  player.position.x = tile[tile.length - 1].position.x;
  player.position.y = tile[tile.length - 1].position.y;
  player.position.z = radius;

  player.addEventListener('collision',
    function (other_object, linear_velocity, angular_velocity)
    {
      if (other_object.name.includes("Monster"))
      {
        if (player.position.z > other_object.position.z + radius)
        {
          console.log("boing!");
        }
        else
        {
          console.log("owie!");
          if (!gameOver)
            alive = false;
        }
      }
    });

  scene.add(player);
}

function createMonsters()
{
  var mat = new Physijs.createMaterial(
    new THREE.MeshLambertMaterial({color:"black", opacity: 0.8,
    transparent: true}), 0.8, 0.3);

  var geo = new THREE.SphereGeometry(radius, 32, 32);

  for (var i = 0; i < level; i++)
  {
    monster.arr[i] = new Physijs.SphereMesh(geo, mat, 1);

    monster.arr[i].name = "Monster" + i;

    monster.arr[i].position.z = radius;

    switch (i)
    {
      case 0:
        monster.arr[i].position.x
          = sq * getRandInt(0, Math.floor((maze.cols - 1) / 2)) - lastcol;
        monster.arr[i].position.y
          = firstrow - sq * getRandInt(0, Math.floor((maze.rows - 1) / 2));
        break;
      case 1:
        monster.arr[i].position.x
          = sq * getRandInt(Math.floor((maze.cols - 1) / 2) + 1, maze.cols - 1)
            - lastcol;
        monster.arr[i].position.y
          = firstrow - sq * getRandInt(0, Math.floor((maze.rows - 1) / 2));
        break;
      case 2:
        monster.arr[i].position.x
          = sq * getRandInt(0, Math.floor((maze.cols - 1) / 2)) - lastcol;
        monster.arr[i].position.y
          = firstrow
            - sq * getRandInt(Math.floor((maze.rows - 1) / 2) + 1, maze.rows - 1);
        break;
      case 3:
        monster.arr[i].position.x
          = sq * getRandInt(Math.floor((maze.cols - 1) / 2) + 1, maze.cols - 3)
            - lastcol;
        monster.arr[i].position.y
          = firstrow
            - sq * getRandInt(Math.floor((maze.rows - 1) / 2) + 1, maze.rows - 3);
        break;
    }

    monster.dir[i] = null;

    monster.mv[i] = false;

    scene.add(monster.arr[i]);
  }
}

function moveMonsters()
{
  for (var i = 0; i < monster.arr.length; i++)
  {
    monster.mv[i] = isMoving(i);

    if (!monster.mv[i])
    {
      if (speedInc)
      {
        mvDist *= 2;
        speedInc = false;
      }

      monster.dir[i] = getNextDir(i);
    }

    moveMnstr(i);
  }
}

function getNextDir(mNo)
{
  if (monster.dir[mNo] === null)
  {
    var psblDirs = getRandDirs(['N', 'S', 'E', 'W']);

    if (canMoveDir(mNo, psblDirs[0]))
      return psblDirs[0];
    else if (canMoveDir(mNo, psblDirs[1]))
      return psblDirs[1];
    else if (canMoveDir(mNo, psblDirs[2]))
      return psblDirs[2];
    else
      return psblDirs[3];
  }
  else if (canMoveDir(mNo, monster.dir[mNo]))
  {
    var psblDirs;
    switch (monster.dir[mNo])
    {
      case 'N':
        psblDirs = ['N', 'E', 'W'];
        break;
      case 'S':
        psblDirs = ['S', 'E', 'W'];
        break;
      case 'E':
        psblDirs = ['N', 'S', 'E'];
        break;
      case 'W':
        psblDirs = ['N', 'S', 'W'];
        break;
    }

    psblDirs = getRandDirs(psblDirs);

    if (canMoveDir(mNo, psblDirs[0]))
      return psblDirs[0];
    else if (canMoveDir(mNo, psblDirs[1]))
      return psblDirs[1];
    else
      return psblDirs[2];
  }
  else
  {
    var nextDir = getRandInt(0, 1);

    switch (monster.dir[mNo])
    {
      case 'N':
        if (canMoveDir(mNo, (nextDir ? 'E' : 'W')))
          return (nextDir ? 'E' : 'W');
        else if (canMoveDir(mNo, (nextDir ? 'W' : 'E')))
          return (nextDir ? 'W' : 'E');
        else
          return 'S';
      case 'S':
        if (canMoveDir(mNo, (nextDir ? 'E' : 'W')))
          return (nextDir ? 'E' : 'W');
        else if (canMoveDir(mNo, (nextDir ? 'W' : 'E')))
          return (nextDir ? 'W' : 'E');
        else
          return 'N';
      case 'E':
        if (canMoveDir(mNo, (nextDir ? 'N' : 'S')))
          return (nextDir ? 'N' : 'S');
        else if (canMoveDir(mNo, (nextDir ? 'S' : 'N')))
          return (nextDir ? 'S' : 'N');
        else
          return 'W';
      case 'W':
        if (canMoveDir(mNo, (nextDir ? 'N' : 'S')))
          return (nextDir ? 'N' : 'S');
        else if (canMoveDir(mNo, (nextDir ? 'S' : 'N')))
          return (nextDir ? 'S' : 'N');
        else
          return 'E';
    }
  }
}

function canMoveDir(mNo, dir)
{
  var xTile = getXTile(mNo);
  var yTile = getYTile(mNo);

  if (dir === 'N' && yTile === 0)
    return false;
  if (dir === 'S' && yTile === maze.rows - 1)
    return false;
  if (dir === 'E' && xTile === maze.cols - 1)
    return false;
  if (dir === 'W' && xTile === 0)
    return false;

  var tileNo = getTileNo(xTile, yTile);
  var edgeNo;

  switch (dir)
  {
    case 'N':
      edgeNo = (yTile - 1) * (maze.rows * 2 - 1) + (xTile * 2)
               + (xTile != maze.cols - 1 ? 1 : 0);
      break;
    case 'S':
      edgeNo = yTile * (maze.rows * 2 - 1) + (xTile * 2)
               + (xTile != maze.cols - 1 ? 1 : 0);
      break;
    case 'E':
      edgeNo = yTile * (maze.rows * 2 - 1)
               + (xTile * (yTile != maze.rows - 1 ? 2 : 1));
      break;
    case 'W':
      edgeNo = yTile * (maze.rows * 2 - 1)
               + ((xTile - 1) * (yTile != maze.rows - 1 ? 2 : 1));
      break;
  }

  return !maze.edges[edgeNo].active;
}

function getTileNo(x, y)
{ return y * maze.cols + x; }

function getXTile(mNo)
{
  return Math.floor(maze.cols / 2)
         + Math.floor(monster.arr[mNo].position.x / sq);
}

function getYTile(mNo)
{
  return Math.floor(maze.rows / 2)
         - Math.ceil(monster.arr[mNo].position.y / sq);
}

function getRandDirs(dirs)
{
  var rando, randDirs = [];

  while (dirs.length > 0)
  {
    rando = getRandInt(0, dirs.length - 1);
    randDirs.push(dirs[rando]);
    dirs.splice(rando, 1);
  }

  return randDirs;
}

function isMoving(mNo)
{
  return !((monster.arr[mNo].position.x + (maze.cols % 2 === 0 ? sq/2 : 0)) % sq === 0
        && (monster.arr[mNo].position.y + (maze.rows % 2 === 0 ? sq/2 : 0)) % sq === 0)
}

function moveMnstr(mNo)
{
  switch (monster.dir[mNo])
  {
    case 'N':
      monster.arr[mNo].position.y += mvDist;
      break;
    case 'S':
      monster.arr[mNo].position.y -= mvDist;
      break;
    case 'E':
      monster.arr[mNo].position.x += mvDist;
      break;
    case 'W':
      monster.arr[mNo].position.x -= mvDist;
      break;
  }
}

function floatMonsters()
{
  for (var i = 0; i < monster.arr.length; i++)
  {
    monster.arr[i].__dirtyPosition = true;

    monster.arr[i].position.z = (1/2) + radius + (1/2) * Math.cos(monstFloat);
    monstFloat += 2 * Math.PI / 180;
    if (monstFloat >= 2 * Math.PI)
      monstFloat = 0;
  }
}

function createDiamonds()
{
  var geo = new THREE.SphereGeometry((3/4) * radius, 4, 2);
  var mesh = new THREE.MeshBasicMaterial({color: "blue", opacity: 0.6,
    transparent: true});
  var lgeo = new THREE.EdgesGeometry(geo);
  var lmesh = new THREE.LineBasicMaterial({color: "black"});

  for (var i = 0; i < 2; i++)
  {
    diamond[i] = new THREE.Mesh(geo, mesh);
    diamond_edge[i] = new THREE.LineSegments(lgeo, lmesh);

    diamond[i].name = "Diamond" + i;

    diamond[i].position.z = diamond_edge[i].position.z = radius;

    switch (i)
    {
      case 0:
        diamond[i].position.x = diamond_edge[i].position.x = lastcol;
        diamond[i].position.y = diamond_edge[i].position.y = firstrow;
        break;
      case 1:
        diamond[i].position.x = diamond_edge[i].position.x = firstcol;
        diamond[i].position.y = diamond_edge[i].position.y = lastrow;
        break;
    }

    scene.add(diamond[i]);
    scene.add(diamond_edge[i]);
  }
}

function spinDiamonds()
{
  for (var i = 0; i < diamond.length; i++)
  {
    diamond[i].rotation.z += Math.PI / 180;
    diamond_edge[i].rotation.z += Math.PI / 180;
  }
}

function collectDiamonds()
{
  if (scene.getObjectByName("Diamond0")
      && Math.abs(player.position.x - lastcol) < ((4/3) * radius)
      && Math.abs(player.position.y - firstrow) < ((4/3) * radius))
  {
    scene.remove(diamond[0]);
    scene.remove(diamond_edge[0]);
    score++;
    scoreStr += "&nbsp;&#9672;";
    speedInc = true;
  }
  else if (scene.getObjectByName("Diamond1")
           && Math.abs(player.position.x - firstcol) < ((4/3) * radius)
           && Math.abs(player.position.y - lastrow) < ((4/3) * radius))
  {
    scene.remove(diamond[1]);
    scene.remove(diamond_edge[1]);
    score++;
    scoreStr += "&nbsp;&#9672;";
    speedInc = true;
  }
}

function addLights()
{
  for (var i = 0; i < 5; i++)
  {
    light[i] = new THREE.SpotLight();
    lightTarget[i] = new THREE.Object3D();

    light[i].name = "Light" + i;

    light[i].shadow.cameraNear = 10;
    light[i].shadow.cameraFar = 100;
    light[i].castShadow = true;

    light[i].angle = 0.75;
    light[i].intensity = 1.5;
    light[i].penumbra = 0.1;

    light[i].position.z = (3/8) * rc * sq;
    switch (i)
    {
      case 0:
        light[i].color = new THREE.Color(0xff7d14);
        light[i].position.x = firstcol;
        light[i].position.y = firstrow;
        lightTarget[i].position.x = firstcol / 2;
        lightTarget[i].position.y = firstrow / 2;
        break;
      case 1:
        light[i].color = new THREE.Color(0x1481ff);
        light[i].position.x = lastcol;
        light[i].position.y = firstrow;
        lightTarget[i].position.x = lastcol / 2;
        lightTarget[i].position.y = firstrow / 2;
        break;
      case 2:
        light[i].color = new THREE.Color(0xeb14ff);
        light[i].position.x = firstcol;
        light[i].position.y = lastrow;
        lightTarget[i].position.x = firstcol / 2;
        lightTarget[i].position.y = lastrow / 2;
        break;
      case 3:
        light[i].color = new THREE.Color(0x4fff19);
        light[i].position.x = lastcol;
        light[i].position.y = lastrow;
        lightTarget[i].position.x = lastcol / 2;
        lightTarget[i].position.y = lastrow / 2;
        break;
      case 4:
        light[i].intensity = 0.7;
        break;
    }

    scene.add(lightTarget[i]);
    light[i].target = lightTarget[i];

    scene.add(light[i]);
  }
}

function keyboardControls()
{
  // Player motion controls
  if (Key.isDown(Key.W) && player.position.z < radius + 0.1) //     Move forward
    player.applyCentralImpulse(new THREE.Vector3(
      -Math.sin(camera.rotation.y), Math.cos(camera.rotation.y), 0));
  if (Key.isDown(Key.S) && player.position.z < radius + 0.1) //    Move backward
    player.applyCentralImpulse(new THREE.Vector3(
      Math.sin(camera.rotation.y), -Math.cos(camera.rotation.y), 0));
  if (Key.isDown(Key.A) && player.position.z < radius + 0.1) //      Strafe left
    player.applyCentralImpulse(new THREE.Vector3(
      -Math.sin(Math.PI/2 + camera.rotation.y),
      Math.cos(Math.PI/2 + camera.rotation.y), 0));
  if (Key.isDown(Key.D) && player.position.z < radius + 0.1) //     Strafe right
    player.applyCentralImpulse(new THREE.Vector3(
      Math.sin(Math.PI/2 + camera.rotation.y),
      -Math.cos(Math.PI/2 + camera.rotation.y), 0));
  if (Key.isDown(Key.SPACE)) //                                             Jump
    if (!jumpRest)
    {
      if (player.position.z < radius + 0.1)
        player.applyCentralImpulse(new THREE.Vector3(0, 0, jump * sq));

      jumpRest = true;

      setTimeout(function () { jumpRest = false; }, 400);
    }

  // Player camera controls
  if (Key.isDown(Key.LEFTARROW)) //                                    Look left
    camera.rotation.y += Math.PI / 60;
  if (Key.isDown(Key.RIGHTARROW)) //                                  Look right
    camera.rotation.y -= Math.PI / 60;

  // Show help menu
  if (Key.isDown(Key.H))
    if (!helpRest) { help = !help; }

  // Toggle music on/off
  //if (Key.isDown(Key.M))
  //{
  //  music_play = !music_play;
  //  if (music_play)
  //    music.play();
  //  else
  //    music.pause();
  //}
}

function updateScore()
{
  if (gameOver)
    document.getElementById('score').innerHTML = "Score:<lg>"
      + scoreStr + "</lg>";
  else
  {
    if (score === 0)
      document.getElementById('score').innerHTML = "Score: <lg>-"
        + "</lg><br><sm>&nbspCollect the diamonds!</sm>";
    else if (score === 1)
      document.getElementById('score').innerHTML = "Score:<lg>"
        + scoreStr + "</lg><br><sm>&nbspOnly one diamond left!</sm>";
    else if (score === 2)
      document.getElementById('score').innerHTML = "Score:<lg>"
        + scoreStr + "</lg><br><sm>&nbspGet to the finish!</sm>";
  }
}

function checkGameStatus()
{
  if (alive)
  {
    if (gameOver)
    {
      gameOverScreen();
      jump = 1.8;
    }
  }
  else // if (!alive)
  {
    gameOver = true;
    gameOverScreen();
  }
}

function gameOverScreen()
{
  if (alive)
    document.getElementById('gameOver').innerHTML =
      "<br>YOU WIN";
  else
    document.getElementById('gameOver').innerHTML =
      "<br>YOU LOSE"
      + "<br><sm>Refresh to try again</sm>";
}

function helpMenu()
{
  if (help)
  {
    document.getElementById('help').innerHTML =
      "<br><u>Hints</u>"
      + "<br>Collect the diamonds"
        + "<br>&nbsp;in each corner,"
      + "<br>&nbsp;then get to the far"
        + "<br>&nbsp;corner to win!</br>"
      + "<br>Jump on top of your"
        + "<br>&nbsp;enemy to avoid harm!</br>"

      + "<br><u>Controls</u>"
      + "<br>Arrow keys&nbsp;: Camera"
      + "<br>&nbsp;&nbsp;&nbsp;WASD&nbsp;&nbsp;&nbsp; : Movements"
      + "<br>&nbsp;Spacebar&nbsp;&nbsp;: Jump"
      + "<br>&nbsp;&nbsp;&nbsp;&nbsp;M&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
        + ": Toggle music (" + (music_play ? "ON" : "OFF") + ")";
  }
  else
    document.getElementById('help').innerHTML =
      "Press H to toggle the help menu";
}

function loadSounds()
{
  music = new Audio("sounds/music.wav");
}

function playMusic()
{
  music.addEventListener('ended', function()
  {
    if (music_play)
    {
      this.currentTime = 0;
      this.play();
    }
  }, false);
  music.play();
}

function generateMaze(num_rows, num_cols) // Inverted graph - edges are walls
{
  var graph = {rows: num_rows, cols: num_cols, nodes: [], edges: []};
  var cardinality = num_rows * num_cols;

  // Create nodes
  for (var i = 0; i < cardinality; i++)
    graph.nodes.push({id : i,
                      r  : Math.floor((i / graph.cols) + 0),
                      c  : (i % graph.cols)});

  // Create edges
  for (var i = 0; i < cardinality; i++)
  {
    if ((i % graph.cols) < (graph.cols - 1))
      graph.edges.push({active: null, a: i, b: i+1});
    if (Math.floor(i / graph.cols) != (graph.rows - 1))
      graph.edges.push({active: null, a: i, b: (i + graph.cols)});
  }

  var numTrue = 0, numFalse = 0;
  var rand;
  while (numTrue + numFalse < graph.edges.length)
  {
    rand = getRandEdge(graph);
    // Step
    while (!(graph.edges[rand].active === null))
      rand = getRandEdge(graph);

    if (isConnectedNode(graph, graph.edges[rand].a, graph.edges[rand].b))
    {
      graph.edges[rand].active = true;
      numTrue++;
    }
    else
    {
      graph.edges[rand].active = false;
      numFalse++;
    }
  }

  return graph;
}

function isConnectedNode(graph, id_a, id_b) // Dijkstra
{
  // Initialization
  var inf = Number.MAX_SAFE_INTEGER;
  var known = [], cost = [], path = [];
  var queue = [id_a];
  for (var i = 0; i < graph.nodes.length; i++)
  {
    known.push(false);
    cost.push(inf);
    path.push(-1);
  }
  cost[id_a] = 0;

  // Run the algorithm
  while (queue.length != 0)
  {
    // Find cheapest unknown vertex
    var min;
    for (min = 0; min < known.length; min++) // Get first unknown node
      if (!known[min])
        break;
    for (var i = min; i < cost.length; i++) // Find index of node with min cost
      if (!known[i])
        if (cost[i] < cost[min])
          min = i;

    known[min] = true;
    if (known[id_b])
      return true;

    // Remove min from queue
    for (i = 0; i < queue.length; i++)
      if (queue[i] === min)
        queue.splice(i, 1); // Remove from queue

    // Update neighbors of min
    for (var i = 0; i < graph.edges.length; i++) // Go through all edges
    {
      if ((graph.edges[i].active === true) || (graph.edges[i].active === null))
        continue;
      else if ((graph.edges[i].a != min) && (graph.edges[i].b != min))
        continue;
      else if (graph.edges[i].a === id_a && graph.edges[i].b === id_b)
        continue;
      else
      {
        if (graph.edges[i].a === min)
        {
          if (cost[graph.edges[i].b] > cost[min] + 1)
          {
            cost[graph.edges[i].b] = cost[min] + 1;
            path[graph.edges[i].b] = min;

            queue.push(graph.edges[i].b);
          }
        }
        else if (graph.edges[i].b === min)
        {
          if (cost[graph.edges[i].a] > cost[min] + 1)
          {
            cost[graph.edges[i].a] = cost[min] + 1;
            path[graph.edges[i].a] = min;

            queue.push(graph.edges[i].a);
          }
        }
      }
    }
  }

  return known[id_b];
}

function getRandEdge(graph) // Helper to isConnectedNode()
{ return Math.floor(Math.random() * graph.edges.length); }

function getRandInt(min, max)
{ return Math.floor(Math.random() * (max - min + 1)) + min; }

