const MATCH_BOOK_SHEET = 'MatchBook';
const PLAYERS_SHEET = 'Players';
const EVENTS_SHEET = 'Events';
const ELO_SHEET = 'EloSingles';
const TEAM_STANDINGS_SHEET = 'TeamStandings';

const MATCH_ID_COLUMN = 'Match ID';
const EVENT_COLUMN = 'Event';
const MATCH_TYPE_COLUMN = 'Match Type';
const PLAYER_A1_COLUMN = 'Player A1';
const PLAYER_A2_COLUMN = 'Player A2';
const PLAYER_B1_COLUMN = 'Player B1';
const PLAYER_B2_COLUMN = 'Player B2';
const TEAM_A_COLUMN = 'Team A';
const TEAM_B_COLUMN = 'Team B';
const WINNER_COLUMN = 'Winner';
const TEAM_COLUMN = 'Team';
const PLAYER_COLUMN = 'Player';
const DATE_COLUMN = 'Date';
const DATE_MODIFIED_COLUMN = 'Date Modified';
const SINGLES_SALARY_COLUMN = 'Singles Salary';
const DOUBLES_SALARY_COLUMN = 'Doubles Salary';

// TODO despite the Z this doesn't return UTC, instead using local time
const EPOCH_TIMESTAMP = "1970-01-01T00:00:00.000Z";


function getSheet(sheetName) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (sheet === null) {
    throw `Unable to find sheet: "${sheetName}"`;
  }
  return sheet;
}


function getColumn(row, columnName) {
  if (!row.hasOwnProperty(columnName)) {
    throw `No such column: "${columnName}". Full row: ${row}`;
  }
  return row[columnName];
}


function getWinnerColumn(row) {
  let winner = getColumn(row, WINNER_COLUMN);
  if (['A', 'B', 'A_MTB', 'B_MTB'].indexOf(winner) === -1) {
    throw `Invalid winner: "${winner}"`;
  }
  return winner;
}


function getMatchTypeColumn(row) {
  let matchType = getColumn(row, MATCH_TYPE_COLUMN);
  if (['Singles', 'Doubles'].indexOf(matchType) === -1) {
    throw `Invalid match type: "${matchType}"`;
  }
  return matchType;
}


function getRowsFromSheet(sheetName) {
  let sheet = getSheet(sheetName);

  var foundFirstLine = false;
  var columnIndexes = {};
  var data = [];

  let dataGrid = sheet.getDataRange().getValues();
  for (var row_i = 0; row_i < dataGrid.length; row_i++) {
    let row = dataGrid[row_i];

    if (!foundFirstLine) {
      if (row.length > 0 && row[0] != '') {
        foundFirstLine = true;

        for (var col_i = 0; col_i < row.length; col_i++) {
          let columnName = row[col_i];
          if (columnName in columnIndexes) {
            throw `Sheet "${sheetName}": Duplicate column header: "${columnName}"`;
          }
          if (columnName === '') {
            throw `Sheet "${sheetName}": Empty column header with index: ${col_i}`;
          }
          if (columnName.constructor !== String) {
            throw `Sheet "${sheetName}": Column header must be string: "${columnName}"`;
          }

          columnIndexes[columnName] = col_i;
        }
      }
    }
    else {
      rowDict = {};
      for (let columnName in columnIndexes) {
        rowDict[columnName] = row[columnIndexes[columnName]];
      }

      data.push(rowDict);
    }
  }

  return data;
}


function getTeamListByEventFromEventsSheet() {
  var teamListByEvent = {};

  let eventsGrid = getRowsFromSheet(EVENTS_SHEET)
  for (let i = 0; i < eventsGrid.length; i++) {
    let eventRow = eventsGrid[i];

    let event = getColumn(eventRow, EVENT_COLUMN);
    let team = getColumn(eventRow, TEAM_COLUMN);

    if (teamListByEvent.hasOwnProperty(event)) {
      if (teamListByEvent[event].indexOf(team) === -1) {
        teamListByEvent[event].push(team);
      }
    }
    else {
      teamListByEvent[event] = [team];
    }
  }

  return teamListByEvent;
}