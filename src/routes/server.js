const express = require("express")
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const async = require('async');

const connection = mysql.createConnection({
                host: '34.27.142.39',
                user: 'root',
                password: 'test123',
                database: 'Airtime'
});

const router = express.Router()

const airlineMap = new Map();

airlineMap.set('AS', 'Alaska Airlines Inc.');
airlineMap.set('US', 'US Airways Inc.');
airlineMap.set('AA', 'American Airlines Inc.');
airlineMap.set('B6', 'JetBlue Airways');
airlineMap.set('DL', 'Delta Air Lines Inc.');
airlineMap.set('EV', 'Atlantic Southeast Airlines');
airlineMap.set('F9', 'Frontier Airlines Inc.');
airlineMap.set('HA', 'Hawaiian Airlines Inc.');
airlineMap.set('MQ', 'American Eagle Airlines Inc.');
airlineMap.set('NK', 'Spirit Air Lines');
airlineMap.set('OO', 'Skywest Airlines Inc.');
airlineMap.set('UA', 'United Air Lines Inc.');
airlineMap.set('VX', 'Virgin America');
airlineMap.set('WN', 'Southwest Airlines Co.');

const airlineLink = new Map();

airlineLink.set('Alaska Airlines Inc.', 'https://www.alaskaair.com/');
airlineLink.set('US Airways Inc.', 'https://www.flights.com/airlines/us-airways-flights/');
airlineLink.set('American Airlines Inc.', 'https://www.aa.com/homePage.do');
airlineLink.set('JetBlue Airways', 'https://www.jetblue.com/');
airlineLink.set('Delta Air Lines Inc.', 'https://www.delta.com/');
airlineLink.set('Atlantic Southeast Airlines', 'https://www.expressjet.com/');
airlineLink.set('Frontier Airlines Inc.', 'https://www.flyfrontier.com/');
airlineLink.set('Hawaiian Airlines Inc.', 'https://www.hawaiianairlines.com/');
airlineLink.set('American Eagle Airlines Inc.', 'https://www.aa.com/homePage.do');
airlineLink.set('Spirit Air Lines', 'https://www.spirit.com/');
airlineLink.set('Skywest Airlines Inc.', 'https://www.skywest.com/');
airlineLink.set('United Air Lines Inc.', 'https://www.united.com/en/us');
airlineLink.set('Virgin America', 'https://www.virginatlantic.com/us/en');
airlineLink.set('Southwest Airlines Co.', 'https://www.southwest.com/');

connection.connect()

router.use(bodyParser.json());

var delayInformation;
var perfInformation;

router.get('/', function(req, res) {

    var sqlperf = `SELECT A.AirlineId, A.Performance, A.AirlineName, ROUND((SUM(T1.Performance)/COUNT(A.AirlineName)),2) as AvgPerformance FROM(SELECT FR.AirlineId, (FR.CabinService + FR.ValueForMoney + FR.Entertainment + FR.FoodBev) as Performance FROM FlightReviews FR) AS T1 JOIN Airline A ON (T1.AirlineId = A.AirlineId) GROUP BY A.AirlineId ORDER BY AvgPerformance DESC`;

  var advancedsql = `SELECT F.AirlineName, temp.DelayCount/COUNT(*) AS DelayProbability FROM Flights F JOIN (SELECT F1.AirlineName, COUNT(*) as DelayCount FROM Flights F1 WHERE F1.DepartureDelay > 0 OR F1.ArrivalDelay > 0 GROUP BY F1.AirlineName) AS temp USING (AirlineName) GROUP BY F.AirlineName ORDER BY DelayProbability`;

  var airportinfo = `SELECT AirportId, City FROM Airports`;

  async.parallel([
				function(callback) { connection.query(sqlperf, callback) },
				function(callback) { connection.query(airportinfo, callback) }
				], function(err, results) {
								if (err) {
												console.log(err);
								}
								res.render('index', { bestflights : results[0][0], airlineMap: airlineLink,  airports : results[1][0]});
								perfInformation = results[0][0];
				}
	);

  connection.query(advancedsql, function(err, result) {
        if (err) {
                //res.send(err)
                return;
        }
        delayInformation = result;
  });

});

router.get('/avgflightdisplay', function(req, res) {
    res.render('avgflightdisplay', {bestflights : perfInformation, airlineMap : airlineLink});
});

router.get('/authordisplay', function(req, res) {
	res.render('authordisplay');
});

router.get('/reviews', function(req, res) {
  var sql = `SELECT AirlineName, AirlineId from Airline`;
  connection.query(sql, function(err, result) {
        if (err) {
                //res.send(err)
                return;
        }
        res.render('reviews', {airlines : result});
  });
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



	connection.query(sqldepart, function(errdepart, resultdepart) {

			if (retDate) {
				connection.query(sqlreturn, function(errreturn, resultreturn) {
 				if (errreturn || errdepart) {
        				//res.send(err)
            				return;
          			} 
				res.render('flightdisplay.ejs', {departingflights : resultdepart, returnflights : resultreturn, delayinfo : delayInformation});
        		});
			} else {
				console.log("delay info");
				if (errdepart) {
                                	//res.send(err)
                                	return;
                        	}
                		res.render('flightdisplay.ejs', {departingflights : resultdepart, delayinfo : delayInformation});
			}
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

	var sql = `INSERT INTO Flights (Date, AirlineId, FlightNumber, OriginAirport, DestinationAirport, ScheduledDeparture, ScheduledArrival,
	AirlineName, DepartureDelay, ArrivalDelay) VALUES
	('${flightDateFormat}', '${airlineId}', '${flightNumInt}', '${originAirport}', '${destAirport}', '${deptTime}', '${arrTime}', '${airlineName}', 0, 0)`;

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

        var oldDepartureTime;
        var oldArrivalTime;
        console.log("here");

        var selectSql = `SELECT ScheduledDeparture, ScheduledArrival FROM Flights WHERE Date='${flightDateFormat}' AND AirlineId='${airlineId}' AND FlightNumber='${flightNumInt}'`;
        connection.query(selectSql, function(err, result) {
                if (err) {
                        //res.send(err)
                        return;
                }
                oldDepartureTime = result[0].ScheduledDeparture;
                oldArrivalTime = result[0].ScheduledArrival;

                var time1 = new Date();
                time1.setHours(oldDepartureTime.substr(0, 2));
                        time1.setMinutes(oldDepartureTime.substr(2, 2));
                        time1.setSeconds(0);

                        var time2 = new Date();
                        time2.setHours(deptTime.substr(0, 2));
                        time2.setMinutes(deptTime.substr(2, 2));
                        time2.setSeconds(0);

                        var diffInMs = time2 - time1;
                        const diffInHourDept = Math.round(diffInMs / 3600000);

                        time1 = new Date();
                        time1.setHours(oldArrivalTime.substr(0, 2));
                        time1.setMinutes(oldDepartureTime.substr(2, 2));
                        time1.setSeconds(0);

                        time2 = new Date();
                        time2.setHours(arrTime.substr(0, 2));
                        time2.setMinutes(arrTime.substr(2, 2));
                        time2.setSeconds(0);

                        diffInMs = time2 - time1;
                        const diffInHourArr = Math.round(diffInMs / 3600000);

                        console.log("Departure delay " + diffInHourDept + " arrival delay " + diffInHourArr);

                        var sqlUpdate = `UPDATE Flights SET ScheduledDeparture='${deptTime}', ScheduledArrival='${arrTime}', DepartureDelay=${diffInHourDept}, ArrivalDelay=${diffInHourArr} WHERE Date='${flightDateFormat}' AND AirlineId='${airlineId}' AND FlightNumber='${flightNumInt}'`;

                        connection.query(sqlUpdate, function(err, result) {
                            console.log("updating...")
                                if (err) {
                                        console.log(err);
                                        return;
                                }
                                console.log("updated");
                                res.redirect('flightupdated');
                        });
        });

//        console.log("type" + typeof oldDepartureTime);
//        oldDepartureTime = oldDepartureTime.toString();
//        oldArrivalTime = oldArrivalTime.toString();
//
//        var time1 = new Date();
//        time1.setHours(oldDepartureTime.substr(0, 2));
//        time1.setMinutes(oldDepartureTime.substr(2, 2));
//        time1.setSeconds(0);
//
//        var time2 = new Date();
//        time2.setHours(deptTime.substr(0, 2));
//        time2.setMinutes(deptTime.substr(2, 2));
//        time2.setSeconds(0);
//
//        var diffInMs = time2 - time;
//        const diffInHourDept = Math.round(diffInMs / 3600000);
//
//        time1 = new Date();
//        time1.setHours(oldArrivalTime.substr(0, 2));
//        time1.setMinutes(oldDepartureTime.substr(2, 2));
//        time1.setSeconds(0);
//
//        time2 = new Date();
//        time2.setHours(arrTime.substr(0, 2));
//        time2.setMinutes(arrTime.substr(2, 2));
//        time2.setSeconds(0);
//
//        diffInMs = time2 - time;
//        const diffInHourArr = Math.round(diffInMs / 3600000);
//
//        console.log("Departure delay " + diffInHourDept + " arrival delay " + diffInHourArr);
//
//        var sql = `UPDATE Flights SET ScheduledDeparture='${deptTime}', ScheduledArrival='${arrTime}', DepartureDelay='${diffInHourDept}',
//        ArrivalDelay='${diffInHourArr}' WHERE Date='${flightDateFormat}' AND AirlineId='${airlineId}' AND FlightNumber='${flightNumInt}'`;
//
//	console.log(sql);
//
//        connection.query(sql, function(err, result) {
//                if (err) {
//                        //res.send(err)
//                        return;
//                }
//                res.redirect('flightupdated');
//        });
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

router.post('/submitreview', function(req, res) {
				var email = req.body.username;
				var airlineId = req.body.airline;
				var reviewDate = req.body.revdate;
				var travelType = req.body.traveltype;
				var cabinType = req.body.cabintype;
				var route = req.body.route;
				var dateFlown = req.body.flydate;
				var comfort = parseFloat(req.body.comfort);
				var cabinService = parseFloat(req.body.service);
				var foodBev = parseFloat(req.body.foodbev);
				var entertainment = parseFloat(req.body.entertainment);
				var groundService = parseFloat(req.body.grservice);
				var money = parseFloat(req.body.money);
				var recommend = req.body.recommend;

				var reviewDateFormat = reviewDate.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");
				var dateFlownFormat = dateFlown.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");

				var airlineName = airlineMap.get(airlineId);

				var ratings = (comfort + cabinService + foodBev + entertainment + groundService + money) / 6;
				console.log("Email of reviewer " + email);

				var sqlInsert = `INSERT INTO FlightReviews (AirlineId, ReviewerEmail, AirlineName, ReviewDate, CustomerReview, TravellerType, Cabin, Route, DateFlown, SeatComfort, CabinService, FoodBev, Entertainment, GroundService, ValueForMoney, Recommended) VALUES ('${airlineId}', '${email}', '${airlineName}', '${reviewDateFormat}', '${req.body.review}', '${travelType}', '${cabinType}', '${route}', '${dateFlownFormat}', '${comfort}', '${cabinService}', '${foodBev}', '${entertainment}', '${groundService}', '${money}', '${recommend}')`;

				var sqlProc = `CALL updateReviews(?, ?, ?)`;

				connection.query(sqlInsert, function(err, result) {
                if (err) {
                        //res.send(err)
                        console.log(err);
                        return;
                }
                res.redirect('reviewinserted');
        });

        connection.query(sqlProc,
        				[email, airlineName, ratings],
        				function(err, result) {
                if (err) {
                        //res.send(err)
                        console.log(err);
                        return;
                }
                console.log(result);
        });

});

router.get('/reviewinserted', function(req, res) {
      res.send({'message': 'Review submitted successfully!'});
});

router.get('/login', function(req, res) {
				console.log("get login");
      res.render('login');
});

router.post('/login', function(req, res) {
				console.log("received login request");

				var email = req.body.username;
				var password = req.body.password;

				if (!email || !password) {
								res.status(400).send('Username and password are required');
								return;
				}

				var sql = `SELECT * FROM UserLogin WHERE Email = '${email}' AND Password = '${password}'`;

				connection.query(sql, function(err, result) {
                if (err) {
                        //res.send(err)
                        res.status(500).send('Error fetching user from database');
                        console.log(err);
                        return;
                } else if (result.length > 0) {
												const user = result[0];
												res.status(200).send({ message: 'Login successful', user });
								} else {
												res.status(401).send('User does not exist. Sign up to gain access!');
								}
        });

				console.log(req.body.username);
});

router.post('/signup', function(req, res) {
        console.log("received signup request");

        var email = req.body.username;
        var password = req.body.password;

        if (!email || !password) {
                res.status(400).json({error: 'Username and password are required'});
                return;
        }

        var sql = `INSERT INTO UserLogin VALUES ('${email}', '${password}', 0, 0)`;

        connection.query(sql, function(err, result) {
                if (err) {
                        //res.send(err)
                        console.log(err);
                        res.status(500).json({error: 'Error creating new user. User may already exist!'});
                        return;
                } else {
						res.status(201).send({message: 'New user created successfully'});
				}
		});

        console.log(req.body.username);
});

router.get('/authorizedlogin', function(req, res) {
        console.log("get login");
      res.render('authorizedlogin');
});

router.post('/authorizedlogin', function(req, res) {
				console.log("received login request");

				var email = req.body.username;
				var password = req.body.password;

				if (!email || !password) {
								res.status(400).json({error: 'Username and password are required'});
								return;
				}

				var sql = `SELECT Authority FROM UserLogin WHERE Email = '${email}' AND Password = '${password}'`;

				connection.query(sql, function(err, result) {
                if (err) {
                        //res.send(err)
                        res.status(500).json({error: 'Error fetching user from database'});
                        console.log(err);
                        return;
                } else if (result.length > 0) {
												const user = result[0];
												if (user.Authority == 1) {
																res.status(200).send({ message: 'Login successful', user });
												} else {
																res.status(401).json({error: 'Unauthorized user! Sign up to gain access!'});
												}
								} else {
												res.status(401).json({error:'User does not exist! Sign up to gain access!'});
												return;
								}
        });

				console.log(req.body.username);
});

router.post('/authorizedsignup', function(req, res) {
        console.log("received signup request");

        var email = req.body.username;
        var password = req.body.password;

        if (!email || !password) {
                res.status(400).json({error: 'Username and password are required'});
                return;
        }

        const randomBoolean = Math.random() < 0.5;

				const response = randomBoolean ? "yes" : "no";

				if (response == "no") {
								res.status(401).json({error: 'Credentials unverified! Cannot give authorization!'});
								return;
				}

				var sqlSelect = `SELECT * FROM UserLogin WHERE Email = '${email}' and Password = '${password}'`;
				connection.query(sqlSelect, function(err, result) {
                if (err) {
                        //res.send(err)
                        console.log(err);
                        res.status(500).json({error: 'Error creating new user'});
                        return;
                } else if (result.length > 0) {
                				var sql = `UPDATE UserLogin SET Authority = 1, Credibility = 2 WHERE Email = '${email}' and Password = '${password}'`;
                				connection.query(sql, function(err, result) {
																if (err) {
																				//res.send(err)
																				console.log(err);
																				res.status(500).json({error: 'Error updating user'});
																				return;
																} else {
																				res.status(201).send({message: 'User updated successfully'});
																}
												});

                } else {
                				var sql = `INSERT INTO UserLogin VALUES ('${email}', '${password}', 1, 2)`;

								connection.query(sql, function(err, result) {
								    if (err) {
									    		//res.send(err)
										    	console.log(err);
											    res.status(500).json({error: 'Error creating new user'});
											    return;
								    } else {
									    		res.status(201).send({message: 'New user created successfully'});
								    }
							    });
                }
        });
});

module.exports = router
