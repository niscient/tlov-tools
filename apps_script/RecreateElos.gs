const START_OF_WEEK_DAY_VALUE = 1;  // Monday

const ELO_PER_WEEK_MANDATORY_COLUMNS = ['Event', 'Match Type', 'Player'];

const CURRENT_ELO_COLUMNS = ['Event', 'Match Type', 'Player', 'Current Rating',
  'Highest Rating', 'Highest Rating Date', 'Lowest Rating', 'Lowest Rating Date',
  'Current Ranking', 'Highest Ranking', 'Lowest Ranking', 'Biggest Win', 'Worst Loss'];


// TODO maybe split into separate functions per sheet?
function recreateEloSheets() {
  // Get a complete set of Elo updates, in the sorted order in which they happened -- including
  // manually-set Elos for players who didn't play any matches for the relevant
  // event+player+matchType.
  let elosDict = computeElosDictAllPlayers();

  let events = [...Object.keys(elosDict)];
  events.sort();

  let players = getPlayersFromElosDict(elosDict);
  players.sort();

  // TODO get dict of match ID to match row, so can get worst loss and greatest win details

  // Dict of format {event: {matchType: {player: [rating, ...]}}}, with each rating being
  // an end-of-week rating. Note that start-of-season ratings are not stored.
  let weeklyRatingsDict = {};

  // Dict of format {event: {matchType: [TODO object]}}
  //let weeklyRankingsDict = {};

  //let currentStats = {};

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
        // TODO i'm worried about nonsense occurring where timezone gets in the way and makes it
        // so that dates don't fall into the week they should. maybe i should arbitrarily set all
        // times to UTC midnight when i read the dates to begin with.

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

    Logger.log(weeklyRatingsDict);
  }

  let weeklyEloGrid = [ELO_PER_WEEK_MANDATORY_COLUMNS];

  let weeklyEloGridColumnCount = weeklyEloGrid[0].length;

  for (const event of events) {
    for (const matchType of ['Singles', 'Doubles']) {
      if (!weeklyRatingsDict[event].hasOwnProperty(matchType)) {
        continue;
      }

      for (const player of players) {
        if (!weeklyRatingsDict[event][matchType].hasOwnProperty(player)) {
          continue;
        }

        weeklyEloGrid.push([event, matchType, player,
          ...weeklyRatingsDict[event][matchType][player]]);

        // Note that if any row in the grid has a different number of columns than any other row,
        // we'll get an error when we try to write the grid to the sheet.
        weeklyEloGridColumnCount = weeklyRatingsDict[event][matchType][player].length;
      }
    }
  }

  for (let i = 0; i < weeklyEloGridColumnCount; ++i) {
    weeklyEloGrid[0].push(`Week ${i + 1}`);
  }

  //Logger.log(weeklyEloGrid);

  let eloPerWeekSheet = getSheet(ELO_PER_WEEK_SHEET);
  eloPerWeekSheet.getDataRange().clearContent();

  if (weeklyEloGrid.length > 0) {
    eloPerWeekSheet.getRange(1, 1, weeklyEloGrid.length,
      weeklyEloGrid[0].length).setValues(weeklyEloGrid);
  }
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
