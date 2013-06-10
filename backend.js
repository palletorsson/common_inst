var sqlite3 = require('sqlite3').verbose();
var restify = require('restify');
var db = new sqlite3.Database('data.sqlite');
// initiate server libs and variables
var express = require("express")
  , host = '127.0.0.1'
  , port = '1337'
  , app = express(); 

// initiate  filesystem libs
var filesystem = require('fs');

// ---- server logic ----- 

app.listen(port, host); // "host": "127.0.0.1", "port": 1338 in config

var http = require('http')
  , server = http.createServer(app);

server.listen(1339); // using another port then for the app that is already in use, there migth be a better way to do this 
console.log('open http://127.0.0.1:1339/')

app.configure(function(){
	app.use('/static', express.static(__dirname + '/static'));
});

app.get("/", function(request, response){
	var content = filesystem.readFileSync("static/index.html");
	response.setHeader("Content-Type", "text/html");
	response.send(content);			
});

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
}

var server = restify.createServer();
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.jsonp());
server.use(restify.gzipResponse());
server.use(restify.bodyParser());server.use(restify.throttle({
  burst: 100,
  rate: 50,
  ip: true, // throttle based on source ip address
  overrides: {
    '127.0.0.1': {
      rate: 0, // unlimited
      burst: 0
    }
  }
}));server.use(restify.throttle({
  burst: 100,
  rate: 50,
  ip: true, // throttle based on source ip address
  overrides: {
    '127.0.0.1': {
      rate: 0, // unlimited
      burst: 0
    }
  }
}));

server.get('/game_api_input', function (req, res, next) {
	console.log(req.params)
	var id = req.params.id;
    var map = req.params.map; 
	var type = req.params.type;
	var name = req.params.name;
	var x = req.params.x;
	var y = req.params.y; 
	var zindex = req.params.zindex; 
	console.log(map, id, type, name, x, y, zindex); 
	insert_or_update_db(id, map, type, name, x, y, zindex); 
	return next();
});



server.get('/game_api', function (req, res, next) {
	// http://0.0.0.0:8089/game_api?map=map1
    var map = req.query.map; 
	selection(map, function(result) { 		
		res.send(result); 
		next();
	});

});

server.get('/hello', function (req, res, next) {
   
   res.send("hello"); 
   next();
});

server.head('/hello/:name', respond);

server.listen(8089, function() {
  console.log('%s listening at %s', server.name, server.url);
});

db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS game_items (map_name TEXT, type TEXT, name TEXT, x INT, y INT, zindex INT)"); 
});

function insert_or_update_db(id, map, type, name, x, y, zindex) {
	var id_ = id;
	db.serialize(function() {
	  	db.get("SELECT rowid AS id FROM game_items WHERE rowid = ?", id_ , function(err, rows) {
			console.log(rows); 
	  		if (rows == undefined) {
				var stmt = db.prepare("INSERT INTO game_items VALUES (?,?,?,?,?,?)");
  				stmt.run(map, type, name, x, y, zindex);
	 	 	} else {
	  			var stmt = db.prepare("UPDATE game_items SET map_name = ?, type = ?, name = ?, x = ?, y = ?, zindex = ? WHERE rowid = ?");
				stmt.run(map, type, name, x, y, zindex, id_);			
	  		}
	  		stmt.finalize();
			rows = 'undefined'
		});
	});
}

function selection(map, callback){   
  var values = []
  db.all("SELECT rowid AS id, type, name, x, y, zindex FROM game_items", function(err, rows) {
	
	rows.forEach(function (row) {
		values.push({'id': row.id, 
					'type': row.type, 
					'name': row.name, 
		  			'x': row.x, 
					'y': row.y, 
					'zindex': row.zindex
					});
		});
	callback(values) 
  });
 
}
