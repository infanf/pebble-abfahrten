/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vector2 = require('vector2');
var ajax = require('ajax');

var main = new UI.Card({
  title: 'Abfahrten',
  icon: 'images/mvv.png',
  body: 'Deine Position wird gesucht...',
  subtitleColor: 'indigo', // Named colors
  bodyColor: '#9a0036' // Hex colors
});

main.show();
function geoToMVV(lat, lon) {
  var d_lat = 48.137224-lat;
  //var d_y = parseInt(lat - 55.5871) * 110970;
  //var d_lon = 11.575492-lon;
  var d_x = parseInt((lon + 48.077) * 74903.9);
  var d_y = parseInt(d_lat * 2 * Math.PI * 6371 / 360 * 1000);
  return {
    x: d_x,
    y: 826687 + d_y
  };
}

main.on('show', function(e) {
  navigator.geolocation.getCurrentPosition(function(position) {
    main.body(position.coords.latitude + "\n" + position.coords.longitude);
    var mvv = geoToMVV(position.coords.latitude , position.coords.longitude);
    main.body(mvv.x + "\n" + mvv.y);
    var tmp_x = 4451672;
    var tmp_y = 827469;
    ajax({
      url: "http://beta.mvv-muenchen.de/ng/XSLT_COORD_REQUEST?&coord="+tmp_x+"%3A"+tmp_y+"%3AMVTT&inclFilter=1&language=en&outputFormat=json&type_1=GIS_POINT&radius_1=1057&inclDrawClasses_1=101%3A102%3A103&type_2=STOP&radius_2=1057",
      type: 'json' 
    }, function(data) {
      main.body(data.pins[0].desc)
    });
  });
});

main.on('click', 'up', function(e) {
  var menu = new UI.Menu({
    sections: [{
      items: [{
        title: 'Pebble.js',
        icon: 'images/menu_icon.png',
        subtitle: 'Can do Menus'
      }, {
        title: 'Second Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Third Item',
      }, {
        title: 'Fourth Item',
      }]
    }]
  });
  menu.on('select', function(e) {
    console.log('Selected item #' + e.itemIndex + ' of section #' + e.sectionIndex);
    console.log('The item is titled "' + e.item.title + '"');
  });
  menu.show();
});

main.on('click', 'select', function(e) {
  var wind = new UI.Window({
    backgroundColor: 'black'
  });
  var radial = new UI.Radial({
    size: new Vector2(140, 140),
    angle: 0,
    angle2: 300,
    radius: 20,
    backgroundColor: 'cyan',
    borderColor: 'celeste',
    borderWidth: 1,
  });
  var textfield = new UI.Text({
    size: new Vector2(140, 60),
    font: 'gothic-24-bold',
    text: 'Dynamic\nWindow',
    textAlign: 'center'
  });
  var windSize = wind.size();
  // Center the radial in the window
  var radialPos = radial.position()
      .addSelf(windSize)
      .subSelf(radial.size())
      .multiplyScalar(0.5);
  radial.position(radialPos);
  // Center the textfield in the window
  var textfieldPos = textfield.position()
      .addSelf(windSize)
      .subSelf(textfield.size())
      .multiplyScalar(0.5);
  textfield.position(textfieldPos);
  wind.add(radial);
  wind.add(textfield);
  wind.show();
});

main.on('click', 'down', function(e) {
  var card = new UI.Card();
  card.title('A Card');
  card.subtitle('Is a Window');
  card.body('The simplest window type in Pebble.js.');
  card.show();
});
