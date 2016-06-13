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

var UI = require('ui');
var ajax = require('ajax');

var main = new UI.Card({
  title: isDe?'Abfahrten':"Departures",
  icon: 'images/mvv.png',
  body: isDe?'Select drücken zur Haltestellensuche.':"Press select to search nearby stops.",
  subtitleColor: 'indigo', // Named colors
  bodyColor: '#9a0036' // Hex colors
});

main.show();
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
  //lat = 48.139398;
  //lon = 11.578584;
  ajax({
    url: "http://m.mvv-muenchen.de/jqm/mvv_lite/XSLT_STOPFINDER_REQUEST?language=de&stateless=1&type_sf=coord&name_sf="+lon+"%3A"+ lat +"%3AWGS84[DD.ddddd]%3AAktuelle+Position&convertCoord2LocationServer=1&_=1465820721498",
    type: 'json' 
  }, function(data) {
    console.log(JSON.stringify(data));
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

var menu = new UI.Menu({
  sections: [{
    title: isDe?"Haltestellen":"nearby stops",
    items: []
  }]
});

var departures = new UI.Menu({
  sections: []
});

var start = function() {
  main.body(isDe?"Deine Position wird gesucht...":"Finding your current location...");
  navigator.geolocation.getCurrentPosition(function(position) {
    geoToMVV(position.coords.latitude , position.coords.longitude, function(mvv){
      //console.debug(mvv.x+":"+mvv.y);
      //mvv.x = 4467303;
      //mvv.y = 826265;
      ajax({
        url: "http://beta.mvv-muenchen.de/ng/XSLT_COORD_REQUEST?&coord="+mvv.x+"%3A"+mvv.y+"%3AMVTT&inclFilter=1&language=en&outputFormat=json&type_1=GIS_POINT&radius_1=1057&inclDrawClasses_1=101%3A102%3A103&type_2=STOP&radius_2=1057",
        type: 'json' 
      }, function(data) {
        menu.show();
        var pins = [];
        for (var i in data.pins) {
          if (data.pins[i].type == "STOP") {
            pins.push({
              //title: utf8_decode(data.pins[i].desc),
              title: data.pins[i].desc,
              subtitle: data.pins[i].distance + "m "+(isDe?"entfernt":"away"),
              stationId: data.pins[i].id
            });
          }
        }
        menu.items(0, pins);
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

menu.on('select', function(e) {
  ajax({
    url: "http://beta.mvv-muenchen.de/xhr_departures?locationServerActive=1&stateless=1&type_dm=any&useAllStops=1&useRealtime=1&limit=100&mode=direct&zope_command=enquiry%3Adepartures&compact=1&name_dm="+e.item.stationId,
  }, function (data) {
    var body = [];
    var jsonData = parseData (data);
    for (var i in jsonData) {
      var now = new Date();
      var then = new Date(""+now.getFullYear()+"-"+now.getMonth()+"-"+now.getDate()+" "+jsonData[i].time+":00");
      var diff = ((Math.floor((then - now) / 1000 / 60) + 24*60) % (24*60) + 24*60) % 1440;
      body.push({
        title: jsonData[i].linie + " " + jsonData[i].finalStop,
        subtitle: jsonData[i].time + " (in " +diff+ (isDe?" Minuten)":" minutes)"),
        time: then
      });
    }
    departures.section(0, {
      title: e.item.title,
      items: body
    });
    departures.show();
  });
});

main.on("click", "select", start);
main.on("show", function(){
  main.body(isDe?'Select drücken zur Haltestellensuche.':"Press select to search nearby stops.");
});

departures.on("click", "back", function(){
  menu.show();
});

menu.on("click", "back", function(){
  main.show();
});

start();