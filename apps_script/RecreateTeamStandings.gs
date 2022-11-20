/*
TODO:
"""
- I also kept all of those stats columns for players as well. So, you could see who has been crushing opponents (game differential) or who is on a winning streak, etc.
"""

TODO:
"""
- The other stuff I'd like to add to the Team Standings (the stuff I couldn't easily manage the way I was doing it before): keeping track of Games For (GF), Games Against (GA), and Differential (Diff). Last year, I actually kept stats on each team's GF/GA for all matches played and also separately for singles and doubles. I also kept a stat for "Last 5 matches played" (L5) and "Last 10" (L10), which is just the team's record (W-L-MTL) over the last 5 or 10 matches played. And I had a "Streak" (Strk) stat, which just says how many matches the team has Won or Loss (including MTLs) in a row: e.g., W4 or L2.
"""

TODO:
"""
- The other useful stat (useful to me) that I kept last year was a "Strength of schedule" stat: I kept track of that odds line (e.g., when a 800 player plays a 1200 player, the line would be +400) for each match a team played so I could tell whether a team was playing harder opponents (a high plus number) or easier opponents (a minus number). Again, should be easy enough to add, both for the team standings and the player standings....
"""
*/

const TEAM_STANDINGS_COLUMNS = ['Event', 'Team', 'MP', 'W', 'L', 'TBL', 'Pts', 'SW', 'STBW',
  'SL', 'STBL', 'DW', 'DTBW', 'DL', 'DTBL'];

const POINTS_FOR_WIN = 2;
const POINTS_FOR_MTB_LOSS = 1;


function recreateTeamStandingsSheet() {
  let matchBook = getRowsFromSheet(MATCH_BOOK_SHEET);

  let events = [];
  let teamsByEvent = getTeamsByEventFromEventsSheet()
  let teamStandings = {};

  for (let i = 0; i < matchBook.length; ++i) {
    let row = matchBook[i];

    let matchID = getColumn(row, MATCH_ID_COLUMN);
    let event = getColumn(row, EVENT_COLUMN);
    if (!teamsByEvent.hasOwnProperty(event)) {
      throw `Match ID=${matchID} refers to event not in ${EVENTS_SHEET} sheet: "${event}"`;
    }

    if (events.indexOf(event) === -1) {
      events.push(event);
    }

    let teamA = getColumn(row, TEAM_A_COLUMN);
    if (teamsByEvent[event].indexOf(teamA) === -1) {
      throw `Match ID=${matchID} refers to Team A which doesn't belong to event: "${teamA}"`;
    }

    let teamB = getColumn(row, TEAM_B_COLUMN);
    if (teamsByEvent[event].indexOf(teamB) === -1) {
      throw `Match ID=${matchID} refers to Team B which doesn't belong to event: "${teamB}"`;
    }

    try {
      modifyTeamStandingsStats(teamStandings, row, teamA, 'A', 'A_MTB', 'B', 'B_MTB');
      modifyTeamStandingsStats(teamStandings, row, teamB, 'B', 'B_MTB', 'A', 'A_MTB');
    }
    catch (exception) {
      // TODO doesn't work anymore
      //exception.message = `Match ID=${matchID}: ${exception.toString()}`;
      //throw exception;
      throw `Match ID=${matchID}: ${exception.toString()}`;
    }
  }

  Logger.log('Generated team standings: ' + JSON.stringify(teamStandings));

  let teamStandingsGrid = [TEAM_STANDINGS_COLUMNS];

  for (const printEvent of events) {
    for (const printTeam of teamsByEvent[printEvent]) {
      if (!teamStandings.hasOwnProperty(printEvent)) {
        continue;
      }
      if (!teamStandings[printEvent].hasOwnProperty(printTeam)) {
        continue;
      }

      eventAndTeamRowArray = [];

      for (const outputColumn of TEAM_STANDINGS_COLUMNS) {
        eventAndTeamRowArray.push(teamStandings[printEvent][printTeam][outputColumn]);
      }

      teamStandingsGrid.push(eventAndTeamRowArray);
    }
  }

  let teamStandingsSheet = getSheet(TEAM_STANDINGS_SHEET);
  teamStandingsSheet.getDataRange().clearContent();

  if (teamStandingsGrid.length > 0) {
    teamStandingsSheet.getRange(1, 1, teamStandingsGrid.length,
      teamStandingsGrid[0].length).setValues(teamStandingsGrid);
  }
}


function modifyTeamStandingsStats(teamStandings, matchRow, team, teamWinValue, teamWinMTBValue, teamLoseValue, teamLoseMTBValue
) {
  let event = getColumn(matchRow, EVENT_COLUMN);

  if (!teamStandings.hasOwnProperty(event)) {
    teamStandings[event] = {};
  }

  if (!teamStandings[event].hasOwnProperty(team)) {
    let stats = teamStandings[event][team] = {};
    
    for (const outputColumn of TEAM_STANDINGS_COLUMNS) {
      if (outputColumn === 'Event') {
        stats[outputColumn] = event;
      }
      else if (outputColumn === 'Team') {
        stats[outputColumn] = team;
      }
      else {
        stats[outputColumn] = 0;
      }
    }
  }

  let winner = getWinnerColumn(matchRow)
  let matchType = getMatchTypeColumn(matchRow)

  let stats = teamStandings[event][team];

  stats['MP'] += 1;

  if (winner === teamWinValue) {
    stats['W'] += 1;
    stats['Pts'] += POINTS_FOR_WIN;

    if (matchType === 'Singles') {
      stats['SW'] += 1;
    }
    else if (matchType === 'Doubles') {
      stats['DW'] += 1;
    }
  }
  else if (winner === teamWinMTBValue) {
    stats['W'] += 1;
    stats['Pts'] += POINTS_FOR_WIN;

    if (matchType === 'Singles') {
      stats['STBW'] += 1;
    }
    else if (matchType === 'Doubles') {
      stats['DTBW'] += 1;
    }
  }
  else if (winner === teamLoseValue) {
    stats['L'] += 1;

    if (matchType === 'Singles') {
      stats['SL'] += 1;
    }
    else if (matchType === 'Doubles') {
      stats['DL'] += 1;
    }
  }
  else if (winner === teamLoseMTBValue) {
    stats['TBL'] += 1;
    stats['Pts'] += POINTS_FOR_MTB_LOSS;

    if (matchType === 'Singles') {
      stats['STBL'] += 1;
    }
    else if (matchType === 'Doubles') {
      stats['DTBL'] += 1;
    }
  }
}