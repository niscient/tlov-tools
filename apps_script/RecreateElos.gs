// TODO maybe split into separate functions per sheet?
function recreateEloSheets() {
  // Get a complete set of Elo updates, in the order in which they happened -- including
  // manually-set Elos for players who didn't play any matches for the relevant
  // event+player+matchType.
  let elosDict = computeElosDictAllPlayers();

  // TODO get dict of match ID to match row, so can get worst loss and greatest win details

  let rankingsDict = {};

  // TODO go through events in some kind of order? maybe same order as appear in match results?

  // TODO go through players in some order? alphabetical?

  // TODO go through match type in some order? singles then doubles?

  // TODO parse results, incl. keeping track of rankings per event per week. get "week 1" start
  // date from the earliest match result date -- at least the earliest one higher than the epoch
  // date from the manual results. i consider week 1 to be the first week of the month. find a
  // way to get the most recent Monday as of that date. then add 7 days to that to get week 2,
  // etc. keep going until hit the end of the ratings for that event. have sanity testing where
  // if an event has more than say 100 weeks in it, raise an error.

  // TODO maybe test adding a column after "Z" via code to make sure it works.
}
