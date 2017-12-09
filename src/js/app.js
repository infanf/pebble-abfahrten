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

var Timeline = require('timeline');
var UI = require('ui');
var ajax = require('ajax');
// Used for saving stations as favorites
var Settings = require('settings');

function geoToMVV(lat, lon, callback) {
  //Uncomment these two lines for testing only
  /*lat = 48.139398;
  lon = 11.578584;*/
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

function setReminder(title, date)
{
  Timeline.createNotification({
    id: title+date.toISOString(),
    time: date.toISOString(),
    layout: {
      type: "genericPin",
      title: title,
      tinyIcon: "system://images/NOTIFICATION_FLAG"
    }
  });
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
      /*mvv.x = 4467303;
      mvv.y = 826265;*/
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
      if (jsonData[i].linie.match(/^S18/)) {
        type = "S18";
      } else if (jsonData[i].linie.match(/^S1/)) {
        type = "S1";
      } else if (jsonData[i].linie.match(/^S20/)) {
        type = "S20";
      } else if (jsonData[i].linie.match(/^S2/)) {
        type = "S2";
      } else if (jsonData[i].linie.match(/^S3/)) {
        type = "S3";
      } else if (jsonData[i].linie.match(/^S4/)) {
        type = "S4";
      } else if (jsonData[i].linie.match(/^S5/)) {
        type = "S5";
      } else if (jsonData[i].linie.match(/^S6/)) {
        type = "S6";
      } else if (jsonData[i].linie.match(/^S7/)) {
        type = "S7";
      } else if (jsonData[i].linie.match(/^S8/)) {
        type = "S8";
      } else if (jsonData[i].linie.match(/^S/)) {
        type = "S";
      } else if (jsonData[i].linie.match(/^U1/)) {
        type = "U1";
      } else if (jsonData[i].linie.match(/^U2/)) {
        type = "U2";
      } else if (jsonData[i].linie.match(/^U3/)) {
        type = "U3";
      } else if (jsonData[i].linie.match(/^U4/)) {
        type = "U4";
      } else if (jsonData[i].linie.match(/^U5/)) {
        type = "U5";
      } else if (jsonData[i].linie.match(/^U6/)) {
        type = "U6";
      } else if (jsonData[i].linie.match(/^U7/)) {
        type = "U7";
      } else if (jsonData[i].linie.match(/^U8/)) {
        type = "U8";
      } else if(jsonData[i].linie.match(/^U/i)) {
        type = "U";
      } else if(jsonData[i].linie.match(/^N/i)) {
        type = "N";
      } else if(jsonData[i].linie.match(/^X/i)) {
        type = "X";
      } else if(parseInt(jsonData[i].linie) >= 40) {
        type = "B";
      } else if(parseInt(jsonData[i].linie) > 0) {
        type = "T";
      } else if(jsonData[i].finalStop.match(/Bayrischzell|Lenggries|Tegernsee|Schliersee|Bad Tölz/)) {
        type = "BOB";
      } else if(jsonData[i].finalStop.match(/Deisenhofen|Holzkirchen|Rosenheim|Salzburg|Kufstein/)) {
        type = "MER";
//      } else if(jsonData[i].finalStop.match(/Kempten|Hof Hbf|^Prag|^Praha/i)) {
//        type = "ALX";
      }
      body.push({
        title: jsonData[i].linie.match(/^(S\d|U\d|0)/)
             ? jsonData[i].finalStop
             : jsonData[i].linie + " " + jsonData[i].finalStop,
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

/*departures.on("longSelect", function(e){
  var time = e.item.time;
  var date = new Date(time);
  setReminder("Abfahrt "+e.section.title, date);
});*/

start();
