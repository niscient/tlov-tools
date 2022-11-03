'''
Readings:
https://metinmediamath.wordpress.com/2013/11/27/how-to-calculate-the-elo-rating-including-example/
https://www.omnicalculator.com/sports/elo
https://www.chess.com/forum/view/general/historic-elo-ratings-rounded-in-steps-of-5
https://www.geeksforgeeks.org/elo-rating-algorithm/
https://en.wikipedia.org/wiki/Elo_rating_system#Mathematical_details
https://math.stackexchange.com/questions/1303984/take-the-outcome-of-a-draw-in-elo-formula
http://www.tennisabstract.com/blog/2019/12/03/an-introduction-to-tennis-elo/
http://www.tennisabstract.com/blog/2018/09/18/jack-sock-doubles-king-once-again/
https://github.com/sleepomeno/tennis_atp/blob/master/examples/elo.R
'''


K = 500
DECIMAL_ROUND_PLACES = 4


def get_expected_rating(my_rating, opponent_rating):
    return 1.0 / (1.0 + pow(10.0, (opponent_rating - my_rating) / 400.0))


def calculate_elo_from_ratings(rating1, rating2, did_first_player_win, k=K):
    """Standard ELO calculation technique."""
    expected1 = get_expected_rating(rating1, rating2)
    expected2 = get_expected_rating(rating2, rating1)

    score1 = 1.0
    score2 = 0.0
    if not did_first_player_win:
        score1 = 0.0
        score2 = 1.0

    adjustment1 = k * (score1 - expected1)
    adjustment1 = round(adjustment1, DECIMAL_ROUND_PLACES)

    # The adjustments of score1 and score2 will always be inverses. To avoid adjusting the ratings by inverses which
    # differ slightly due to rounding issues, we'll only use the full formula for the adjustment of the first rating.
    # We'll use the full formula for the second rating only to do error checking.
    adjustment2 = -adjustment1
    adjustment2_full_formula = k * (score2 - expected2)
    adjustment2_full_formula = round(adjustment2_full_formula, DECIMAL_ROUND_PLACES)

    if adjustment2 != adjustment2_full_formula:
        # This should never happen, since in either Python 2 or Python 3, the absolute value of the result of rounding
        # an input value X should be identical to the result if the input value were -X. Because unrounded adjustment1
        # and adjustment2 are supposed to be inverses, they will both round the same way, and their rounded versions
        # should still be inverses.
        raise Exception(f'ELO calculation for adjustment2 fails: '
                'rating1={rating1}, rating2={rating2}, '
                'winner={winner}, did_first_player_win={did_first_player_win}',
                'adjustment1={adjustment1}, adjustment2={adjustment2}, '
                'adjustment2_full_formula={adjustment2_full_formula}')

    result1 = rating1 + adjustment1
    result2 = rating2 + adjustment2

    return round(result1, DECIMAL_ROUND_PLACES), round(result2, DECIMAL_ROUND_PLACES)
