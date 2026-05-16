"use strict";

/*
 * ============================================
 * FRONTEND LOGIC
 * ============================================
 */

const myInputWindow =
    document.getElementById(
        "myInputWindow"
    );

const myOutput =
    document.getElementById(
        "myOutput"
    );

const myNumInput =
    document.getElementById(
        "myNumInput"
    );

const seedInput =
    document.getElementById(
        "seedInput"
    );

const pathOutput =
    document.getElementById(
        "pathOutput"
    );

const myButton =
    document.getElementById(
        "myButton"
    );

const clearButton =
    document.getElementById(
        "clear"
    );

/*
 * GENERATE TEXT
 */
function onMyButtonClick()
{
    const text =
        myInputWindow.value.trim();

    if (!text)
    {
        alert(
            "Մուտքագրեք տեքստ"
        );

        return;
    }

    const seed =
        seedInput.value
            .trim()
            .toLowerCase();

    if (!seed.includes(" "))
    {
        alert(
            "Գրեք 2 բառ"
        );

        return;
    }

    const num =
        Number(
            myNumInput.value
        );

    const tokens =
        cleanText(text);

    const markov =
        new AssociationTable();

    markov.train(tokens);

    markov.updateProbabilities();

    const result =
        markov.seededGenText(
            seed,
            num
        );

    /*
     * OUTPUT
     */
    myOutput.value =
        result.text;

    /*
     * PATH
     */
    let pathText = "";

    result.path.forEach(step =>
    {
        pathText +=
            `${step.from}`
            + ` -> `
            + `${step.to}`
            + ` (`
            + `${step.probability.toFixed(2)}`
            + `)\n`;
    });

    pathOutput.innerText =
        pathText;

    /*
     * GRAPH
     */
    const graph =
        markov.buildGraph();

    drawGraph(
        graph,
        result.path
    );
}

/*
 * CLEAR
 */
function clearAll()
{
    myInputWindow.value = "";

    myOutput.value = "";

    pathOutput.innerText = "";

    document.getElementById(
        "graph"
    ).innerHTML = "";
}

myButton.addEventListener(
    "click",
    onMyButtonClick,
    drawGraph(graph, result.path)
);

clearButton.addEventListener(
    "click",
    clearAll
);
/*
 * Նկարում ենք գրաֆը
 */
