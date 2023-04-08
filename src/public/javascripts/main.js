var express = require('express')
var bodyParser = require('body-parser');
var mysql = require('mysql2');
var path = require('path');
var connection = mysql.createConnection({
                host: '35.209.102.248',
                user: 'root',
                password: 'test123',
                database: 'db'
});

connection.connect;

var app = express();


