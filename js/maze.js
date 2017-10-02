var maze = generateMaze(26, 26);
printMaze(maze);

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
  for (var i = 0; i < maze.rows; i++)
  {
    for (var j = 0; j < (maze.cols - 1); j++)
      process.stdout.write(" "
        + (isInEdges(maze, (i * maze.cols + j), (i * maze.cols + j + 1)) ? "|" : " "));
    console.log();

    if (i < maze.rows - 1)
      for (var j = 0; j < maze.cols; j++)
        process.stdout.write(
          (isInEdges(maze, (i * maze.cols + j), ((i + 1) * maze.cols + j)) ? "-" : " ")
          + ((j < maze.cols - 1) ? "+" : ""));
    console.log();
  }
}

function isInEdges(maze, id_a, id_b) // Helper to printMaze
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

function getRandEdge(graph)
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

