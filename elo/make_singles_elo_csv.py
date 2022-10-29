# TODO create test for entire CSV creation process, including a series of related matches

import collections
import csv
import os

import elo_calc


PLAYERS_FILE = 'players.txt'
SINGLES_RESULTS_FILE = 'singles_results.csv'
SINGLES_ELO_FILE = 'singles_elos.csv'

ELO_FILE_INITIAL_LOAD_MATCH_ID = 'load'


class Result:
    def __init__(self, match_id, player, elo_after):
        self.match_id = match_id
        self.player = player
        self.elo_after = elo_after


def read_players_list():
    players = set()

    if not os.path.isfile(PLAYERS_FILE):
        raise Exception('No players file exists: {PLAYERS_FILE}')
    with open(PLAYERS_FILE) as players_file:
        for line in players_file:
            if line:
                players.add(line.strip())

    return players


def read_elo_file_get_initial_load_values_only():
    players = read_players_list()
    elo_by_player = collections.OrderedDict()

    if not os.path.isfile(SINGLES_ELO_FILE):
        raise Exception(f'No singles ELO file exists: {PLAYERS_FILE}')
    with open(SINGLES_ELO_FILE) as elo_csv_file_in:
        reader = csv.reader(elo_csv_file_in)
        for i, row in enumerate(reader):
            row = [x.strip() for x in row]
            row_number = i + 1

            if len(row) != 3:
                raise Exception(f'{SINGLES_ELO_FILE}: row {row_number}: Unexpected number of columns')

            if i == 0:
                continue

            match_id, player, elo_after = row

            if player not in players:
                raise Exception(f'{SINGLES_ELO_FILE}: row {row_number}: Player not in {PLAYERS_FILE}: {player}')

            try:
                elo_after_value = float(elo_after)
            except ValueError:
                raise Exception(f'{SINGLES_ELO_FILE}: row {row_number}: Invalid elo_after value: {elo_after}')

            if match_id == ELO_FILE_INITIAL_LOAD_MATCH_ID:
                if player in elo_by_player:
                    raise Exception(f'{SINGLES_ELO_FILE}: row {row_number}: Player already had '
                                    f'"{ELO_FILE_INITIAL_LOAD_MATCH_ID}" data: {player}')

                elo_by_player[player] = elo_after_value

    return elo_by_player


def recreate_elo_file_preserve_initial_load_values(initial_elo_by_player, results):
    if not os.path.isfile(SINGLES_ELO_FILE):
        raise Exception(f'No singles ELO file exists: {PLAYERS_FILE}')
    with open(SINGLES_ELO_FILE, 'w') as elo_csv_file_out:
        # TODO justify output text?

        elo_csv_file_out.write('match_id,player,elo_after' + '\n')

        for player, initial_elo in initial_elo_by_player.items():
            elo_csv_file_out.write(ELO_FILE_INITIAL_LOAD_MATCH_ID + ',' + player + ',' + str(initial_elo) + '\n')

        for result in results:
            elo_csv_file_out.write(result.match_id + ',' + result.player + ',' + str(result.elo_after) + '\n')


def main():
    players = read_players_list()
    initial_elo_by_player = read_elo_file_get_initial_load_values_only()
    elo_by_player = initial_elo_by_player.copy()

    results = []

    if not os.path.isfile(SINGLES_RESULTS_FILE):
        raise Exception(f'No singles results file exists: {PLAYERS_FILE}')
    with open(SINGLES_RESULTS_FILE) as csv_file:
        reader = csv.reader(csv_file)

        match_ids_encountered = set()

        for i, row in enumerate(reader):
            row = [x.strip() for x in row]
            row_number = i + 1

            if len(row) != 7:
                raise Exception(f'{SINGLES_RESULTS_FILE}: row {row_number}: Unexpected number of columns')

            if i == 0:
                continue

            match_id, season, date, player1, player2, winner, score = row

            # TODO add all kinds of error checking

            if match_id in match_ids_encountered:
                raise Exception(f'{SINGLES_RESULTS_FILE}: row {row_number}: Cannot reuse match_id: {match_id}')
            match_ids_encountered.add(match_id)

            if player1 not in players:
                raise Exception(f'{SINGLES_RESULTS_FILE}: row {row_number}: Player not in {PLAYERS_FILE}: {player1}')
            if player2 not in players:
                raise Exception(f'{SINGLES_RESULTS_FILE}: row {row_number}: Player not in {PLAYERS_FILE}: {player2}')
            if winner not in ('1', '2'):
                raise Exception(f'{SINGLES_RESULTS_FILE}: row {row_number}: Winner must be 1 or 2, not: {winner}')

            elo1 = elo_by_player.get(player1)
            elo2 = elo_by_player.get(player2)

            if elo1 is None:
                raise Exception(f'{SINGLES_RESULTS_FILE}: row {row_number}: Player has no initial data load in '
                                f'{SINGLES_ELO_FILE}: {player1}')
            if elo2 is None:
                raise Exception(f'{SINGLES_RESULTS_FILE}: row {row_number}: Player has no initial data load in '
                                f'{SINGLES_ELO_FILE}: {player2}')

            result1, result2 = elo_calc.calculate_elo_from_ratings(elo1, elo2, did_first_player_win=winner=='1',
                k=elo_calc.K)

            results.append(Result(match_id, player1, result1))
            results.append(Result(match_id, player2, result2))

            elo_by_player[player1] = result1
            elo_by_player[player2] = result2

    recreate_elo_file_preserve_initial_load_values(initial_elo_by_player, results)


if __name__ == '__main__':
    main()
