import unittest

import elo_calc


class TestCalc(unittest.TestCase):
    def test_python_rounding_behavior(self):
        self.assertEqual(round(0.44, 1), 0.4)
        self.assertEqual(round(-0.44, 1), -0.4)
        self.assertEqual(round(0.45, 1), 0.5)
        self.assertEqual(round(-0.45, 1), -0.5)
        self.assertEqual(round(0.55, 1), 0.6)
        self.assertEqual(round(-0.55, 1), -0.6)
        self.assertEqual(round(0.65, 1), 0.7)
        self.assertEqual(round(-0.65, 1), -0.7)

        # Test use of banker's rounding (standard behavior for Python 3)
        self.assertEqual(round(23.5, 0), 24)
        self.assertEqual(round(24.5, 0), 24)
        self.assertEqual(round(-23.5, 0), -24)
        self.assertEqual(round(-24.5, 0), -24)

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
