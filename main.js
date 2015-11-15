var app = require('app'),
    path = require('path'),    
    BrowserWindow = require('browser-window'),
    mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    title: "Simple IRC Client",
  	width: 900,
  	height: 600
  });
  mainWindow.loadUrl("file://" + __dirname + "/index.html");
  //mainWindow.openDevTools();
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
