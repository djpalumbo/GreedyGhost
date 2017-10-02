var DEBUG = true;

var renderer;
var scene;
var camera;
var spotLight;

var help = false;
var helpRest = false;

var score = 0;
var gameOver = false;
var total;

var music;
var music_play = true;

// Make Physijs work correctly
Physijs.scripts.worker = 'libs/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

var maze;

function initGame()
{
  scene = new Physijs.Scene();
  scene.setGravity(new THREE.Vector3(0, 0, -30));

  maze = generateMaze(8,8);
  if (DEBUG)
    printMaze(maze);

  camera = new THREE.PerspectiveCamera(45,
    window.innerWidth / window.innerHeight, 0.1, 1000);
  setupRenderer();
  addSpotLight();

  document.body.appendChild(renderer.domElement); // Output to the stream
  render();
}

function render()
{
  scene.simulate(); // Physics simulation

  keyboardControls();

  if (!helpRest) { showHelp(); helpRest = true; }

  if (!gameOver) { checkGameStatus(); }

  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

function checkGameStatus()
{
  
}

function keyboardControls()
{
  
}

function setupRenderer()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x000000, 1.0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
}

function addSpotLight()
{
  spotLight = new THREE.SpotLight(0xffbfb5);
  spotLight.position.set(0, 0, 275);
  spotLight.shadow.cameraNear = 10;
  spotLight.shadow.cameraFar = 100;
  spotLight.castShadow = true;
  spotLight.intensity = 1.5;
  spotLight.penumbra = 1;
  scene.add(spotLight);
}

function helpMenu()
{
  if (help)
  {
    document.getElementById('help').innerHTML =
      "<br><u>Controls</u>"
      + "<br>WASD : Aim the cannon"
      + "<br>&nbsp;&nbsp;&nbsp;F : Fire the cannon!"
      + "<br>&nbsp;&nbsp;&nbsp;R : Reload"
      + "<br>&nbsp;&nbsp;&nbsp;M : Toggle music"
        + " (" + (music_play ? "ON" : "OFF") + ")";
  }
  else
    document.getElementById('help').innerHTML =
      "<sf>Press H to toggle the help menu</sf>";
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

//function printNodes(graph)
//{
//  for (var i = 0; i < graph.nodes.length; i++)
//    console.log(graph.nodes[i]);
//  console.log();
//}
//
//function printEdges(graph)
//{
//  for (var i = 0; i < graph.edges.length; i++)
//    console.log(graph.edges[i]);
//  console.log();
//}

function showHelp()
{ setTimeout(function () { helpMenu(); helpRest = false; }, 100); }

function updateScore()
{ document.getElementById('score').innerHTML = "Score: " + score; }

function getRandomFloat(min, max)
{ return min + (Math.random() * (max - min)); }

function getRandomInt(min, max)
{ return Math.floor(Math.random() * (max - min + 1)) + min; }

