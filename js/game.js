// TODO
//  Fix jumping mechanic
//  Enemies
//    Jump on top to stun/kill them?
//  Add food
//    Two in either corner (needed to proceed to next level)
//    Randomly placed other foods (+ points)
//  Scores
//  Level progressions
//    7, 14, 21...?
//  Game over screen

var DEBUG = true;

var renderer, rendererHUD;
var scene;
var camera, cameraHUD;
var light = [], lightTarget = [];

var rc = 14; // Number of rows & columns (the grid is square)
var maze;

var sq = 20; // Size of each space
var tile = [];
var outerWall = [], post = []; wall = [];

var radius = 5;
var player;
var jumpRest = false;

var help = false;
var helpRest = false;

var score = 0;
var gameOver = false;

var music;
var music_play = true;

// Make Physijs work correctly
Physijs.scripts.worker = 'libs/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

function initGame()
{
  scene = new Physijs.Scene();
  scene.setGravity(new THREE.Vector3(0, 0, -30));

  maze = generateMaze(rc, rc);

  createGround();
  createWalls();

  setupCameras();
  setupRenderers();
  addLights();

  createPlayer();

  document.body.appendChild(renderer.domElement);
  document.getElementById("hud").appendChild(rendererHUD.domElement);

  render();
}

function render()
{
  scene.simulate(); // Physics simulation

  keyboardControls();

  cameraFollow();

  if (!helpRest) { showHelp(); helpRest = true; }

  if (!gameOver) { checkGameStatus(); }

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

      tile[i * maze.cols + j].position.x = (j * sq) - (0.5 * sq * (maze.cols - 1));
      tile[i * maze.cols + j].position.y = (0.5 * sq * (maze.rows - 1)) - (i * sq);

      scene.add(tile[i * maze.cols + j]);
    }
  }
}

function createWalls()
{
  var texture = new THREE.TextureLoader().load('images/stonewall.jpg',
    function (texture)
    {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.offset.set(0, 0);
      texture.repeat.set(maze.rows*4, maze.rows/4);
    });

  // Create outer walls
  for (var i = 0; i < 4; i++)
  {
    outerWall[i] = new Physijs.BoxMesh(
      new THREE.BoxGeometry(sq * maze.cols - 1, 1, sq),
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
                           - (0.5 * sq * (maze.cols - 1));
      wall[i].position.y = (0.5 * sq * (maze.rows - 2))
                           - (maze.nodes[maze.edges[i].a].r * sq);
    }
    else // if (axis === 'y')
    {
      wall[i].position.x = (maze.nodes[maze.edges[i].a].c * sq)
                           - (0.5 * sq * (maze.cols - 2));
      wall[i].position.y = (0.5 * sq * (maze.rows - 1))
                           - (maze.nodes[maze.edges[i].a].r * sq);
      wall[i].rotation.x = Math.PI / 2;
    }

    scene.add(wall[i]);
  }
}

function createPlayer()
{
  var mat = new Physijs.createMaterial(
    new THREE.MeshLambertMaterial({color:"white", opacity: 0.8,
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
      if (other_object.name.includes("Tile"))
        ;
    });

  scene.add(player);
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
        light[i].position.x = -(0.5 * sq * (maze.cols - 1));
        light[i].position.y = (0.5 * sq * (maze.rows - 1));
        lightTarget[i].position.x = -(0.25 * sq * (maze.cols - 1));
        lightTarget[i].position.y = (0.25 * sq * (maze.rows - 1));
        break;
      case 1:
        light[i].color = new THREE.Color(0x1481ff);
        light[i].position.x = (0.5 * sq * (maze.cols - 1));
        light[i].position.y = (0.5 * sq * (maze.rows - 1));
        lightTarget[i].position.x = (0.25 * sq * (maze.cols - 1));
        lightTarget[i].position.y = (0.25 * sq * (maze.rows - 1));
        break;
      case 2:
        light[i].color = new THREE.Color(0xeb14ff);
        light[i].position.x = -(0.5 * sq * (maze.cols - 1));
        light[i].position.y = -(0.5 * sq * (maze.rows - 1));
        lightTarget[i].position.x = -(0.25 * sq * (maze.cols - 1));
        lightTarget[i].position.y = -(0.25 * sq * (maze.rows - 1));
        break;
      case 3:
        light[i].color = new THREE.Color(0x4fff19);
        light[i].position.x = (0.5 * sq * (maze.cols - 1));
        light[i].position.y = -(0.5 * sq * (maze.rows - 1));
        lightTarget[i].position.x = (0.25 * sq * (maze.cols - 1));
        lightTarget[i].position.y = -(0.25 * sq * (maze.rows - 1));
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
  camera.position.x = player.position.x + (radius/2) * Math.sin(camera.rotation.y);
  camera.position.y = player.position.y + (radius/2) * Math.cos(camera.rotation.y);

  // Player motion controls
  if (Key.isDown(Key.W)) //                                         Move forward
    player.applyCentralImpulse(new THREE.Vector3(
      -Math.sin(camera.rotation.y), Math.cos(camera.rotation.y), 0));
  if (Key.isDown(Key.S)) //                                        Move backward
    player.applyCentralImpulse(new THREE.Vector3(
      Math.sin(camera.rotation.y), -Math.cos(camera.rotation.y), 0));
  if (Key.isDown(Key.A)) //                                          Strafe left
    player.applyCentralImpulse(new THREE.Vector3(
      -Math.sin(Math.PI/2 + camera.rotation.y),
      Math.cos(Math.PI/2 + camera.rotation.y), 0));
  if (Key.isDown(Key.D)) //                                         Strafe right
    player.applyCentralImpulse(new THREE.Vector3(
      Math.sin(Math.PI/2 + camera.rotation.y),
      -Math.cos(Math.PI/2 + camera.rotation.y), 0));
  if (Key.isDown(Key.SPACE)) //                                             Jump
    if (player.position.z === radius)
      player.applyCentralImpulse(new THREE.Vector3(0, 0, sq/2));

  // Player camera controls
  if (Key.isDown(Key.LEFTARROW)) //                                    Turn left
    camera.rotation.y += Math.PI / 60;
  if (Key.isDown(Key.RIGHTARROW)) //                                   Turn right
    camera.rotation.y -= Math.PI / 60;
}

function checkGameStatus()
{
  
}

function helpMenu()
{
  if (help)
  {
    document.getElementById('help').innerHTML =
      "<br><u>Controls</u>"
      + "<br>WASD : Movements"
      + "<br>&nbsp;&nbsp;&nbsp;M : Toggle music"
        + " (" + (music_play ? "ON" : "OFF") + ")";
  }
  else
    document.getElementById('help').innerHTML =
      "Press H to toggle the help menu";
}

function gameOverScreen()
{
  if (gameOver)
  {
    if (score === 4)
      document.getElementById('gameOver').innerHTML =
        "<br><big>YOU WIN</big>"
        + "<br>&nbsp&nbspTotals:"
        + "<br>&nbsp&nbsp&nbsp" + score + " points"
        + "<br>&nbsp&nbsp<u>&nbsp" + (total - score) + " balls left&nbsp</u>"
        + "<br>&nbsp&nbsp&nbsp" + total + " overall";
    else
      document.getElementById('gameOver').innerHTML =
        "<br><big>YOU LOSE</big>"
        + "<br>Refresh to try again!";
  }
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

function loadSounds()
{
  music = new Audio("sounds/music.wav");
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

function printMaze(maze)
{
  var str0 = "";

  for (var j = 0; j < maze.cols; j++)
    str0 += "---";

  console.log(str0 + "-");

  for (var i = 0; i < maze.rows; i++)
  {
    var str1 = "|", str2 = "|";

    for (var j = 0; j < (maze.cols - 1); j++)
      str1 += ("  " + (isInEdges(maze, (i * maze.cols + j),
                      (i * maze.cols + j + 1)) ? "|" : " "));

    if (i < maze.rows - 1)
      for (var j = 0; j < maze.cols; j++)
        str2 += ((isInEdges(maze, (i * maze.cols + j),
                            ((i + 1) * maze.cols + j)) ? "--" : "  ")
                + ((j < maze.cols - 1) ? "+" : ""));

    console.log(str1 + "  |");
    if (maze.rows - i > 1)
      console.log(str2 + "|");
  }

  console.log(str0 + "-");
}

function isInEdges(maze, id_a, id_b) // Helper to printMaze()
{
  for (var i = 0; i < maze.edges.length; i++)
    if (maze.edges[i].a === id_a && maze.edges[i].b === id_b)
    {
      if (maze.edges[i].active || maze.edges[i].active === null)
        return true;
      else
        return false;
    }

  return true;
}

function getRandEdge(graph) // Helper to isConnectedNode()
{ return Math.floor(Math.random() * graph.edges.length); }

function showHelp()
{ setTimeout(function () { helpMenu(); helpRest = false; }, 100); }

function updateScore()
{ document.getElementById('score').innerHTML = "Score: " + score; }

function getRandomFloat(min, max)
{ return min + (Math.random() * (max - min)); }

function getRandomInt(min, max)
{ return Math.floor(Math.random() * (max - min + 1)) + min; }

