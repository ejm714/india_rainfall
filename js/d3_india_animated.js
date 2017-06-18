
var width = 1000,
    height = 600;

var svg = d3.select('#vis').append('svg')
    .attr('width', width)
    .attr('height', height);

var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

var parseDate = d3.time.format("%Y-%m-%d").parse;
var formatDate = d3.time.format("%Y-%m-01");

//how to shrink this to fit
var projection = d3.geo.mercator()
    .center([78, 27])
    .scale(1000);

var path = d3.geo.path()
    .projection(projection);


var district = d3.map();
var data = [];
var filterValue = "2002-01-01";


var slider = chroniton()
      .domain([parseDate("1930-01-01"),parseDate("2002-12-01")])
      .labelFormat(d3.time.format('%b %Y'))
      .width(900)
      .height(50)
      .playButton(true) // can also be set to loop
      .on("change", function(d) {
          //filterValue = formatDate(parseDate(d));
          filterValue = formatDate(d);
          //console.log("filterValue", filterValue);
          redraw();
      });


d3.select("#slider")
  .call(slider);


// we use queue because we have 2 data files to load.
queue()
    .defer(d3.json, "data/india_district.topojson")
    .defer(d3.csv, "data/rainfall_2.csv", typeRainfall)
    //.defer(d3.csv, "data/fertility_long_africa.csv", typeFertility) // process
    .await(loaded);

function typeRainfall(d) {
    d.rainfall = +d.rainfall;
    d.rain_dev = +d.rain_dev;
    d.date = parseDate(d.dt);
    d.district = d.district;
    d.state = d.state;
    //console.log(d);
    return d;
}

function getData(d) {
    var dataVal = null
    var dataVal = data.get(d.properties.PC_NAME);
    //console.log(dataVal)

    if (dataVal) {
        //console.log(dataVal[0].Country);
        dataVal = dataVal.filter(function (d) {
          //console.log(d.dt) // this successfully finds all the dates
            return d.dt == filterValue;
        });
    }

    if (dataVal) {
        dataVal = dataVal[0];
    }
    //console.log(dataVal) // looks like this is working
    //console.log(dataVal.rain_dev)
   return dataVal;
}

function getColor(d) {
    var dataVal = getData(d);
    if (dataVal) {

      var color_domain = [-3, -2, -1, 1, 2, 3]

      var color = d3.scale.threshold()
              .domain(color_domain)
              .range(["#b2182b", "#d6604d", "#f4a582", "#f7f7f7", "#92c5de", "#4393c3", "#2166ac"]);

        return color(dataVal.rain_dev);

    }
    // if we fall through, i.e., no match
    //console.log("no dataRow", d);
    return "#ccc";
}


function loaded(error, india, rainfall) {

    //console.log(india);
    //console.log(rainfall);

    data = d3.nest()
        .key(function(d) {
            return d.district;
        })
        .map(rainfall, d3.map);

    //console.log("map result", data.get("Adilabad"));



    var districts = topojson.feature(india, india.objects.india_pc_2014).features;
    //console.log(districts) // this works

    svg.selectAll("path.districts")
        .data(districts)
        .enter()
        .append("path")
        .attr("class", "districts")
        .attr("d", path)
        //.transition()
        //.delay(function (d, i) { return i*10})
        .attr("fill", function(d,i) {
            return getColor(d);
        })

				.on("mouseover", function(d) {
          var dataVal = getData(d);
          if (dataVal) {
          //var district = dataVal.district
          //console.log(district)
			    d3.select(this).transition().duration(300).style("opacity", 0.8);
			    div.transition().duration(300)
			    .style("opacity", 1)
          div.html("<b>" + dataVal.district + ", " + "<br>" + dataVal.state + "</b>" + "<br>" + "Deviation: " + Math.round(dataVal.rain_dev*100)/100)
			    .style("left", (d3.event.pageX) + "px")
			    .style("top", (d3.event.pageY -30) + "px");
			  }})
        .on("mouseout", function() {
          d3.select(this)
          .transition().duration(300)
          .style("opacity", 1);
          div.transition().duration(300)
          .style("opacity", 0);
        })


      svg.append("path")
          .datum(topojson.mesh(india, india.objects.india_pc_2014, function(a, b) { return a === b; }))
          .attr("class", "country-boundary")
          .attr("d", path);


    var color_domain = [-3, -2, -1, 1, 2, 3]
    var ext_color_domain = [-4, -3, -2, -1, 1, 2, 3]
    var legend_labels = ["Severe drought", "Drought", "Dry", "Normal", "Wet", "Heavy rain", "Severe flooding"]

    var color = d3.scale.threshold()
            .domain(color_domain)
            .range(["#b2182b", "#d6604d", "#f4a582", "#f7f7f7", "#92c5de", "#4393c3", "#2166ac"]);


    var legend = svg.selectAll("g.legend")
      .data(ext_color_domain)
      .enter().append("g")
      .attr("class", "legend");

    var ls_w = 20;
    var ls_h = 20;

    legend.append("rect")
      .attr("x", 20)
      .attr("y", function(d, i) { return height - (i*ls_h) - 2*ls_h;})
      .attr("width", ls_w)
      .attr("height", ls_h)
      .style("fill", function(d, i) { return color(d); })
      //.style("opacity", 0.8);

    legend.append("text")
      .attr("x", 50)
      .attr("y", function(d, i){ return height - (i*ls_h) - ls_h - 4;})
      .text(function(d, i){ return legend_labels[i]; });

}

function redraw() {

    svg.selectAll("path.districts")
        .transition()
        .attrTween("fill", function(d,i, a) {
            return d3.interpolateRgb(a, getColor(d)); // the filtervalue is a global in the func.
        });

}
