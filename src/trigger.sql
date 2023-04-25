CREATE TRIGGER reduce_review AFTER UPDATE ON Flights FOR EACH ROW 
BEGIN
    SET @num_flights = (SELECT COUNT(*) FROM Flights WHERE AirlineName = NEW.AirlineName);
    SET @num_delay = (SELECT COUNT(*) FROM Flights WHERE AirlineName = NEW.AirlineName AND (DepartureDelay > 0 OR ArrivalDelay > 0));
    SET @delay_prob = num_delay / num_flights;

    IF @delay_prob > 0.7 THEN
        UPDATE FlightReview
        SET SeatComfort = SeatComfort - 0.5, CabinService = CabinService - 0.5, FoodBev = FoodBev - 0.5, Entertainment = Entertainment - 0.5, 
            GroundService = GroundService - 0.5, ValueForMoney = ValueForMoney - 0.5 
        WHERE AirlineName = NEW.AirlineName;
    ELSE IF @delay_prob > 0.9 THEN
        UPDATE FlightReview
        SET SeatComfort = SeatComfort - 1, CabinService = CabinService - 1, FoodBev = FoodBev - 1, Entertainment = Entertainment - 1, 
            GroundService = GroundService - 1, ValueForMoney = ValueForMoney - 1 
        WHERE AirlineName = NEW.AirlineName;
    ELSE IF @delay_prob < 0.4 THEN
        UPDATE FlightReview
        SET SeatComfort = SeatComfort + 0.2, CabinService = CabinService + 0.2, FoodBev = FoodBev + 0.2, Entertainment = Entertainment + 0.2, 
            GroundService = GroundService + 0.2, ValueForMoney = ValueForMoney + 0.2
        WHERE AirlineName = NEW.AirlineName; 
    END IF;
    
END;
