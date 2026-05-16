"use strict";

/*
 * Գրաֆի նկարում
 */

function drawGraph(edges, path = [])
{
    const nodesSet = new Set();

    edges.forEach(edge =>
    {
        nodesSet.add(edge.from);
        nodesSet.add(edge.to);
    });

    /*
     * nodes
     */
    const nodes = [];

    nodesSet.forEach(word =>
    {
        nodes.push({
            id: word,
            label: word,
            color: "#38bdf8",
            font: {
                color: "white",
                size: 18
            }
        });
    });

    /*
     * path highlighting
     */
    const pathPairs = new Set();

    path.forEach(step =>
    {
        pathPairs.add(
            `${step.from}->${step.to}`
        );
    });

    /*
     * edges
     */
    const graphEdges = edges.map(edge =>
    {
        const isPath =
            pathPairs.has(
                `${edge.from}->${edge.to}`
            );

        return {
            from: edge.from,
            to: edge.to,

            label:
                edge.probability.toFixed(2),

            arrows: "to",

            color: isPath
                ? "#f43f5e"
                : "#94a3b8",

            width: isPath ? 4 : 1.5,

            font: {
                color: "white",
                size: 14
            },

            smooth: true
        };
    });

    const container =
        document.getElementById("network");

    const data =
    {
        nodes: nodes,
        edges: graphEdges
    };

    const options =
    {
        physics:
        {
            enabled: true,
            barnesHut:
            {
                gravitationalConstant: -3000
            }
        },

        nodes:
        {
            shape: "dot",
            size: 16
        },

        edges:
        {
            smooth:
            {
                type: "dynamic"
            }
        },

        interaction:
        {
            hover: true
        },

        layout:
        {
            improvedLayout: true
        }
    };

    new vis.Network(
        container,
        data,
        options
    );
}