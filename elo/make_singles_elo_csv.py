import collections
import csv
import os

import elo_calc


PLAYERS_FILE = 'players.txt'
SINGLES_RESULTS_FILE = 'singles_results.csv'
SINGLES_ELO_FILE = 'singles_elos.csv'
SINGLES_FORMATTED_ELO_FILE = 'singles_elos_formatted.csv'

ELO_FILE_INITIAL_LOAD_MATCH_ID = 'load'


class Result:
    def __init__(self, match_id, player, elo_after):
        self.match_id = match_id
        self.player = player
        self.elo_after = elo_after


def read_players_list():
    players = set()

    if not os.path.isfile(PLAYERS_FILE):
        raise Exception(f'No players file exists: {PLAYERS_FILE}')
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
        reader = csv.DictReader(elo_csv_file_in)
        for i, row in enumerate(reader):
            row = {k.strip(): v.strip() for k, v in row.items()}
            row_number = i + 1

            match_id = get_csv_row_column(row, row_number, SINGLES_ELO_FILE, 'match_id')
            player = get_csv_row_column(row, row_number, SINGLES_ELO_FILE, 'player')
            elo_after = get_csv_row_column(row, row_number, SINGLES_ELO_FILE, 'elo_after')

            if player not in players:
                raise Exception(f'{SINGLES_ELO_FILE}: row {row_number}: Player not in {PLAYERS_FILE}: {player}')

            try:
                elo_after_value = float(elo_after)
            except (ValueError, TypeError):
                raise Exception(f'{SINGLES_ELO_FILE}: row {row_number}: Invalid elo_after value: {elo_after}')

            if match_id == ELO_FILE_INITIAL_LOAD_MATCH_ID:
                if player in elo_by_player:
                    raise Exception(f'{SINGLES_ELO_FILE}: row {row_number}: Player already had '
                                    f'"{ELO_FILE_INITIAL_LOAD_MATCH_ID}" data: {player}')

                elo_by_player[player] = elo_after_value

    return elo_by_player


def get_csv_row_column(row, row_number, file_name, column_name, expect_non_empty=True):
    value = row.get(column_name)
    if value is None:
        raise Exception(f'{file_name}: row {row_number}: No {column_name} column')
    if value == '' and expect_non_empty:
        raise Exception(f'{file_name}: row {row_number}: Empty {column_name}')
    return value


def recreate_elo_file_preserve_initial_load_values(initial_elo_by_player, results):
    if not os.path.isfile(SINGLES_ELO_FILE):
        raise Exception(f'No singles ELO file exists: {PLAYERS_FILE}')
    with open(SINGLES_ELO_FILE, 'w') as elo_csv_file_out:
        with open(SINGLES_FORMATTED_ELO_FILE, 'w') as elo_formatted_csv_file_out:
            elo_csv_file_out.write('match_id,player,elo_after' + '\n')

            elo_list_by_player = {}

            for player, initial_elo in initial_elo_by_player.items():
                elo_csv_file_out.write(ELO_FILE_INITIAL_LOAD_MATCH_ID + ',' + player + ',' + str(initial_elo) + '\n')
                elo_list_by_player[player] = [str(initial_elo)]

            for result in results:
                elo_csv_file_out.write(result.match_id + ',' + result.player + ',' + str(result.elo_after) + '\n')
                
                if result.player not in elo_list_by_player:
                    raise Exception(f'{SINGLES_ELO_FILE}: Player has match result, but no initial load: {result.player}')
                elo_list_by_player[result.player].append(str(result.elo_after))

            for player_from_list in sorted(elo_list_by_player.keys()):
                elo_formatted_csv_file_out.write(player_from_list + ',' + ','.join(elo_list_by_player[player_from_list]) + '\n')


def main():
    players = read_players_list()
    initial_elo_by_player = read_elo_file_get_initial_load_values_only()
    elo_by_player = initial_elo_by_player.copy()

    results = []

    if not os.path.isfile(SINGLES_RESULTS_FILE):
        raise Exception(f'No singles results file exists: {PLAYERS_FILE}')
    with open(SINGLES_RESULTS_FILE) as csv_file:
        reader = csv.DictReader(csv_file)

        match_ids_encountered = set()

        for i, row in enumerate(reader):
            try:
                row = {k.strip(): v.strip() for k, v in row.items()}
            except AttributeError:
                raise Exception(f'{SINGLES_RESULTS_FILE}: row {row_number}: Invalid line, probably contains wrong number of fields, score not surrounded by quotes, or stray extra commas. Got these fields: {row}')
            row_number = i + 1

            match_id = get_csv_row_column(row, row_number, SINGLES_RESULTS_FILE, 'match_id')
            season = get_csv_row_column(row, row_number, SINGLES_RESULTS_FILE, 'season')
            date = get_csv_row_column(row, row_number, SINGLES_RESULTS_FILE, 'date')
            player1 = get_csv_row_column(row, row_number, SINGLES_RESULTS_FILE, 'player1')
            player2 = get_csv_row_column(row, row_number, SINGLES_RESULTS_FILE, 'player2')
            winner = get_csv_row_column(row, row_number, SINGLES_RESULTS_FILE, 'winner')
            score = get_csv_row_column(row, row_number, SINGLES_RESULTS_FILE, 'score')

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
