# TODO validate existing example and math in full with A B C

import unittest
import tempfile
import os

import make_singles_elo_csv


class TempFileManager(object):
    def __init__(self):
        self.PLAYERS_FILE = None
        self.SINGLES_RESULTS_FILE = None
        self.SINGLES_ELO_FILE = None
        self.SINGLES_FORMATTED_ELO_FILE = None
        self.temp_files = []

    def __enter__(self):
        self.PLAYERS_FILE = tempfile.mkstemp()[1]
        self.SINGLES_RESULTS_FILE = tempfile.mkstemp()[1]
        self.SINGLES_ELO_FILE = tempfile.mkstemp()[1]
        self.SINGLES_FORMATTED_ELO_FILE = tempfile.mkstemp()[1]

        make_singles_elo_csv.PLAYERS_FILE = self.PLAYERS_FILE
        make_singles_elo_csv.SINGLES_RESULTS_FILE = self.SINGLES_RESULTS_FILE
        make_singles_elo_csv.SINGLES_ELO_FILE = self.SINGLES_ELO_FILE
        make_singles_elo_csv.SINGLES_FORMATTED_ELO_FILE = self.SINGLES_FORMATTED_ELO_FILE

        self.temp_files = [
            self.PLAYERS_FILE,
            self.SINGLES_RESULTS_FILE,
            self.SINGLES_ELO_FILE,
            self.SINGLES_FORMATTED_ELO_FILE,
        ]

        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        for temp_file_path in self.temp_files:
            os.remove(temp_file_path)


class TestCalc(unittest.TestCase):
    def test_make_singles_elo_files(self):
        with TempFileManager() as temp_file_manager:
            with open(temp_file_manager.PLAYERS_FILE, 'w') as players_file:
                pass # TODO stuff, with all files


if __name__ == '__main__':
    unittest.main()
