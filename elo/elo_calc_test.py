import unittest

import elo_calc


class TestCalc(unittest.TestCase):
    def test_calc(self):
        self.assertEqual(
            elo_calc.calculate_elo_from_ratings(2400, 2000, True, 32),
            (2402.9091, 1997.0909),
        )

        self.assertEqual(
            elo_calc.calculate_elo_from_ratings(2400, 2000, False, 32),
            (2370.9091, 2029.0909)
        )


if __name__ == '__main__':
    unittest.main()
