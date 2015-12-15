//configuration object
var config = {
  title: "La Nina Consortium 4W",
  description: "Who is doing What, Where, and When in response to La Nina",
  data: "data/data.json",
  whoFieldName: "agency",
  whatFieldName: "project_title",
  whereFieldName: "county",
  startFieldName: "start_date",
  endFieldName: "end_date",
  geo: "data/geography.geojson",
  joinAttribute: "COUNTY_NAM",
  nameAttribute: "COUNTY_NAM",
  color: "#fdbe85",
  enable4w: true
};

// globals
window.value = null;
window.paused = false;
window.done = true;
window.$element = $('.slider');
window.baseDate = new Date('1/1/1970')
window.firstPlay = true

//function to generate the 3W/4w component
//data is the json file
//geom is geojson file
function generateComponent(config, data, geom) {
  var lookup, margins;
  $('#title').html(config.title);
  $('#description').html(config.description);
  lookup = genLookup(geom, config);
  margins = {
    top: 0,
    left: 10,
    right: 10,
    bottom: 35
  };


  var whoChart = dc.rowChart('#hdx-3W-who')
    , whatChart = dc.rowChart('#hdx-3W-what')
    , whereChart = dc.leafletChoroplethChart('#hdx-3W-where')
    , cf = crossfilter(data);

  var whoDimension = cf.dimension(function(d){
      return d[config.whoFieldName];
    });

  var whatDimension = cf.dimension(function(d){
      return d[config.whatFieldName];
    });

  var whereDimension = cf.dimension(function(d){
      return d[config.whereFieldName].toLowerCase();
    });

  window.startDimension = cf.dimension(function(d){
    return new Date(d[config.startFieldName]);
  });

  window.endDimension = cf.dimension(function(d){
    return new Date(d[config.endFieldName]);
  });

  var whoGroup = whoDimension.group()
    , whatGroup = whatDimension.group()
    , whereGroup = whereDimension.group()
    , all = cf.groupAll()

  window.firstDate = new Date(window.startDimension.bottom(1)[0][config.startFieldName])
  window.lastDate = new Date(window.endDimension.top(1)[0][config.endFieldName])

  whoChart.width($('#hxd-3W-who').width()).height(400)
    .dimension(whoDimension)
    .group(whoGroup)
    .elasticX(true)
    .margins(margins)
    .data(function(group) {return group.top(15)})
    .labelOffsetY(13)
    .colors([config.color])
    .colorAccessor(function(d, i){return 0;})
    .xAxis().ticks(5);

  whatChart.width($('#hxd-3W-what').width()).height(400)
    .dimension(whatDimension)
    .group(whatGroup)
    .elasticX(true)
    .margins(margins)
    .data(function(group) {return group.top(15)})
    .labelOffsetY(13)
    .colors([config.color])
    .colorAccessor(function(d, i){return 0;})
    .xAxis().ticks(5);

  dc.dataCount('#count-info')
    .dimension(cf)
    .group(all);

  whereChart.width($('#hxd-3W-where').width()).height(360)
    .dimension(whereDimension)
    .group(whereGroup)
    .center([0,0])
    .zoom(0)
    .geojson(geom)
    .colors(['#CCCCCC', config.color])
    .colorDomain([0, 1])
    .colorAccessor(function (d) {
      if(d > 0){
        return 1;
      } else {
        return 0;
      }
    })
    .featureKeyAccessor(function(feature){
      return feature.properties[config.joinAttribute].toLowerCase();
    }).popup(function(d){
      return lookup[d.key];
    })
    .renderPopup(true);

  dc.renderAll();

  var map = whereChart.map();

  zoomToGeom(geom);

  var g = d3.selectAll('#hdx-3W-who').select('svg').append('g');

  g.append('text')
    .attr('class', 'x-axis-label')
    .attr('text-anchor', 'middle')
    .attr('x', $('#hdx-3W-who').width()/2)
    .attr('y', 400)
    .text('Activities');

  var g = d3.selectAll('#hdx-3W-what').select('svg').append('g');

  g.append('text')
    .attr('class', 'x-axis-label')
    .attr('text-anchor', 'middle')
    .attr('x', $('#hdx-3W-what').width()/2)
    .attr('y', 400)
    .text('Activities');

  function zoomToGeom(geom){
    var bounds = d3.geo.bounds(geom);
    map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
  }

  function genLookup(geojson, config){
    var lookup = {};
    geojson.features.forEach(function(e){
      join = e.properties[config.joinAttribute].toLowerCase()
      name = String(e.properties[config.nameAttribute])
      lookup[join] = name;
    });
    return lookup;
  }
}

function updateCharts(value) {
  dc.filterAll();
  var m = moment(window.baseDate).add('days', value);
  window.endDimension.filterRange([m.toDate(), Infinity]);
  window.startDimension.filterRange([window.baseDate, (m.add('d', 1)).toDate()]);
  dc.redrawAll();
};

function updateValue(e, value) {
  var m = moment(window.baseDate).add('days', value);
  e.textContent = m.format("l");
  window.value = value
};

function initSlider() {
  var $value, count, now, start;
  now = moment(new Date());
  start = now.diff(window.baseDate, 'days');
  count = $('.slider').length;
  $value = $('#value')[0];
  window.min = moment(window.firstDate).diff(window.baseDate, 'days')
  window.max = moment(window.lastDate).diff(window.baseDate, 'days')
  window.$element[0].setAttribute('min', window.min);
  window.$element[0].setAttribute('max', window.max);
  window.$element[0].setAttribute('value', start);
  window.$element.rangeslider({
    polyfill: false,
    onInit: function() {
      updateValue($value, this.value);
      updateCharts(this.value);
    },
    onSlide: function(pos, value) {
      if (this.grabPos) {
        updateValue($value, value);
      }
    },
    onSlideEnd: function(pos, value) {updateCharts(value)}
  });
}

function play(value) {
  var step = 30
    , delay = 2000
  if ((value <= window.max) && !window.paused) {
    window.$element.val(value).change();
    updateCharts(value);
    return setTimeout((function() {
      play(value + step);
    }), delay);
  } else if ((value - step <= window.max) && !window.paused) {
    window.$element.val(window.max).change();
    updateCharts(window.max);
    return setTimeout((function() {
      play(value + step);
    }), delay);
  } else if (window.paused) {
    window.paused = false;
  } else if (value > window.max) {
    reset()
  }
};

function pause() {
  window.paused = true;
};

function reset() {
  window.$element.val(window.min).change();
  updateCharts(window.min);
  $('.play').removeClass('hide')
  $('.pause').addClass('hide')
};

//load 4W data
var dataCall = $.ajax({
  type: 'GET',
  url: config.data,
  dataType: 'json',
});

//load geometry
var geomCall = $.ajax({
  type: 'GET',
  url: config.geo,
  dataType: 'json',
});

//when both ready construct 4W
$.when(dataCall, geomCall).then(function(dataArgs, geomArgs){
  var geom = geomArgs[0];
  var data = dataArgs[0].result.records

  geom.features.forEach(function(e){
    join = String(e.properties[config.joinAttribute])
    e.properties[config.joinAttribute] = join;
  });

  generateComponent(config, data, geom);

  if (config.enable4w) {
    initSlider();
    $('.4w').removeClass('hide')
  };
});

$('.play').on('click', function(){
  play(window.firstPlay ? window.min : window.value);
  $('.play').addClass('hide')
  $('.pause').removeClass('hide')
  window.firstPlay = false
})

$('.pause').on('click', function(){
  pause()
  $('.play').removeClass('hide')
  $('.pause').addClass('hide')
})

$('#reset').on('click', function(){
  if (config.enable4w) {
    reset()
  };
})
