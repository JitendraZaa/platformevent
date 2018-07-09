var express = require('express'),
    http = require('http'), 
    request = require('request'),
    bodyParser = require('body-parser'),
    app = express(),
    pg = require('pg');

	
var https = require('https');
var fs = require('fs'); 
var logFmt = require("logfmt"); 
var jsforce = require('jsforce'); 
 
app.use(express.static(__dirname + '/client'));  
app.use(bodyParser.json());   
app.set('port', process.env.PORT || 8080);

const { Pool, Client } = require('pg') ; 
//Replace below credentials otherwise it will not work
const pool = new Pool({
  user: 'wvvgewewexgeoriumxg',
  host: 'ec2-107-22-168-232.compute-1.amazonaws.com',
  database: 'd5siauekbewh9qlu',
  password: 'c4e8612ae286a211asdsds8c94976df0811e9b6fcdacb3ef3e468401e0619b38a1004',
  port: 5432,
  ssl:true
}) ;

pool.query(`CREATE TABLE IF NOT EXISTS platformEvents (
  id              SERIAL PRIMARY KEY,
  replayId           VARCHAR(100) NOT NULL,
  payload  Text NULL,
  createdDate Timestamp default NOW()
);`, (err, res) => {
  console.log(err, res) ;
 // pool.end()
}) ; 

var oauth2 = new jsforce.OAuth2({
  loginUrl : 'https://login.salesforce.com', 
  clientId: '3MVG9iTxZANhwHQuSJa6AuCgprwyLBe_FcBg8FnmJV6bACvlOItdKQp5s7dzQBDRb.zgswMjUnWD6SHzfp93A',
  clientSecret: '1958599006192243495', 
  redirectUri : 'http://localhost:8080/auth_sfdc_callback'
}); 

  app.get('/auth_sfdc', function(req, res) {
    if(req.query.isProd == "false"){
      oauth2 = new jsforce.OAuth2({
        loginUrl : 'https://test.salesforce.com', 
        clientId: '3MVG9iTxZANhwHQuSJa6AuCgprwyLBe_FcBg8FnmJV6bACvlOItdKQp5s7dzQBDRb.zgswMjUnWD6SHzfp93A',
        clientSecret: '1958599006192243495', 
        redirectUri : 'http://localhost:8080/auth_sfdc_callback'
      }); 
    }
    res.redirect(oauth2.getAuthorizationUrl({ scope : 'api id web' }));
  });

  app.get('/readEvents', function(req, response) {
    var lastId = req.query.lastId ; 

    response.writeHead(200, {"Content-Type": "application/json"});  
    pool.connect((err, client, done) => {
      var sqlTxt = 'SELECT * FROM platformEvents order by id desc limit 1';
      if(lastId){
        sqlTxt = 'SELECT * FROM platformEvents where id > '+lastId;
      } 

      if (err) throw err 
      client.query(sqlTxt,   (err, result) => {
        done() ;
        if (err) {
          console.log(err.stack);
        } else { 
          if(result.rows){
            response.write(JSON.stringify(result.rows));
          } 
          response.end();
        }
      })
    }) 

  });

  app.get('/auth_sfdc_callback', function(req, res) {
    var conn = new jsforce.Connection({ oauth2 : oauth2 });
    var code = req.param('code');
    conn.authorize(code, function(err, userInfo) {
      if (err) { return console.error(err); }  
       
      conn.streaming.topic("/event/LeadInfo__e").subscribe(function(message) {
        console.dir(message); 
        var event_values = [message.event.replayId, message.payload] ;

        pool.query('INSERT INTO platformEvents(replayId ,  payload ) VALUES($1, $2)', 
                    event_values, 
                    (err, res) => {
                      console.log(err, res) ;
                      // pool.end()
          }) ; 

        //res.write(JSON.stringify(message));
      });
      res.redirect('Main.html');
    });
  });
 
app.get('/' ,  function(req,res) {  
    res.sendfile('views/index.html');
} ); 

app.get('/index*' ,  function(req,res) {
    res.sendfile('views/index.html');
} );  
  

app.get('/Main*' ,   function(req,res) {
    res.sendfile('views/Main.html');
} );
 

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

	var options = {
      key: fs.readFileSync('./key.pem', 'utf8'),
      cert: fs.readFileSync('./server.crt', 'utf8')
   };
   
	https.createServer(options, app).listen(8081);
	console.log("Server listening for HTTPS connections on port ", 8081);