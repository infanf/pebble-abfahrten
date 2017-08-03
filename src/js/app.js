/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

if (navigator.language.match(/^de/)) {
  var lang = "DE";
} else {
  var lang = "EN";
}
var isDe = lang == "DE";

// String which is shown in front of the name of a favorite station
var FAV_SYMBOL = "* ";

function utf8_decode (strData) { // eslint-disable-line camelcase
  //  discuss at: http://locutus.io/php/utf8_decode/
  // original by: Webtoolkit.info (http://www.webtoolkit.info/)
  //    input by: Aman Gupta
  //    input by: Brett Zamir (http://brett-zamir.me)
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // improved by: Norman "zEh" Fuchs
  // bugfixed by: hitwork
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  // bugfixed by: Kevin van Zonneveld (http://kvz.io)
  // bugfixed by: kirilloid
  // bugfixed by: w35l3y (http://www.wesley.eti.br)
  //   example 1: utf8_decode('Kevin van Zonneveld')
  //   returns 1: 'Kevin van Zonneveld'

  var tmpArr = [];
  var i = 0;
  var c1 = 0;
  var seqlen = 0;

  strData += '';

  while (i < strData.length) {
    c1 = strData.charCodeAt(i) & 0xFF;
    seqlen = 0;

    // http://en.wikipedia.org/wiki/UTF-8#Codepage_layout
    if (c1 <= 0xBF) {
      c1 = (c1 & 0x7F);
      seqlen = 1;
    } else if (c1 <= 0xDF) {
      c1 = (c1 & 0x1F);
      seqlen = 2;
    } else if (c1 <= 0xEF) {
      c1 = (c1 & 0x0F);
      seqlen = 3;
    } else {
      c1 = (c1 & 0x07);
      seqlen = 4;
    }

    for (var ai = 1; ai < seqlen; ++ai) {
      c1 = ((c1 << 0x06) | (strData.charCodeAt(ai + i) & 0x3F));
    }

    if (seqlen === 4) {
      c1 -= 0x10000;
      tmpArr.push(String.fromCharCode(0xD800 | ((c1 >> 10) & 0x3FF)));
      tmpArr.push(String.fromCharCode(0xDC00 | (c1 & 0x3FF)));
    } else {
      tmpArr.push(String.fromCharCode(c1));
    }

    i += seqlen;
  }

  return tmpArr.join('');
}

var Platform = require('platform');
var UI = require('ui');
var ajax = require('ajax');
// Used for saving stations as favorites
var Settings = require('settings');

/*function geoToMVV(lat, lon) {
  var d_lat = 48.139398-lat; //Relative Abweichung von der Mariensäule
  var m_per_lon = Math.cos(lat/180*Math.PI) * 2 * Math.PI * 6371 / 360 * 1000;
  //var m_per_lon = Math.cos(48.139398/180*Math.PI) * 2 * Math.PI * 6371 / 360 * 1000;
  var d_lon = 11.578584-lon; //Relative Abweichung von der Mariensäule
  //var d_y = parseInt(lat - 55.5871) * 110970;
  //var d_lon = 11.578584-lon;
  //relativ zum Nationaltheater: "4468748.00000,826433.00000" 48.139398, 11.578584
  //var d_x = parseInt((lon + 48.1732333333333) * 74789.366666667);
  var d_x = parseInt(d_lon * m_per_lon);
  var d_y = parseInt(d_lat * 2 * Math.PI * 6371 / 360 * 1000);
  return {
    x: 4468748 - d_x,
    y: 826433 + d_y
  };
}*/

function geoToMVV(lat, lon, callback) {
  // Uncomment these two lines for testing only
  //lat = 48.139398;
  //lon = 11.578584;
  ajax({
    url: "http://m.mvv-muenchen.de/jqm/mvv_lite/XSLT_STOPFINDER_REQUEST?language=de&stateless=1&type_sf=coord&name_sf="+lon+"%3A"+ lat +"%3AWGS84[DD.ddddd]%3AAktuelle+Position&convertCoord2LocationServer=1&_=1465820721498",
    type: 'json' 
  }, function(data) {
    var coordinations = [0,0];
    if(data.stopFinder) {
      coordinations = data.stopFinder.point.ref.coords.split(',');
    }
    var mvv = {
      x : coordinations[0],
      y : coordinations[1]
    };
    callback (mvv);
  });
}

function getFavs() {
  // get saved favorites
  var favs = Settings.option("favorites");
  // if there are saved favorites, parse them into an array
  // otherwise return an empty array
  return favs ? JSON.parse(favs) : [];
}

function setFavs(favs) {
  // save new favorites
  Settings.option("favorites", JSON.stringify(favs));
}

function saveAsFav(stopID, stopName) {
  // add a stop to favorites
  var favs = getFavs();
  favs.push([stopID, stopName]);
  setFavs(favs);
}

function removeFromFavs(stopID) {
  // remove a stop from favorites
  var favs = getFavs();
  for (var i = 0; i < favs.length; i++) {
    if (favs[i][0] == stopID) {
      // when the stop with the correct ID is found, remove it
      favs.splice(i, 1);
      // and save the modified list of favorite stops
      setFavs(favs);
      return;
    }
  }
}

function isFav(stopID) {
  // returns true iff a stop with the given ID is saved as a favorite
  var favs = getFavs();
  for (var i = 0; i < favs.length; i++) {
    if (favs[i][0] == stopID) {
      return true;
    }
  }
  return false;
}

function formatTitleWithStar(stopID, stopName) {
  // if the given stop is a favorite, return its name asterisked (i.e. with a star: * )
  // otherwise remove the asterisk from the name
  if (isFav(stopID)) {
    if (stopName.lastIndexOf(FAV_SYMBOL, 0) === 0) {
      return stopName;
    } else {
      return FAV_SYMBOL + stopName;
    }
  } else {
    if (stopName.lastIndexOf(FAV_SYMBOL, 0) === 0) {
      return stopName.substring(FAV_SYMBOL.length, stopName.length);
    } else {
      return stopName;
    }
  }
}

function getFavItems() {
  // return an array of favorite stops
  // each element of the array has a title and a stationID
  var favs = getFavs();
  var items = [];
  for (var i = 0; i < favs.length; i++) {
    var item = {title: favs[i][1],
                stationId: favs[i][0]};
    items.push(item);
  }
  return items;
}


var updater = 0;
var currentStation = 0;


var mainMenu = new UI.Menu({
  sections: [{
    title: isDe?"Haltestellen":"Saved stops",
    items: []
  }, {
    title: isDe?"In der Nähe":"Nearby stops",
    items: []
  }]
});

var departures = new UI.Menu({
  sections: []
});


var start = function() {
  mainMenu.show();
  mainMenu.item(1, 0, {title: isDe?"Suche Position ...":"Fetching location ...",
                       stationID: "INVALID"});
  navigator.geolocation.getCurrentPosition(function(position) {
    geoToMVV(position.coords.latitude , position.coords.longitude, function(mvv){
      //console.debug(mvv.x+":"+mvv.y);
      //mvv.x = 4467303;
      //mvv.y = 826265;
      ajax({
        url: "http://efa.mvv-muenchen.de/ng/XSLT_COORD_REQUEST?&coord="+mvv.x+"%3A"+mvv.y+"%3AMVTT&inclFilter=1&language=en&outputFormat=json&type_1=GIS_POINT&radius_1=1057&inclDrawClasses_1=101%3A102%3A103&type_2=STOP&radius_2=1057",
        type: 'json' 
      }, function(data) {
        var pins = [];
        for (var i in data.pins) {
          if (data.pins[i].type == "STOP") {
            var stopID = data.pins[i].id;
            var stopTitle = formatTitleWithStar(stopID, data.pins[i].desc);
            pins.push({
              //title: utf8_decode(stopTitle),
              title: stopTitle,
              subtitle: data.pins[i].distance + " m "+(isDe?"entfernt":"away"),
              stationId: stopID
            });
          }
        }
        mainMenu.items(1, pins);
      });
    });
  });
};

var parseData = function(data) {
  var trains = data.split('<tbody>')[1];
  var trainArray = trains.split("</tr>");
  var jsonData = [];
  for (var i in trainArray) {
    var html = trainArray[i].replace(/[\s\n\r\t]+/g, " ");
    var train = {
      time: html.replace(/^.*<td class="dm_time">\s*(\S[^<]+\S)\s*<.*$/gim, "$1"),
      linie: html.replace(/^.*<span class="printable">([^<]+)<.*$/gim, "$1"),
      finalStop: html.replace(/^.*<td width="75\%">\s*(\S[^<]+\S)\s*<.*$/gim, "$1")
    };
    if (!train.time.match(/</) && !train.linie.match(/</) && !train.finalStop.match(/</)) jsonData.push(train);
  }
  return jsonData;
};

var stationdetails = function(e) {
  ajax({
    url: "http://efa.mvv-muenchen.de/xhr_departures?locationServerActive=1&stateless=1&type_dm=any&useAllStops=1&useRealtime=1&limit=100&mode=direct&zope_command=enquiry%3Adepartures&compact=1&name_dm="+e.item.stationId,
  }, function (data) {
    var body = [];
    var jsonData = parseData (data);
    for (var i in jsonData) {
      var now = new Date();
      var then = new Date(""+now.getFullYear()+"-"+(now.getMonth()+1)+"-"+now.getDate()+" "+jsonData[i].time+":00");
      if (then - now < 0) {
        continue;
      }
      var diff = Math.max(0, Math.round((then - now) / 1000 / 60) + 1440) % 1440;
      var type = "R";
      if (jsonData[i].linie.match(/^S\d/)) {
        type = "S";
      } else if(jsonData[i].linie.match(/^U\d/i)) {
        type = "U";
      } else if(jsonData[i].linie.match(/^N\d/i)) {
        type = "N";
      } else if(jsonData[i].linie.match(/^X\d/i)) {
        type = "X";
      } else if(parseInt(jsonData[i].linie) >= 40) {
        type = "B";
      } else if(parseInt(jsonData[i].linie) > 0) {
        type = "T";
      }
      body.push({
        title: jsonData[i].linie + " " + jsonData[i].finalStop,
        subtitle: jsonData[i].time + " (in " +diff+ (isDe?" Minuten)":" minutes)"),
        time: then,
        icon: "IMAGES_"+type+"_PNG"
      });
    }
    departures.section(0, {
      title: e.item.title,
      items: body
    });
    updater = setTimeout(function(){
      if(e.item.stationId == currentStation) {
        stationdetails(e);
      }
    }, 20000);
  });
};


mainMenu.on('longSelect', function(e) {
  var stationName = e.item.title;
  var stationID = e.item.stationId;
  if (stationID == "INVALID") {
    return;
  }
  if (isFav(stationID)) {
    removeFromFavs(stationID);
  } else {
    saveAsFav(stationID, stationName);
  }
  e.item.title = formatTitleWithStar(stationID, stationName);
});

mainMenu.on("select", function(e) {
  if (e.item.stationId == "INVALID") {
    return;
  }
  departures.section(0, {
    title: e.item.title,
    items: [{
      title: isDe?"Lade Abfahrtszeiten...":"Fetching data..."
    }]
  });
  stationdetails(e);
  departures.show();
});

mainMenu.on("show", function(){
  mainMenu.items(0, getFavItems());
});

departures.on("click", "back", function(){
  departures.hide();
});


start();
