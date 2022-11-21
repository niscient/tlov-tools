/*
TODO:
"""
It's somewhat misleading that the Current Rating, Highest Rating, Highest Ranking, and Lowest
Ranking are all temporary -- if those values come from midweek values, they will vanish as if
they had never existed by the time the end of the week comes around. So your "highest ranking"
is very temporary. That is solvable by making it so that highest ranking is only updated at the
end of the week, but highest rating less so since it is misleading if Current Rating is higher
than Highest Rating because Highest Rating is old (but not obviously labeled as such). Basically,
if you play multiple matches a week and achieve your highest rating and ranking in the first
match but lose that in the 2nd match, it'll be as if those values never existed by the time
the next week rolls around.
There are a few possible solutions:
(1) don't print current-week results anywhere, including
Current Rating! Use some other mechanism to store "absolutely current rating".
(2) allow Highest Rating to mean only highest rating from weeks before this week. same for
other highest/lowest fields.
(3) allow Highest Rating to include Current Rating, meaning that it can vanish at the end of
the week. but keep highest ranking as only updating once per week. (not a great solution since
i find it misleading that results can vanish.)
In practice I suspect that it doesn't matter at all, since probably the sheet will only be
updated once a week, with the scores of all the matches any given player has played that week.
i also suspect that the population of players who would bother checking their rating midweek
between matches is very small.
"""

TODO:
""""
Maybe add player level (Challenger etc) to Player sheet (and maybe also the WeeklyRanking+PlayerSummary sheets) for your filtering/sorting convenience. We could also make it so that there's a dedicated WeeklyRanking_Challenger or something sheet if you don't want to grab stuff from the sheet manually.
""""

TODO maybe for Highest Rating and Lowest Rating:
"""
what I've built is "Highest End-of-Week Rating". Could tweak that if necessary to make Highest Rating "Highest Rating Ever Achieved, Even If You Lose That Rating by the End of the Week".
"""
*/

const START_OF_WEEK_DAY_VALUE = 1;  // Monday

const WEEKLY_RATINGS_MANDATORY_COLUMNS = ['Event', 'Match Type', 'Player'];

const PLAYER_SUMMARY_COLUMNS = ['Event', 'Match Type', 'Player', 'Current Rating',
  'Highest Rating', 'Highest Rating Date', 'Lowest Rating', 'Lowest Rating Date',
  'Current Ranking', 'Highest Ranking', 'Lowest Ranking', 'Biggest Win', 'Worst Loss'];


class PlayerElo {
  constructor(player, rating) {
    this.player = player;
    this.rating = rating;
  }
}


class BiggestMatchResult {
  constructor(player, ratingChange, date, description) {
    this.player = player;
    this.ratingChange = ratingChange;
    this.date = date;
    this.description = description;
  }

  toString() {
    let prefix = (this.ratingChange >= 0 ? '+' : '');
    return prefix + printableElo(this.ratingChange) + ', ' + this.description + ' (' +
      this.date.toLocaleDateString() + ')';
  }
}


function recreateRatingDataSheets() {
  // Get a complete set of Elo updates, in the sorted order in which they happened -- including
  // manually-set Elos for players who didn't play any matches for the relevant
  // event+player+matchType.
  let elosDict = computeElosDictAllPlayers();

  let events = [...Object.keys(elosDict)];
  events.sort();

  let players = getPlayersFromElosDict(elosDict);
  players.sort();

  // Dict of format {event: {matchType: {player: [rating, ...]}}}, with each rating being
  // an end-of-week rating. Note that start-of-season ratings are not stored.
  let weeklyRatingsDict = {};

  // Note that we don't have to go through the events in order, but choose to do so for sanity's
  // sake in case we decide to do logging for clarity/debugging.
  for (const event of events) {
    let elosEventDict = elosDict[event];

    let firstAndLastWeekStartDates = getFirstAndLastWeekStartDatesFromEventDict(elosEventDict);
    let firstWeekStartDate = firstAndLastWeekStartDates[0];
    let lastWeekStartDate = firstAndLastWeekStartDates[1];

    if (lastWeekStartDate.getDate() - firstWeekStartDate.getDate() > 365) {
      throw `Failed sanity check: Event ${event} went on for longer than a year. firstWeekStartDate=${firstWeekStartDate}, lastWeekStartDate=${lastWeekStartDate}`;
    }

    //Logger.log(firstWeekStartDate);
    //Logger.log(lastWeekStartDate);

    if (firstWeekStartDate === null || lastWeekStartDate === null) {
      // Assume the event has no matches, and don't generate any date for it.
      continue;
    }

    for (const [player, playerValue] of Object.entries(elosEventDict)) {
      for (const [matchType, eloList] of Object.entries(playerValue)) {
        let currentWeekStartDate = new Date(firstWeekStartDate.getTime());
        let nextWeekStartDate = new Date(currentWeekStartDate.getTime());
        // TODO it's possible that nonsense could occur where timezone gets in the way and makes
        // it so that dates don't fall into the week they should. when a date is read from the
        // sheet, it is treated as midnight of the day in question, for whatever timezone
        // applied as of that date -- whereas it would technically be better probably if i
        // treated it as UTC midnight as of that date. but in practice i doubt it would ever
        // matter.

        nextWeekStartDate.setDate(nextWeekStartDate.getDate() + 7);

        if (!weeklyRatingsDict.hasOwnProperty(event)) {
          weeklyRatingsDict[event] = {};
        }
        if (!weeklyRatingsDict[event].hasOwnProperty(matchType)) {
          weeklyRatingsDict[event][matchType] = {};
        }
        if (!weeklyRatingsDict[event][matchType].hasOwnProperty(player)) {
          weeklyRatingsDict[event][matchType][player] = [];
        }

        let currentRating = 0;

        let weekIndex = 0;
        weeklyRatingsDict[event][matchType][player].push(currentRating);

        for (const eloObj of eloList) {
          // Note that start-of-season manually-set Elo ratings set to use Epoch date will be
          // treated as if they fall into the first week. This means that, for example: Say a
          // player starts the first week at rank #1 but never plays another match. because
          // rankings are only considered at the END of each week, their highest rank for the
          // event will be #1 if they're still #1 at the end of the first week, but it won't be
          // #1 if they're not #1 at the end of the first week.

          while (eloObj.date.getTime() >= nextWeekStartDate) {
            currentWeekStartDate = nextWeekStartDate;
            nextWeekStartDate = new Date(currentWeekStartDate.getTime());
            nextWeekStartDate.setDate(nextWeekStartDate.getDate() + 7);

            weekIndex += 1;
            weeklyRatingsDict[event][matchType][player].push(currentRating);
          }

          currentRating = eloObj.rating
          weeklyRatingsDict[event][matchType][player][weekIndex] = currentRating;
        }

        while (currentWeekStartDate.getTime() < lastWeekStartDate.getTime()) {
          currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);

          weekIndex += 1;
          weeklyRatingsDict[event][matchType][player].push(currentRating);
        }
      }
    }

    Logger.log('Weekly ratings:');
    Logger.log(weeklyRatingsDict);
  }
  
  recreateWeeklyRatingsSheet(events, players, weeklyRatingsDict, elosDict);
  recreatePlayerSummarySheet(events, players, weeklyRatingsDict, elosDict);
}


function recreateWeeklyRatingsSheet(events, players, weeklyRatingsDict, elosDict) {
  let weeklyRatingsGrid = [WEEKLY_RATINGS_MANDATORY_COLUMNS];
  let weekCount = 0;

  for (const event of events) {
    for (const matchType of ['Singles', 'Doubles']) {
      if (!weeklyRatingsDict[event].hasOwnProperty(matchType)) {
        continue;
      }

      for (const player of players) {
        if (!weeklyRatingsDict[event][matchType].hasOwnProperty(player)) {
          continue;
        }

        let printableWeeklyRatings = [...weeklyRatingsDict[event][matchType][player]];
        for (let i = 0; i < printableWeeklyRatings.length; ++i) {
          printableWeeklyRatings[i] = printableElo(printableWeeklyRatings[i]);
        }

        weeklyRatingsGrid.push([event, matchType, player, ...printableWeeklyRatings]);

        // Note that if any row in the grid has a different number of columns than any other row,
        // we'll get an error when we try to write the grid to the sheet.
        weekCount = weeklyRatingsDict[event][matchType][player].length;
      }
    }
  }

  for (let i = 0; i < weekCount; ++i) {
    weeklyRatingsGrid[0].push(`Week ${i + 1}`);
  }

  //Logger.log(weeklyRatingsGrid);

  let weeklyRatingsSheet = getSheet(WEEKLY_RATINGS_SHEET);
  weeklyRatingsSheet.getDataRange().clearContent();

  if (weeklyRatingsGrid.length > 0) {
    weeklyRatingsSheet.getRange(1, 1, weeklyRatingsGrid.length,
      weeklyRatingsGrid[0].length).setValues(weeklyRatingsGrid);
  }
}


function recreatePlayerSummarySheet(events, players, weeklyRatingsDict, elosDict) {
  // TODO we actually don't need to store elo here -- could just store player name. we also
  // don't technically need to store a function-wide dict like this.
  // Dict of format {event: {matchType: [PlayerElo, ...]}}
  let weeklyRankingsDict = {};

  let currentStats = {};

  for (const event of events) {
    let firstAndLastWeekStartDates = getFirstAndLastWeekStartDatesFromEventDict(elosDict[event]);
    let firstWeekStartDate = firstAndLastWeekStartDates[0];

    for (const matchType of ['Singles', 'Doubles']) {
      if (!weeklyRatingsDict[event].hasOwnProperty(matchType)) {
        continue;
      }

      // Set up stats dict and compute rating data
      for (const player of players) {
        if (!weeklyRatingsDict[event][matchType].hasOwnProperty(player)) {
          continue;
        }

        if (!currentStats.hasOwnProperty(event)) {
          currentStats[event] = {};
        }
        if (!currentStats[event].hasOwnProperty(matchType)) {
          currentStats[event][matchType] = {};
        }
        if (!currentStats[event][matchType].hasOwnProperty(player)) {
          currentStats[event][matchType][player] = {};
        }

        let stats = currentStats[event][matchType][player];
        stats['Event'] = event;
        stats['Match Type'] = matchType;
        stats['Player'] = player;
        stats['Current Rating'] = null;
        stats['Highest Rating'] = null;
        stats['Highest Rating Date'] = null;
        stats['Lowest Rating'] = null;
        stats['Lowest Rating Date'] = null;
        stats['Current Ranking'] = null;
        stats['Highest Ranking'] = null;
        stats['Lowest Ranking'] = null;
        stats['Biggest Win'] = null;
        stats['Worst Loss'] = null;

        for (let i = 0; i < weeklyRatingsDict[event][matchType][player].length; ++i) {
          const weeklyRating = weeklyRatingsDict[event][matchType][player][i];

          let endOfWeekDate = new Date(firstWeekStartDate.getTime());
          endOfWeekDate.setDate(endOfWeekDate.getDate() + 7*i + 6);

          stats['Current Rating'] = weeklyRating;

          if (stats['Highest Rating'] === null || weeklyRating > stats['Highest Rating']) {
            stats['Highest Rating'] = weeklyRating;
            stats['Highest Rating Date'] = endOfWeekDate;
          }

          if (stats['Lowest Rating'] === null || weeklyRating < stats['Lowest Rating']) {
            stats['Lowest Rating'] = weeklyRating;
            stats['Lowest Rating Date'] = endOfWeekDate;
          }
        }
      }

      // Compute ranking data

      if (!weeklyRankingsDict.hasOwnProperty(event)) {
        weeklyRankingsDict[event] = {};
      }
      if (!weeklyRankingsDict[event].hasOwnProperty(matchType)) {
        weeklyRankingsDict[event][matchType] = [];
      }

      for (const [player, eloList] of Object.entries(weeklyRatingsDict[event][matchType])) {
        for (let i = 0; i < eloList.length; ++i) {
          while (weeklyRankingsDict[event][matchType].length < i+1) {
            weeklyRankingsDict[event][matchType].push([]);
          }

          weeklyRankingsDict[event][matchType][i].push(new PlayerElo(player, eloList[i]));
          weeklyRankingsDict[event][matchType][i].sort(function(x, y) {
            if (x.rating < y.rating) {
              return -1;
            }
            if (x.rating > y.rating) {
              return 1;
            }
            return 0;
          });
        }
      }

      for (let week = 0; week < weeklyRankingsDict[event][matchType].length; ++week) {
        const sortedPlayerElos = weeklyRankingsDict[event][matchType][week];

        //Logger.log(week);
        //Logger.log(sortedPlayerElos);

        for (let i = 0; i < sortedPlayerElos.length; ++i) {
          const playerElo = sortedPlayerElos[i];

          // TODO maybe treat ties as the same ranking, but taking up multiple spots. e.g. if #2
          // and #3 are tied, they're both considered #2 to me. but the next item is #4. up to me
          // if i want to say "#2 (tied)" -- means a little more data needs to be stored, like
          // a Ranking object.
          let ranking = sortedPlayerElos.length - i;

          let stats = currentStats[event][matchType][playerElo.player];

          stats['Current Ranking'] = ranking;

          // Note that "highest" and "lowest" are inverses of what those terms normally mean,
          // since a lower value is a higher ranking.

          if (stats['Highest Ranking'] === null || ranking < stats['Highest Ranking']) {
            stats['Highest Ranking'] = ranking;
          }

          if (stats['Lowest Ranking'] === null || ranking > stats['Lowest Ranking']) {
            stats['Lowest Ranking'] = ranking;
          }
        }
      }
    }
  }

  // Compute biggest win and loss
  populateBiggestWinAndLoss(currentStats, elosDict);

  //Logger.log(currentStats)
  //Logger.log(weeklyRankingsDict);

  let playerSummaryGrid = [PLAYER_SUMMARY_COLUMNS];

  for (const event of events) {
    if (!currentStats.hasOwnProperty(event)) {
      continue;
    }

    for (const matchType of ['Singles', 'Doubles']) {
      if (!currentStats[event].hasOwnProperty(matchType)) {
        continue;
      }

      for (const player of players) {
        if (!currentStats[event][matchType].hasOwnProperty(player)) {
          continue;
        }

        summaryRowArray = [];
        for (const outputColumn of PLAYER_SUMMARY_COLUMNS) {
          let value = currentStats[event][matchType][player][outputColumn];

          if (['Biggest Win', 'Worst Loss'].indexOf(outputColumn) !== -1 && value !== null) {
            value = value.toString();
          }
          else if (['Current Rating', 'Highest Rating', 'Lowest Rating'].indexOf(
            outputColumn) !== -1 && value !== null) {
            value = printableElo(value);
          }

          summaryRowArray.push(value);
        }

        playerSummaryGrid.push(summaryRowArray);
      }
    }
  }

  let playerSummarySheet = getSheet(PLAYER_SUMMARY_SHEET);
  playerSummarySheet.getDataRange().clearContent();

  if (playerSummaryGrid.length > 0) {
    playerSummarySheet.getRange(1, 1, playerSummaryGrid.length,
      playerSummaryGrid[0].length).setValues(playerSummaryGrid);
  }
}


function populateBiggestWinAndLoss(currentStats, elosDict) {
  let matchBook = getRowsFromSheet(MATCH_BOOK_SHEET);

  let matchRowByMatchID = {};
  for (const matchRow of matchBook) {
    let matchID = getColumn(matchRow, MATCH_ID_COLUMN);
    if (matchRowByMatchID.hasOwnProperty(matchID)) {
      throw `Multiple matches have Match ID=${matchID}`;
    }
    matchRowByMatchID[matchID] = matchRow;
  }

  for (const [event, eventValue] of Object.entries(elosDict)) {
    for (const [player, playerValue] of Object.entries(eventValue)) {
      for (const [matchType, eloList] of Object.entries(playerValue)) {
        let stats = currentStats[event][matchType][player];

        let currentRating = null;
        
        for (const eloObj of eloList) {
          let ratingChange;
          if (currentRating === null) {
            ratingChange = eloObj.rating;
          }
          else {
            ratingChange = eloObj.rating - currentRating;
          }

          if (eloObj.matchID != MATCH_ID_MANUAL_ELO) {
            if (!matchRowByMatchID.hasOwnProperty(eloObj.matchID)) {
              throw `Logic error: Failed to find match for Elo result with Match ID=${eloObj.matchID}`;
            }
            let matchRow = matchRowByMatchID[eloObj.matchID];

            if (ratingChange > 0) {
              if (stats['Biggest Win'] === null ||
                ratingChange > stats['Biggest Win'].ratingChange) {
                stats['Biggest Win'] = new BiggestMatchResult(player, ratingChange, eloObj.date,
                  getBiggestMatchDescription(player, matchRow, 'def.'));
              }
            }

            if (ratingChange < 0) {
              if (stats['Worst Loss'] === null ||
                ratingChange < stats['Worst Loss'].ratingChange) {
                stats['Worst Loss'] = new BiggestMatchResult(player, ratingChange, eloObj.date,
                  getBiggestMatchDescription(player, matchRow, 'l. to'));
              }
            }
          }

          currentRating = eloObj.rating;
        }
      }
    }
  }
}


function getBiggestMatchDescription(player, matchRow, resultText) {
  let playerA1 = getColumn(matchRow, PLAYER_A1_COLUMN);
  let playerA2 = getColumn(matchRow, PLAYER_A2_COLUMN);
  let playerB1 = getColumn(matchRow, PLAYER_B1_COLUMN);
  let playerB2 = getColumn(matchRow, PLAYER_B2_COLUMN);

  let opponents;
  if (player === playerA1 || player === playerA2) {
    opponents = [playerB1, playerB2];
  }
  if (player === playerB1 || player === playerB2) {
    opponents = [playerA1, playerA2];
  }

  let opponentText = '';
  if (opponents[0].length > 0) {
    opponentText += opponents[0]
  }
  if (opponents[1].length > 0) {
    opponentText += ' and ' + opponents[1]
  }

  return `${resultText} ${opponentText}`;
}


function getPlayersFromElosDict(elosDict) {
  let playersSet = new Set();

  for (const eventValue of Object.values(elosDict)) {
    for (const player of Object.keys(eventValue)) {
      playersSet.add(player);
    }
  }

  return [...playersSet];
}


/**
 * Goes through a dict of format {player: [Elo, ...]} and returns [startOfFirstWeek,
 * startOfLastWeek]. Non-Epoch dates are ignored. Returned dates will be null if couldn't find
 * both real dates.
 */
function getFirstAndLastWeekStartDatesFromEventDict(elosEventDict) {
  let earliestNonEpochDate = null;
  let lastNonEpochDate = null;

  for (const [player, playerValue] of Object.entries(elosEventDict)) {
    for (const [matchType, eloList] of Object.entries(playerValue)) {
      for (const eloObj of eloList) {
        if (eloObj.date.getTime() === EPOCH_DATE_OBJ.getTime()) {
          continue;
        }

        if (earliestNonEpochDate === null || eloObj.date.getTime() < earliestNonEpochDate) {
          earliestNonEpochDate = eloObj.date;
        }

        if (lastNonEpochDate === null || eloObj.date.getTime() > lastNonEpochDate) {
          lastNonEpochDate = eloObj.date;
        }
      }
    }
  }

  if (earliestNonEpochDate === null || lastNonEpochDate === null) {
    return [null, null];
  }

  return [getStartOfWeekForDate(earliestNonEpochDate),
    getStartOfWeekForDate(lastNonEpochDate)];
}

/**
 * Given a date, gets the date for the Monday at the start of that week.
 */
function getStartOfWeekForDate(date) {
  let newDate = new Date(date.getTime());
  for (let i = 0; i < 6; ++i) {
    if (newDate.getDay() === START_OF_WEEK_DAY_VALUE) {
      break;
    }
    newDate.setDate(newDate.getDate() - 1);
  }

  if (newDate.getDay() !== START_OF_WEEK_DAY_VALUE) {
    throw `Logic error: Failed to get start of week date for: ${date}`
  }

  return newDate;
}
