CREATE PROCEDURE updateReviews(IN inputEmail VARCHAR(255), IN inputAirline VARCHAR(255), IN inputRatings INT)
BEGIN

    DECLARE varTotalReviews INT;
    DECLARE varAuthority INT;
    DECLARE varCredibility INT;
    DECLARE varAddSubRatings INT DEFAULT 1;
    DECLARE varModifyRatings REAL;

    DECLARE varReviewId INT;
    DECLARE varFoodBev REAL;
    DECLARE varEntertainment REAL;
    DECLARE varValueForMoney REAL;
    DECLARE varCabinService REAL;
    DECLARE varRecommend VARCHAR(10);
    DECLARE varCounter INT DEFAULT 0;

    DECLARE exit_loop BOOLEAN DEFAULT FALSE;

    DECLARE currVal CURSOR FOR (SELECT ReviewId, FoodBev, ValueForMoney, Entertainment, CabinService FROM FlightReviews
                                WHERE ReviewerEmail = inputEmail AND AirlineName = inputAirline);

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET exit_loop = TRUE;

    SELECT T1.totalReviews, Authority INTO varTotalReviews, varAuthority FROM UserLogin JOIN
    (SELECT ReviewerEmail, count(*) AS totalReviews FROM FlightReviews GROUP BY ReviewerEmail) AS T1
    ON (T1.ReviewerEmail = Email) WHERE ReviewerEmail = inputEmail;

    SET varCredibility = varTotalReviews / 5;

    IF varCredibility >= 10 THEN
        UPDATE UserLogin SET Credibility = 10 WHERE Email = inputEmail;
    ELSE
        UPDATE UserLogin SET Credibility = varCredibility WHERE Email = inputEmail;
    END IF;

    IF inputRatings < 2.5 THEN
        SET varAddSubRatings = -1;
        SET varRecommend = 'NO';
    ELSE
        SET varRecommend = 'YES';
    END IF;

    IF (varAuthority = 1 AND varTotalReviews >= 20) THEN
        SET varModifyRatings = 1.0 * (varCredibility / 10) * inputRatings;
    ELSEIF (varAuthority = 0 AND varTotalReviews >= 20) THEN
        SET varModifyRatings = 0.9 * (varCredibility / 10) * inputRatings;
    ELSEIF (varAuthority = 1 AND varTotalReviews >= 15 AND varTotalReviews < 20) THEN
        SET varModifyRatings = 0.6 * (varCredibility / 10) * inputRatings;
    ELSEIF (varAuthority = 0 AND varTotalReviews >= 15 AND varTotalReviews < 20) THEN
        SET varModifyRatings = 0.5 * (varCredibility / 10) * inputRatings;
    ELSEIF (varAuthority = 1 AND varTotalReviews >= 10 AND varTotalReviews < 15) THEN
        SET varModifyRatings = 0.2 * (varCredibility / 10) * inputRatings;
    ELSEIF (varAuthority = 0 AND varTotalReviews >= 10 AND varTotalReviews < 15) THEN
        SET varModifyRatings = 0.1 * (varCredibility / 10) * inputRatings;
    ELSE
        SET varModifyRatings = 0;
    END IF;

    SET varModifyRatings = varModifyRatings * varAddSubRatings;

    OPEN currVal;
    currLoop: LOOP

        FETCH currVal INTO varReviewId, varFoodBev, varValueForMoney, varEntertainment, varCabinService;

        IF exit_loop THEN
            LEAVE currLoop;
        END IF;

        IF (varFoodBev + varModifyRatings < 0) THEN
            SET varFoodBev = 0;
        ELSEIF (varFoodBev + varModifyRatings > 5) THEN
            SET varFoodBev = 5;
        ELSE
            SET varFoodBev = varFoodBev + varModifyRatings;
        END IF;

        IF (varValueForMoney + varModifyRatings < 0) THEN
            SET varValueForMoney = 0;
        ELSEIF (varValueForMoney + varModifyRatings > 5) THEN
            SET varValueForMoney = 5;
        ELSE
            SET varValueForMoney = varValueForMoney + varModifyRatings;
        END IF;

        IF (varEntertainment + varModifyRatings < 0) THEN
            SET varEntertainment = 0;
        ELSEIF (varEntertainment + varModifyRatings > 5) THEN
            SET varEntertainment = 5;
        ELSE
            SET varEntertainment = varEntertainment + varModifyRatings;
        END IF;

        IF (varCabinService + varModifyRatings < 0) THEN
            SET varCabinService = 0;
        ELSEIF (varCabinService + varModifyRatings > 5) THEN
            SET varCabinService = 5;
        ELSE
            SET varCabinService = varCabinService + varModifyRatings;
        END IF;

        SET varCounter = varCounter + 1;

        UPDATE FlightReviews SET FoodBev = varFoodBev, ValueForMoney = varValueForMoney, CabinService = varCabinService,
                                 Entertainment = varEntertainment, Recommended = varRecommend WHERE ReviewId = varReviewId;

    END LOOP;

    CLOSE currVal;
    SELECT varCounter;
END;
