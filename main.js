// main.js
// Copyright (C) 2016 Frank Hale <frankhale@gmail.com>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

const { electron, app, BrowserWindow  } = require('electron');

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    title: "Simple IRC Client",
    width: 900,
    height: 600,
    backgroundColor: "#fff"
  });
  mainWindow.loadURL('file://' + __dirname + '/index.html');
  //BrowserWindow.addDevToolsExtension("./react-devtools");
  mainWindow.webContents.openDevTools();
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);
app.on('browser-window-created',function(e,window) {
    window.setMenu(null);
});
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
