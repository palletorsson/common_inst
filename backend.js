var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('data.sqlite');

var restify = require('restify');

// initiate server libs and variables
var express = require("express")
  , host = '127.0.0.1'
  , port = '1337'
  , app = express(); 

// initiate filesystem libs
var filesystem = require('fs');

var config = JSON.parse(filesystem.readFileSync("current_map.json"));
var current_map = config.map;

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


var server = restify.createServer();
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.jsonp());
server.use(restify.gzipResponse());


// insert or update item
server.get('/game_api_input', function (req, res, next) {
	console.log('add: '+req.params.add); 
    var add = req.params.add; 
	var id = req.params.id;
	if (add == 'true') {
		var map = req.params.map; 
		var type = req.params.type;
		var name = req.params.name;
		var x = req.params.x;
		var y = req.params.y; 
		var zindex = req.params.zindex;  
		insert_or_update_db(id, map, type, name, x, y, zindex); 
	} else {
		remove_text(id); 
	}	
	return next();
});

// set the name if the current map in a text json file
server.get('/set_map', function (req, res, next) {
	var map = req.params.map;  
	var json = '{"map": "'+map+'"}'; 
	filesystem.writeFile('current_map.json','', function (err) {
		filesystem.writeFile('current_map.json',json, function (err) {
		}); 
	}); 
	return next();
});

// remove by id
server.get('/game_api_remove', function (req, res, next) {
	var id = req.params.id;  
	remove_text(id); 
	return next();
});


// get the all the maps 
server.get('/games', function (req, res, next) {
	get_maps(function(result) { 		
		res.send(result); 
		next();
	});
});

// get current map 
server.get('/map', function (req, res, next) {
	var map = req.params.map;  
	get_map(map, function(result) { 		
		res.send(result); 
		next();
	});

});

// get maps function 
function get_maps(callback){   
 	var values = []
	db.all("SELECT rowid AS id, map_name, background, is_current, title, explain FROM game_maps", function(err, rows) {
		rows.forEach(function (row) {
			values.push({'id': row.id, 
						'mapname': row.map_name, 
						'is_current': row.is_current, 
						'background': row.background, 
						'title': row.title, 
						'explain': row.explain
						});
			});
		callback(values) 
	  });
} 

// get map function 
function get_map(map, callback){   
 	var values = []
	db.get("SELECT rowid AS id, map_name, background, is_current, title, explain  FROM game_maps WHERE map_name = ?", map, function(err, rows) {
			values.push({
						'mapname': rows.map_name, 
						'is_current': rows.is_current, 
						'background': rows.background, 
						'title': rows.title, 
						'explain': rows.explain
						});
		
		callback(values) 
	  });
} 

// get item by map
server.get('/game_api', function (req, res, next) {
	// http://0.0.0.0:8089/game_api?map=map1
    var map = req.query.map; 
	selection(map, function(result) { 		
		res.send(result); 
		next();
	});

});

// get item by map function 
function selection(map, callback){   
  var values = []
  db.all("SELECT rowid AS id, type, name, x, y, zindex, spec FROM game_items WHERE map_name = ?", map, function(err, rows) {	
	rows.forEach(function (row) {
		values.push({'id': row.id, 
					'type': row.type, 
					'name': row.name, 
		  			'x': row.x, 
					'y': row.y, 
					'zindex': row.zindex, 
					'spec': row.spec
					});

		});
	callback(values) 
  });
}

server.listen(8089, function() {
  	console.log('%s listening at %s', server.name, server.url);
});

db.serialize(function() {
  	db.run("CREATE TABLE IF NOT EXISTS game_items (map_name TEXT, type TEXT, name TEXT, x INT, y INT, zindex INT, spec TEXT)"); 
});

db.serialize(function() {
  	db.run("CREATE TABLE IF NOT EXISTS game_maps (map_name TEXT, is_current INT, background TEXT)"); 
});

// insert or update function 
function insert_or_update_db(id, map, type, name, x, y, zindex, spec) {
	var id_ = id;
	db.serialize(function() {
	  	db.get("SELECT rowid AS id FROM game_items WHERE rowid = ?", id_ , function(err, rows) {
			console.log(rows); 
	  		if (rows == undefined) {
				var stmt = db.prepare("INSERT INTO game_items VALUES (?,?,?,?,?,?,?)");
  				stmt.run(map, type, name, x, y, zindex, spec);
	 	 	} else {
	  			var stmt = db.prepare("UPDATE game_items SET map_name = ?, type = ?, name = ?, x = ?, y = ?, zindex = ? WHERE rowid = ?");
				stmt.run(map, type, name, x, y, zindex, id_);			
	  		}
	  		stmt.finalize();
			rows = 'undefined'
		});
	});
}

// remove text by id function
function remove_text(id) {
	db.serialize(function() {
	  		db.run("DELETE FROM game_items WHERE rowid = ?", id); 		
	});
}
