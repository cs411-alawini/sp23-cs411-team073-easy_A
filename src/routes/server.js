const express = require("express")
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');

const connection = mysql.createConnection({
                host: '34.27.142.39',
                user: 'root',
                password: 'test123',
                database: 'Airtime'
});

const router = express.Router()
connection.connect()

router.get('/', function(req, res) {
	
	var sqlperf = `SELECT A.AirlineName, ROUND((SUM(T1.Performance)/COUNT(A.AirlineName)),2) as AvgPerformance FROM(SELECT FR.AirlineName, (FR.CabinService + FR.ValueForMoney + FR.Entertainment + FR.FoodBev) as Performance FROM FlightReviews FR) AS T1 JOIN Airline A ON (T1.AirlineName = A.AirlineName) GROUP BY A.AirlineName ORDER BY AvgPerformance DESC LIMIT 5`;

	connection.query(sqlperf, function(err, result) {
        	if (err) {
                	//res.send(err)
                	return;
                }
                res.render('index', {bestflights : result});
        });
});

router.get('/authordisplay', function(req, res) {
	res.render('authordisplay');
});

router.post('/search', function(req, res) {
	var originAirport = req.body.from;
	var destAirport = req.body.to;
	var deptDate = req.body.deptdate;
	var deptDateFormat = deptDate.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");
	var retDate = req.body.retdate;
	var retDateFormat;

	if(retDate) {
		retDateFormat = retDate.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");
	}

	var sqldepart = `SELECT AirlineId, AirlineName, FlightNumber, OriginAirport, DestinationAirport, ScheduledDeparture, ScheduledArrival 
		   FROM Flights WHERE OriginAirport = '${originAirport}' AND DestinationAirport = '${destAirport}' AND 
		   Date = '${deptDateFormat}'`;

	var sqlreturn = `SELECT AirlineId, AirlineName, FlightNumber, OriginAirport, DestinationAirport, ScheduledDeparture, ScheduledArrival
                   FROM Flights WHERE OriginAirport = '${destAirport}' AND DestinationAirport = '${originAirport}' AND
                   Date = '${retDateFormat}'`;

	var advancedsql = `SELECT F.AirlineName, temp.DelayCount/COUNT(*) AS DelayProbability FROM Flights F JOIN (SELECT F1.AirlineName, COUNT(*) as DelayCount FROM Flights F1 WHERE F1.DepartureDelay > 0 OR F1.ArrivalDelay > 0 GROUP BY F1.AirlineName) AS temp USING (AirlineName) GROUP BY F.AirlineName ORDER BY DelayProbability`;

	console.log(advancedsql);

	connection.query(sqldepart, function(errdepart, resultdepart) {
		connection.query(advancedsql, function(erradvanced, resultadvanced) {

			if (retDate) {
				connection.query(sqlreturn, function(errreturn, resultreturn) {
 				if (errreturn || errdepart || erradvanced) {
        				//res.send(err)
            				return;
          			} 
				res.render('flightdisplay.ejs', {departingflights : resultdepart, returnflights : resultreturn, delayinfo : resultadvanced});
        		});
			} else {
				console.log("delay info");
				if (errdepart || erradvanced) {
                                	//res.send(err)
                                	return;
                        	}
                		res.render('flightdisplay.ejs', {departingflights : resultdepart, delayinfo : resultadvanced});
			}
		});
	});
});

router.post('/addflight', function(req, res) {
	var originAirport = req.body.from;
        var destAirport = req.body.to;
        var flightDate = req.body.flightdate;
        var flightDateFormat = flightDate.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");
        var deptTime = req.body.depttime;
        var arrTime = req.body.arrtime;
	var airlineName = req.body.airlinename;
	var airlineId = req.body.airlineid;
	var flightNum = req.body.flightnum;

	var flightNumInt = parseInt(flightNum);

	var sql = `INSERT INTO Flights (Date, AirlineId, FlightNumber, OriginAirport, DestinationAirport, ScheduledDeparture, ScheduledArrival, AirlineName) VALUES ('${flightDateFormat}', '${airlineId}', '${flightNumInt}', '${originAirport}', '${destAirport}', '${deptTime}', '${arrTime}', '${airlineName}')`;

	connection.query(sql, function(err, result) {
                if (err) {
                        //res.send(err)
                        return;
                }
                res.redirect('flightadded');
        });
});

router.get('/flightadded', function(req, res) {
      res.send({'message': 'Flight Added successfully!'});
});

router.post('/updateflight', function(req, res) {
	var flightDate = req.body.updateflightdate;
        var flightDateFormat = flightDate.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");
        var deptTime = req.body.updatedepttime;
        var arrTime = req.body.updatearrtime;
        var airlineId = req.body.airlineid;
        var flightNum = req.body.flightnum;

        var flightNumInt = parseInt(flightNum);

        var sql = `UPDATE Flights SET ScheduledDeparture='${deptTime}', ScheduledArrival='${arrTime}' WHERE Date='${flightDateFormat}' AND AirlineId='${airlineId}' AND FlightNumber='${flightNumInt}'`;

	console.log(sql);

        connection.query(sql, function(err, result) {
                if (err) {
                        //res.send(err)
                        return;
                }
                res.redirect('flightupdated');
        });
});

router.get('/flightupdated', function(req, res) {
      res.send({'message': 'Flight Updated successfully!'});
});

router.post('/addairline', function(req, res) {

	var airlineId = req.body.newairlineid;
	var airlineName = req.body.newairlinename;

	var sql = `INSERT INTO Airline VALUES ('${airlineId}', '${airlineName}')`;

	console.log(sql);

        connection.query(sql, function(err, result) {
                if (err) {
                        //res.send(err)
                        return;
                }
                res.redirect('airlineadded');
        });
});

router.get('/airlineadded', function(req, res) {
      res.send({'message': 'Airline added successfully!'});
});

router.post('/delairline', function(req, res) {

        var airlineId = req.body.delairlineid;
        var airlineName = req.body.delairlinename;

        var sql = `DELETE FROM Airline WHERE AirlineId='${airlineId}' AND AirlineName='${airlineName}'`;

        console.log(sql);

        connection.query(sql, function(err, result) {
                if (err) {
                        //res.send(err)
                        return;
                }
                res.redirect('airlinedeleted');
        });
});

router.get('/airlinedeleted', function(req, res) {
      res.send({'message': 'Airline deleted successfully!'});
});


module.exports = router
