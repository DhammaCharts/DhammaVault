async function drawGraph(url,
  baseUrl,
  pathColors,
  depth,
  enableDrag,
  enableLegend,
  enableZoom,
  scale,
  repelForce,
  centerForce,   // in progress 
  linkDistance,  // in progress
  fontSize,
  opacityNode,
  labelBottom = true,
  squareFrame = false) {

  // Graph variable are in data/graphConfig.yaml
  // add varialbe for arrow, text-fade threshold, node size, link thickness,
  // could add a 3d option https://github.com/vasturiano/d3-force-3d

  // -------------------

  // creates data

  const { index, links, content } = await fetchData
  const curPage = url.replace(baseUrl, "")

  const parseIdsFromLinks = (links) => [...(new Set(links.flatMap(link => ([link.source, link.target]))))]

  const neighbours = new Set()
  const wl = [curPage || "/", "__SENTINEL"]
  if (depth >= 0) {
    while (depth >= 0 && wl.length > 0) {
      // compute neighbours
      const cur = wl.shift()
      if (cur === "__SENTINEL") {
        depth--
        wl.push("__SENTINEL")
      } else {
        neighbours.add(cur)
        const outgoing = index.links[cur] || []
        const incoming = index.backlinks[cur] || []
        wl.push(...outgoing.map(l => l.target), ...incoming.map(l => l.source))
      }
    }
  } else {
    parseIdsFromLinks(links).forEach(id => neighbours.add(id))
  }

  const data = {
    nodes: [...neighbours].map(id => ({ id })),
    links: links.filter(l => neighbours.has(l.source) && neighbours.has(l.target)),
  }

  // color function

  const color = (d) => {
    if (d.id === curPage || (d.id === "/" && curPage === "")) {
      return "var(--g-node-active)"
    }

    for (const pathColor of pathColors) {
      const path = Object.keys(pathColor)[0]
      const colour = pathColor[path]
      if (d.id.startsWith(path)) {
        return colour
      }
    }

    return "var(--g-node)"
  }

  // drag

  const drag = simulation => {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(1).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    const noop = () => { }
    return d3.drag()
      .on("start", enableDrag ? dragstarted : noop)
      .on("drag", enableDrag ? dragged : noop)
      .on("end", enableDrag ? dragended : noop);
  }

  const height = squareFrame ? 500 : 250;
  const width = document.getElementById("graph-container").offsetWidth

  // simulation

  const simulation = d3.forceSimulation(data.nodes)
    .force("charge", d3.forceManyBody().strength(-100 * repelForce))
    .force("link", d3.forceLink(data.links).id(d => d.id).distance(40))
    // .force("center", d3.forceCenter(0, 0))
    .force("x", d3.forceX(0).strength(0.1))
    .force("y", d3.forceY(0).strength(0.1))
  // .force("collide", d3.forceCollide(9))
  // .force("x", d3.forceX(width / 2).strength(0.02)
  //  .force("y", d3.forceY(height / 2).stren

  // container

  const svg = d3.select('#graph-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr("viewBox", [-width / 2 * 1 / scale, -height / 2 * 1 / scale, width * 1 / scale, height * 1 / scale])
    .style("font-size", fontSize);

  // Legend

  if (enableLegend) {
    const legend = [
      { "Current": "var(--g-node-active)" },
      { "Note": "var(--g-node)" },
      ...pathColors
    ]
    legend.forEach((legendEntry, i) => {
      const key = Object.keys(legendEntry)[0]
      const colour = legendEntry[key]
      svg.append("circle").attr("cx", -width / 2 + 20).attr("cy", height / 2 - 30 * (i + 1)).attr("r", 6).style("fill", colour)
      svg.append("text").attr("x", -width / 2 + 40).attr("y", height / 2 - 30 * (i + 1)).text(key).style("font-size", "15px").attr("alignment-baseline", "middle")
    })
  }

  // draw links between nodes

  const link = svg.append("g")
    .selectAll("line")
    .data((data.links))
    .join("line")
    .attr("marker-end", "url(#arrow)")
    .attr("class", "link")
    .attr("stroke", "var(--g-link)")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#end)");

  // calculate node Radius

  const nodeRadius = (d) => {
    const numOut = index.links[d.id]?.length || 0;
    const numIn = index.backlinks[d.id]?.length || 0;
    return 3 + (numOut + numIn) / 4;
  }

  // build the arrows
  // from https://observablehq.com/@harrylove/draw-an-arrow-between-circles-with-d3-links
  // using another code for highlights...

  const markerBoxWidth = 3;
  const markerBoxHeight = markerBoxWidth;
  const refX = markerBoxWidth / 2;
  const refY = markerBoxHeight / 2;
  const arrowPoints = [[0, 0], [0, markerBoxHeight], [markerBoxWidth, markerBoxWidth / 2]];

  const ajustXY = d => { // to take in acount noderadius when drawing arrows, see simulation.on(tick)

    const xT = d.target.x;
    const yT = d.target.y;
    const xS = d.source.x;
    const yS = d.source.y;
    const dia = Math.sqrt(Math.pow(xT - xS, 2) + Math.pow(yT - yS, 2));
    const r = nodeRadius(d.target) + markerBoxHeight;
    const xT2 = (dia - r) * (xT - xS) / dia + xS;
    const yT2 = (dia - r) * (yT - yS) / dia + yS;

    return [xT2, yT2]
  }


  //////////////////////////// START ////////////////////
  ///// of code from https://jsfiddle.net/dkroaefw/5/ //

  var linkedByIndex = {};
  data.links.forEach(function (d) {
    linkedByIndex[d.source + "," + d.target] = true;
  });

  function isConnected(a, b) {
    return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
  }

  function hasConnections(a) {
    for (var property in linkedByIndex) {
      s = property.split(",");
      if ((s[0] == a.index || s[1] == a.index) && linkedByIndex[property])
        return true;
    }
    return false;
  }

  var defs = svg.append("svg:defs");

  // build the arrow.
  var arrows = defs
    .selectAll("marker")
    .data(["end", "end-active"]) // Different link/path types can be defined here
    .enter().append("svg:marker") // This section adds in the arrows
    .attr("id", String)
    .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
    .attr('refX', refX)
    .attr('refY', refY)
    .attr('markerWidth', markerBoxWidth)
    .attr('markerHeight', markerBoxHeight)
    .attr("orient", "auto")
    .append("svg:path")
    .attr('d', d3.line()(arrowPoints))
    .attr('stroke', 'none')
  // .attr('fill', 'var(--g-link)');

  defs.select("#end").attr("class", "arrow");
  defs.select("#end-active").attr("class", "arrow-active");

  function set_highlight(d) {
    node.select("text").text(function (o) {
      return isConnected(d, o) ? o.name : "";
    })
    node.attr("class", function (o) {
      return isConnected(d, o) ? "node-active" : "node";
    });
    link.attr("marker-end", function (o) {
      return isLinkForNode(d, o) ? "url(#end-active)" : "url(#end)";
    });
    link.attr("class", function (o) {
      return isLinkForNode(d, o) ? "link-active" : "link";
    });
  }

  function isLinkForNode(node, link) {
    return link.source.index == node.index || link.target.index == node.index;
  }


  function exit_highlight(d) {
    node.attr("class", "node");
    link.attr("class", "link");
    link.attr("marker-end", "url(#end)");
    node.select("text").text("")
  }

  //////////////////////////// END ////////////////////////

  // svg groups
  const graphNode = svg.append("g")
    .selectAll("g")
    .data(data.nodes)
    .enter().append("g")

  // draw individual nodes

  const node = graphNode.append("circle")
    .attr("class", "node")
    .attr("id", (d) => d.id)
    .attr("r", (d) => nodeRadius(d))
    .attr("fill", color)
    .style("cursor", "pointer")
    .on("click", (_, d) => {
      window.location.href = baseUrl + '/' + decodeURI(d.id).replace(/\s+/g, '-')
    })
    .on("mouseover", function (_, d) {
      d3.selectAll(".node")
        .transition()
        .duration(100)
        .attr("fill", "var(--g-node-inactive)")

      const neighbours = parseIdsFromLinks([...(index.links[d.id] || []), ...(index.backlinks[d.id] || [])])
      const neighbourNodes = d3.selectAll(".node").filter(d => neighbours.includes(d.id))
      const currentId = d.id
      const linkNodes = d3.selectAll(".link").filter(d => d.source.id === currentId || d.target.id === currentId)

      // highlight neighbour nodes
      neighbourNodes
        .transition()
        .duration(200)
        .attr("fill", color)

      // // highlight links
      // linkNodes
      //   .transition()
      //   .duration(200)
      //   .attr("stroke", "var(--g-link-active)")

      // show text for self
      d3.select(this.parentNode)
        .select("text")
        .raise()
        .transition()
        .duration(200)
        .style("opacity", 1)
        .style("font-size", "12px")
        .attr("dy", labelBottom ? d => nodeRadius(d) + 14 + "px" : ".35em") // radius is in px 
        .attr("dx", labelBottom ? 0 : d => nodeRadius(d) + 8 + "px") // radius is in px


      d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 8);
      set_highlight(d);

    }).on("mouseleave", function (_, d) {

      const currentId = d.id
      const linkNodes = d3.selectAll(".link").filter(d => d.source.id === currentId || d.target.id === currentId)


      // linkNodes
      //   .transition()
      //   .duration(200)
      //   .attr("stroke", "var(--g-link)")

      d3
        .selectAll("text")
        .raise()
        .transition()
        .duration(200)
        .style("opacity", opacityNode)
        .style("font-size", "8px")
        .attr("dy", labelBottom ? d => nodeRadius(d) + 8 + "px" : ".35em") // radius is in px 
        .attr("dx", labelBottom ? 0 : d => nodeRadius(d) + 4 + "px") // radius is in px




      d3.selectAll(".node")
        .transition()
        .duration(200)
        .attr("fill", color)

      d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 5);
      exit_highlight(d)

    })
    .call(drag(simulation));

  // draw labels

  const labels = graphNode.append("text")
    .attr("dx", labelBottom ? 0 : d => nodeRadius(d) + 4 + "px") // radius is in px
    .attr("dy", labelBottom ? d => nodeRadius(d) + 8 + "px" : ".35em") // radius is in px 
    .attr("text-anchor", labelBottom ? "middle" : "start")
    .text((d) => content[d.id]?.title || d.id.replace("-", " "))
    .style("opacity", opacityNode)
    // .clone(true).lower()
    //   .attr("fill", "none")
    //   .attr("stroke", "white")
    //   .attr("stroke-width", 3);
    .raise()
    .call(drag(simulation));

  // set panning

  if (enableZoom) {
    svg.call(d3.zoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.25, 4])
      .on("zoom", ({ transform }) => {
        link.attr("transform", transform);
        labels.attr("transform", transform);
        node.attr("transform", transform).raise();
      }));
  }

  // progress the simulation

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => ajustXY(d)[0])
      .attr("y2", d => ajustXY(d)[1])
    // .attr("x2", d => d.target.x)
    // .attr("y2", d => d.target.y)
    labels
      .attr("x", d => d.x)
      .attr("y", d => d.y)

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .raise()

  });

}
