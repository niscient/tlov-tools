'''
Readings:
https://metinmediamath.wordpress.com/2013/11/27/how-to-calculate-the-elo-rating-including-example/
https://www.omnicalculator.com/sports/elo
https://www.chess.com/forum/view/general/historic-elo-ratings-rounded-in-steps-of-5
https://www.geeksforgeeks.org/elo-rating-algorithm/
https://en.wikipedia.org/wiki/Elo_rating_system#Mathematical_details
https://math.stackexchange.com/questions/1303984/take-the-outcome-of-a-draw-in-elo-formula
http://www.tennisabstract.com/blog/2019/12/03/an-introduction-to-tennis-elo/
http://www.tennisabstract.com/blog/2019/12/03/an-introduction-to-tennis-elo/
http://www.tennisabstract.com/blog/2018/09/18/jack-sock-doubles-king-once-again/
https://github.com/sleepomeno/tennis_atp/blob/master/examples/elo.R
'''


K = 500

def get_expected_rating(my_rating, opponent_rating):
    return 1.0 / (1.0 + pow(10.0, (opponent_rating - my_rating) / 400.0))


def calculate_elo_from_ratings(rating1, rating2, did_first_player_win, k=K):
    expected1 = get_expected_rating(rating1, rating2)
    expected2 = get_expected_rating(rating2, rating1)

    score1 = 1
    score2 = 0
    if not did_first_player_win:
        score1 = 0
        score2 = 1

    result1 = rating1 + k * (score1 - expected1)
    result2 = rating2 + k * (score2 - expected2)

    # TODO refine rounding behavior
    return round(result1, 1), round(result2, 1)
