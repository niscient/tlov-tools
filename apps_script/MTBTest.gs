const MIN_LIKELY_ELO = 300.0;
const MAX_LIKELY_ELO = 4000.0;


/**
 * Test changes to a player's rating when they lose a MTB to an opponent. Test changes for both
 * a score-based loss formula (f1) and the original MTB loss formula (f2). For sanity
 * checking, we also print "ifHadFullWin" and "ifHadFullLoss", the score if the player had
 * actually won or lost the match without a tiebreak.
 */
function recreateMTBTestSheet() {
  let sheet = getSheet('MTBTest');
  sheet.getDataRange().clearContent();

  let grid = [['myElo', 'oppElo', 'diff', 'f1Result', 'f2Result', 'ifHadFullWin', 'ifHadFullLoss']];

  let testIncrement = 200;
  for (let myElo = MIN_LIKELY_ELO; myElo <= MAX_LIKELY_ELO; myElo += testIncrement) {
    for (let oppElo = MIN_LIKELY_ELO; oppElo <= MAX_LIKELY_ELO; oppElo += testIncrement) {
      f1Result = myElo + f1(myElo, oppElo, 'B_MTB', K)[0];
      f2Result = myElo + f2(myElo, oppElo, 'B_MTB', K)[0];
      ifHadFullWin = myElo + calculateEloChange(myElo, oppElo, 'A', K)[0];
      ifHadFullLoss = myElo + calculateEloChange(myElo, oppElo, 'B', K)[0];
      grid.push([myElo, oppElo, myElo - oppElo, f1Result, f2Result, ifHadFullWin, ifHadFullLoss]);
    }
  }

  if (grid.length > 0) {
    sheet.getRange(1, 1, grid.length, grid[0].length).setValues(grid);
  }
}

// Uses some experimental logic for MTB losses
function f1(ratingA, ratingB, winner, k, mtbLossScore) {
    expectedA = getExpectedScore(ratingA, ratingB)
    expectedB = getExpectedScore(ratingB, ratingA)

    let scoreA, scoreB
    if (winner === 'A') {
      scoreA = 1.0
      scoreB = 0.0
    }
    else if (winner === 'B') {
      scoreA = 0.0
      scoreB = 1.0
    }
    else if (winner === 'A_MTB') {
      scoreA = 1.0
      scoreB = getF1MTBLossScore(expectedB)
    }
    else if (winner === 'B_MTB') {
      scoreA = getF1MTBLossScore(expectedA)
      scoreB = 1.0
    }
    else {
      throw `Invalid winner: ${winner}`;
    }

    changeA = k * (scoreA - expectedA)
    changeB = k * (scoreB - expectedB)

    return [changeA, changeB];
}


function getF1MTBLossScore(expectedScore) {
    // TODO experiment with this

    // Use a function where the higher the lower probability of winning, the higher the score.
    // Specifically, use -0.7x+0.9, a linear function where f(0.0)=0.9 and f(1)=0.2
    // Tool to graph result: https://www.desmos.com/calculator
    //let mtbLossScore = (-0.7) * expectedScore + 0.9;

    // Use a function that makes it so that the higher the lower probability of winning, the
    // higher the score. Use https://www.desmos.com/calculator to see graph.
    //let mtbLossScore = (-0.3) * Math.log(expectedScore + 0.01) + 0.2;
    let mtbLossScore = (-0.9) * Math.log(expectedScore + 0.2) + 0.2;
    mtbLossScore = Math.max(Math.min(mtbLossScore, 1.0), 0.0);

    return mtbLossScore;
}


// Uses original logic for MTB losses, for comparison purposes
function f2(ratingA, ratingB, winner, k) {
    let expectedA, expectedB;

    let scoreA, scoreB
    if (winner === 'A') {
      expectedA = 1.0 / (1.0 + Math.pow(10.0, (ratingB - ratingA) / 400.0));
      expectedB = 1.0 / (1.0 + Math.pow(10.0, (ratingA - ratingB) / 400.0));
      scoreA = 1.0
      scoreB = 0.0
    }
    else if (winner === 'B') {
      expectedA = 1.0 / (1.0 + Math.pow(10.0, (ratingB - ratingA) / 400.0));
      expectedB = 1.0 / (1.0 + Math.pow(10.0, (ratingA - ratingB) / 400.0));
      scoreA = 0.0
      scoreB = 1.0
    }
    else if (winner === 'A_MTB') {
      expectedA = 1.0 / (1.0 + Math.pow(10.0, (ratingB - ratingA) / 400.0));
      expectedB = 1.0 / (0.35 + Math.pow(10.0, (ratingA - ratingB) / 400.0));
      scoreA = 1.0
      scoreB = 1.0
    }
    else if (winner === 'B_MTB') {
      expectedA = 1.0 / (0.35 + Math.pow(10.0, (ratingB - ratingA) / 400.0));
      expectedB = 1.0 / (1.0 + Math.pow(10.0, (ratingA - ratingB) / 400.0));
      scoreA = 1.0
      scoreB = 1.0
    }
    else {
      throw `Invalid winner: ${winner}`;
    }

    changeA = k * (scoreA - expectedA)
    changeB = k * (scoreB - expectedB)

    return [changeA, changeB];
}
