const K = 500.0;
const ELO_SALARY_CONVERTER = 10000.0;
const ELO_ROUND_DECIMAL_PLACES = 5;
const PRINTABLE_ELO_ROUND_DECIMAL_PLACES = 0;


class ManualElo {
  constructor(rating, date) {
    this.rating = rating;
    this.date = date;
  }
}


function convertSalaryToElo(salary) {
  return salary / ELO_SALARY_CONVERTER;
}


function convertEloToSalary(rating) {
  return elo * ELO_SALARY_CONVERTER;
}


function isValidDate(date) {
  return typeof date.getMonth === 'function';
}


function recreateEloSheet() {
  let manualElosDict = getManualElosFromPlayersSheet();
  let matchBook = getRowsFromSheet(MATCH_BOOK_SHEET);

  let currentElosDict = {};

  let prevMatchDate = null;

  for (let i = 0; i < matchBook.length; ++i) {
    let row = matchBook[i];

    let event = null;
    let matchType = null;
    let winner = null;
    let playersInMatch = [];
    try {
      matchID = getColumn(row, MATCH_ID_COLUMN);
      event = getColumn(row, EVENT_COLUMN);
      matchType = getMatchTypeColumn(row);
      winner = getWinnerColumn(row);
      playersInMatch = getPlayersInMatch(row);
    }
    catch (exception) {
      // TODO doesn't work anymore
      //exception.message = `Match ID=${matchID}: ${exception.toString()}`;
      //throw exception;
      throw `Match ID=${matchID}: ${exception.toString()}`;
    }

    let playerA1 = getColumn(row, PLAYER_A1_COLUMN);
    let playerB1 = getColumn(row, PLAYER_B1_COLUMN);

    let date = getColumn(row, DATE_COLUMN);
    if (!isValidDate(date)) {
      throw `Match ID=${matchID}: Invalid Date: ${date}`;
    }

    if (prevMatchDate !== null) {
      if (prevMatchDate.getTime() > date.getTime()) {
        // In reality, this will only affect a pretty niche thing: Cases where a manual Elo is
        // specified mid-season. In such a case, the first applicable row encountered with a
        // date >= that of the manual Elo entry will pop that manual Elo from the list. If we do
        // that while processing matches out of order date-wise, that would lead to strange
        // results.
        throw `Match ID=${matchID}: Date must be <= that of previous match`;
      }
    }

    let eloAsOfMatchByPlayer = getEloAsOfMatchByPlayer(i, playersInMatch, manualElosDict, currentElosDict, event, matchType, date);

    let newEloRatingByPlayer = {};

    if (matchType === 'Singles') {
      if (!eloAsOfMatchByPlayer.hasOwnProperty(playerA1)) {
        throw `Match ID=${matchID}: Failed to get Elo for player ${playerA1}`;
      }
      let ratingA = eloAsOfMatchByPlayer[playerA1].rating;

      if (!eloAsOfMatchByPlayer.hasOwnProperty(playerB1)) {
        throw `Match ID=${matchID}: Failed to get Elo for player ${playerB1}`;
      }
      let ratingB = eloAsOfMatchByPlayer[playerB1].rating;

      let changes = calculateEloChange(ratingA, ratingB, winner, K)
      let changeA = changes[0], changeB = changes[1];

      // Note that rounding the results means that sometimes the rounding can go in the same
      // direction. E.g., usually changeA == -changeB (except when there was a MTB). But if we
      // round both values, we might have a case where the final decimal place of these values
      // makes it so that changeA and -changeB are very slightly different.
      newEloRatingByPlayer[playerA1] = roundElo(ratingA + changeA);
      newEloRatingByPlayer[playerB1] = roundElo(ratingB + changeB);
    }
    else if (matchType === 'Doubles') {
      if (!eloAsOfMatchByPlayer.hasOwnProperty(playerA1)) {
        throw `Match ID=${matchID}: Failed to get Elo for player ${playerA1}`;
      }
      if (!eloAsOfMatchByPlayer.hasOwnProperty(playerA2)) {
        throw `Match ID=${matchID}: Failed to get Elo for player ${playerA2}`;
      }
      let ratingA = eloAsOfMatchByPlayer[playerA1].rating + eloAsOfMatchByPlayer[playerA2].rating;

      if (!eloAsOfMatchByPlayer.hasOwnProperty(playerB1)) {
        throw `Match ID=${matchID}: Failed to get Elo for player ${playerB1}`;
      }
      if (!eloAsOfMatchByPlayer.hasOwnProperty(playerB2)) {
        throw `Match ID=${matchID}: Failed to get Elo for player ${playerB2}`;
      }
      let ratingB = eloAsOfMatchByPlayer[playerB1].rating + eloAsOfMatchByPlayer[playerB2].rating;

      let changes = calculateEloChange(ratingA, ratingB, winner, K)
      let changeA = changes[0], changeB = changes[1];

      newEloRatingByPlayer[playerA1] = roundElo(eloAsOfMatchByPlayer[playerA1].rating + changeA);
      newEloRatingByPlayer[playerA2] = roundElo(eloAsOfMatchByPlayer[playerA2].rating + changeA);
      newEloRatingByPlayer[playerB1] = roundElo(eloAsOfMatchByPlayer[playerB1].rating + changeB);
      newEloRatingByPlayer[playerB2] = roundElo(eloAsOfMatchByPlayer[playerB2].rating + changeB);
    }

    //Logger.log(`ratings update after ID=${matchID}`);
    //Logger.log(newEloRatingByPlayer);

    playersInMatch.forEach(function (player) {
      if (!newEloRatingByPlayer.hasOwnProperty(player)) {
        throw `Match ID=${matchID}: Failed to generate Elo for ${player}`;
      }
      let myNewEloRating = newEloRatingByPlayer[player];

      if (!currentElosDict.hasOwnProperty(event)) {
        currentElosDict[event] = {};
      }
      if (!currentElosDict[event].hasOwnProperty(player)) {
        currentElosDict[event][player] = {};
      }
      currentElosDict[event][player][matchType] = new ManualElo(myNewEloRating, date);
    })

    prevMatchDate = date;
  }

  Logger.log("currentElosDict");
  Logger.log(currentElosDict);

  // TODO probably create a list of "elo results after each match" to use to generate weekly
  // results and rankings and stuff.

  // TODO update the actual sheet. i can do this by merging manual and generated elos together
  // into a list of results, always making manual elos go first if they have the same date. or,
  // i could add a way to detect if a manual elo was popped, and add both it and the other thing
  // to the list. or i could make the helper function add the popped manual elo to the list for
  // me, although that makes for a messy division of responsibility.
}


function getPlayersInMatch(row) {
  let matchType = getMatchTypeColumn(row);
  let playerA1 = getColumn(row, PLAYER_A1_COLUMN);
  let playerA2 = getColumn(row, PLAYER_A2_COLUMN);
  let playerB1 = getColumn(row, PLAYER_B1_COLUMN);
  let playerB2 = getColumn(row, PLAYER_B2_COLUMN);

  let playersInMatch = [];

  if (matchType === 'Singles') {
    playersInMatch = [...new Set([playerA1, playerB1])];

    if (playerA1.length === 0 || playerB1.length === 0) {
      throw `Singles match must have ${PLAYER_A1_COLUMN} and ${PLAYER_B1_COLUMN} populated`;
    }

    if (playersInMatch.length != 2) {
      throw `Singles match must have 2 distinct players`;
    }
  }
  else if (matchType === 'Doubles') {
    playersInMatch = [...new Set([playerA1, playerA2, playerB1, playerB2])];

    for (const playerInMatch of playersInMatch) {
      if (playerInMatch.length === 0) {
        throw `Doubles match must have all players populated`;
      }
    }

    if (playersInMatch.length != 4) {
      throw `Doubles match must have 4 distinct players`;
    }
  }

  return playersInMatch;
}


/**
 * Helper function which returns a dictionary of current Elo by player.
 */
function getEloAsOfMatchByPlayer(matchIndex, playersInMatch, manualElosDict, currentElosDict,
  event, matchType, date) {
  eloAsOfMatchByPlayer = {};

  playersInMatch.forEach(function (player) {
    //Logger.log(manualElosDict[event][player][matchType])
    // TODO is this okay with closures or whatever? make sure works.
    let manualElo = popFromManualElosDict(manualElosDict, event, player, matchType, date);
    //Logger.log(manualElosDict[event][player][matchType])

    let currentElo = null;
    if (currentElosDict.hasOwnProperty(event) &&
        currentElosDict[event].hasOwnProperty(player) &&
        currentElosDict[event][player].hasOwnProperty(matchType)) {
      currentElo = currentElosDict[event][player][matchType];
    }

    // If there's a manual Elo override that applies for the match in question, use that
    // instead of whatever current Elo the player has.
    if (manualElo !== null) {
      currentElo = manualElo;
    }
    else {
      if (currentElo === null) {
        throw `Unable to get manually-set Elo for Event = ${event}, player = "${player}", MatchType=${matchType}`;
      }
    }

    /*
    if (manualElo === null) {
      Logger.log(`i=${matchIndex}, event=${event}, player=${player}, matchType=${matchType}, currentElo=(${currentElo.date}, ${currentElo.rating})`);
    }
    else {
      Logger.log(`i=${matchIndex}, event=${event}, player=${player}, matchType=${matchType}, manualElo=(${manualElo.date}, ${manualElo.rating}), currentElo=(${currentElo.date}, ${currentElo.rating})`);
    }
    */

    eloAsOfMatchByPlayer[player] = currentElo;
  })

  return eloAsOfMatchByPlayer;
}


/**
 * For a given set of match details, takes the oldest manual Elo that exists and removes it from
 * the dict, also returning it. If multiple possible manual Elos would match, all are removed
 * and only the final one is returned. (It is assumed that every list of manual Elos in the Elo
 * dict are sorted in increasing order by date.) Returns null if no applicable manual Elo exists.
 */
function popFromManualElosDict(manualElosDict, event, player, matchType, date) {
  if (!manualElosDict.hasOwnProperty(event)) {
    return null;
  }

  if (!manualElosDict[event].hasOwnProperty(player)) {
    return null;
  }
  
  if (!manualElosDict[event][player].hasOwnProperty(matchType)) {
    return null;
  }

  let latestElo = null;

  while (manualElosDict[event][player][matchType].length > 0) {
    // Note that we assume the list of manual Elos in the dict is sorted already.
    if (manualElosDict[event][player][matchType][0].date.getTime() > date.getTime()) {
      break;
    }

    latestElo = manualElosDict[event][player][matchType].shift();
  }

  return latestElo;
}


/**
 * Returns manually-set elos, in format {event: {player: matchType {[ManualElo, ...]}}}
 * List of manual Elos are guaranteed to be in sorted order, with epoch date used if no date is
 * specified.
 */
function getManualElosFromPlayersSheet() {
  var manualElosDict = {};

  let playersGrid = getRowsFromSheet(PLAYERS_SHEET)
  for (let i = 0; i < playersGrid.length; i++) {
    let playerRow = playersGrid[i];

    let event = getColumn(playerRow, EVENT_COLUMN);
    let player = getColumn(playerRow, PLAYER_COLUMN);
    let dateModified = getColumn(playerRow, DATE_MODIFIED_COLUMN);

    let date;
    if (dateModified === '') {
      date = new Date(EPOCH_TIMESTAMP);
    }
    else {
      // Note that it seems like the timestamps use the associated local timezone that would have
      // applied on the date in question.
      date = dateModified;

      if (!isValidDate(date)) {
        throw `For Event = ${event}, Player = ${player}, invalid Date Modified: ${dateModified}`;
      }
    }

    // TODO maybe create "generic match type" constants (and rename matchType too) rather than
    // using these string literals.
    for (const matchType of ['Singles', 'Doubles']) {
      let salary;
      if (matchType === 'Singles') {
        salary = getColumn(playerRow, SINGLES_SALARY_COLUMN);
      }
      else {
        salary = getColumn(playerRow, DOUBLES_SALARY_COLUMN);
      }

      if (salary === '') {
        continue;
      }

      if (!manualElosDict.hasOwnProperty(event)) {
        manualElosDict[event] = {};
      }

      if (!manualElosDict[event].hasOwnProperty(player)) {
        manualElosDict[event][player] = {};
      }

      if (!manualElosDict[event][player].hasOwnProperty(matchType)) {
        manualElosDict[event][player][matchType] = [];
      }

      for (const existingManualElo of manualElosDict[event][player][matchType]) {
        if (existingManualElo.date.getTime() === date.getTime()) {
          throw `For Event = ${event}, Player = ${player}, Match Type = ${matchType}, Date Modified already exists: ${dateModified}`;
        }
      }

      let rating = convertSalaryToElo(salary);
      if (isNaN(rating)) {
        throw `For Event = ${event}, Player = ${player}, Match Type = ${matchType}, invalid salary: ${salary}`;
      }

      manualElosDict[event][player][matchType].push(new ManualElo(rating, date));
      manualElosDict[event][player][matchType].sort(function(a, b) {
        return a.date.getTime() - b.date.getTime();
      });
    }
  }

  //Logger.log(manualElosDict);
  return manualElosDict;
}


/**
 * Standard ELO calculation technique. Uses score=0.35 if team A didn't win.
 */
function calculateEloChange(ratingA, ratingB, winner, k) {
    expectedA = getExpectedScore(ratingA, ratingB)
    expectedB = getExpectedScore(ratingB, ratingA)

    // TODO experiment with whether to keep the 0.35 thing or use Bill's formula or what.
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
      scoreB = 0.35
    }
    else if (winner === 'B_MTB') {
      scoreA = 0.35
      scoreB = 1.0
    }
    else {
      throw `Invalid winner: ${winner}`;
    }

    changeA = k * (scoreA - expectedA)
    changeB = k * (scoreB - expectedB)

    return [changeA, changeB];
}


/**
 * Return expected score, meaning a player's expected probability of winning. In non-tennis
 * games, with a draw representing half a win, the expected score would represent the
 * probability of winning, plus half the probability of drawing.
 */
function getExpectedScore(myRating, opponentRating) {
  return 1.0 / (1.0 + Math.pow(10.0, (opponentRating - myRating) / 400.0));
}


function roundElo(value) {
  // TODO this function is not perfect at all and has some weird Javascript behavior which can
  // lead to strange results for rounding to the final decimal place. E.g. for doThing(2.00005)
  // and -2.00005.
  
  let isNegative = value < 0.0
  result = Math.abs(value).toFixed(ELO_ROUND_DECIMAL_PLACES)
  if (isNegative) {
    // TODO don't need to do 2nd toFixed here, just for logging purposes
    result = (parseFloat(result) * -1.0).toFixed(ELO_ROUND_DECIMAL_PLACES)
  }

  //Logger.log(result)

  return parseFloat(result);
}

function printableElo(value) {
  return value.toFixed(PRINTABLE_ELO_ROUND_DECIMAL_PLACES)
}
