CREATE PROCEDURE updateReviews(IN inputEmail VARCHAR(255), IN inputAirline VARCHAR(255), IN inputRatings INT)
myProc: BEGIN

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
    DECLARE varNumReviews INT;
    DECLARE varPerfCounter INT DEFAULT 0;
    DECLARE varPerformance VARCHAR(255) DEFAULT "SATISFACTORY";
    DECLARE varTotalRatings REAL DEFAULT 0.0;

    BEGIN

        DECLARE varPerfAirline VARCHAR(255);
        DECLARE varAvgPerf REAL;
        DECLARE exit_loop BOOLEAN DEFAULT FALSE;

        DECLARE currPerf CURSOR FOR (SELECT A.AirlineName, ROUND((SUM(T1.Performance)/COUNT(A.AirlineName)),2) as AvgPerformance FROM
            (SELECT FR.AirlineName, (FR.CabinService + FR.ValueForMoney + FR.Entertainment + FR.FoodBev) as Performance FROM FlightReviews FR)
            AS T1 JOIN Airline A ON (T1.AirlineName = A.AirlineName) GROUP BY A.AirlineName ORDER BY AvgPerformance);

        DECLARE CONTINUE HANDLER FOR NOT FOUND SET exit_loop = TRUE;

        OPEN currPerf;

        perfLoop: LOOP

            FETCH currPerf INTO varPerfAirline, varAvgPerf;

            IF exit_loop THEN
                LEAVE perfLoop;
            END IF;

            IF varPerfAirline != inputAirline THEN
                SET varPerfCounter = varPerfCounter + 1;
            ELSE
                SET varPerfCounter = varPerfCounter + 1;
                LEAVE perfLoop;
            END IF;
        END LOOP;

        CLOSE currPerf;
    END;

    BEGIN
        DECLARE exit_loop BOOLEAN DEFAULT FALSE;

        DECLARE currVal CURSOR FOR (SELECT ReviewId, FoodBev, ValueForMoney, Entertainment, CabinService FROM FlightReviews
                                    WHERE ReviewerEmail = inputEmail AND AirlineName = inputAirline);

        DECLARE CONTINUE HANDLER FOR NOT FOUND SET exit_loop = TRUE;

        SELECT COUNT(*) INTO varNumReviews FROM FlightReviews WHERE ReviewerEmail = inputEmail AND AirlineName = inputAirline;

        IF varNumReviews < 5 THEN
            LEAVE myProc;
        END IF;

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

            SET varTotalRatings = varTotalRatings + ((varFoodBev + varValueForMoney + varEntertainment + varCabinService) / 4);

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

        SET varTotalRatings = varTotalRatings / varCounter;

        IF varTotalRatings < 2.5 THEN
            IF varPerfCounter <= 5 THEN
                SET varPerformance = "STEEP DECLINE";
            ELSEIF varPerfCounter > 5 AND varPerfCounter <= 9 THEN
                SET varPerformance = "DECLINE";
            END IF;
        ELSEIF varTotalRatings = 2.5 THEN
            IF varPerfCounter <= 5 THEN
                SET varPerformance = "DECLINE";
            ELSEIF varPerfCounter >= 9 THEN
                SET varPerformance = "IMPROVEMENT";
            END IF;
        ELSEIF varTotalRatings > 2.5 THEN
            IF varPerfCounter > 5 AND varPerfCounter <= 9 THEN
                SET varPerformance = "IMPROVEMENT";
            ELSEIF varPerfCounter >= 9 THEN
                SET varPerformance = "SHARP IMPROVEMENT";
            END IF;
        END IF;

        UPDATE Airline SET Performance = varPerformance WHERE AirlineName = inputAirline;
    END;
END;
