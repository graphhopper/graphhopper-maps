import { select, selectAll, mouse } from 'd3-selection'
import 'd3-selection-multi'
import { scaleOrdinal, scaleLinear } from 'd3-scale'
import { min as d3Min, max as d3Max, bisector } from 'd3-array'
import { drag } from 'd3-drag'
import { axisLeft, axisBottom } from 'd3-axis'
import { format } from 'd3-format'
import { curveBasis, curveLinear, line, area as d3Area, symbol, symbolTriangle } from 'd3-shape'
import {
    schemeAccent,
    schemeDark2,
    schemeSet2,
    schemeCategory10,
    schemeSet3,
    schemePaired
} from 'd3-scale-chromatic'

const defaultOptions = {
    width: 800,
    height: 280,
    margins: {
        top: 10,
        right: 30,
        bottom: 55,
        left: 50
    },
    expand: true,
    expandControls: true,
    translation: {},
    selectedAttributeIdx: 0,
}

export class HeightGraph {
    constructor(container, options, callbacks) {
        this._container = container;
        options = Object.assign(defaultOptions, options);
        this._margin = options.margins;
        this._width = options.width;
        this._height = options.height;
        this._mappings = options.mappings;
        this._graphStyle = options.graphStyle || {}
        this._dragCache = {}
        this._xTicks = options.xTicks;
        this._yTicks = options.yTicks;
        this._translation = options.translation;
        this._currentSelection = options.selectedAttributeIdx;
        this._chooseSelectionCallback = options.chooseSelectionCallback;
        this._expand = options.expand;
        this._expandControls = options.expandControls;
        this._expandCallback = options.expandCallback;
        // todonow
        this._showMapMarker = callbacks._showMapMarker;
        this._fitMapBounds = callbacks._fitMapBounds;
        this._markSegmentsOnMap = callbacks._markSegmentsOnMap;

        this._svgWidth = this._width - this._margin.left - this._margin.right;
        this._svgHeight = this._height - this._margin.top - this._margin.bottom;
        if (this._expandControls) {
            this._button = this._createDOMElement('div', "heightgraph-toggle", this._container);
            this._createDOMElement("a", "heightgraph-toggle-icon", this._button);
            this._button.addEventListener('click', this._expandContainer);

            this._closeButton = this._createDOMElement("a", "heightgraph-close-icon", this._container)
            this._closeButton.addEventListener('click', this._expandContainer);
        }
        this._showState = false;
        this._stopPropagation();

        // Note: this._svg really contains the <g> inside the <svg>
        this._svg = select(this._container).append("svg").attr("class", "heightgraph-container")
            .attr("width", this._width)
            .attr("height", this._height).append("g")
            .attr("transform", "translate(" + this._margin.left + "," + this._margin.top + ")")
        if (this._expand) this._expandContainer();
    }

    _defaultTranslation = {
        distance: "Distance",
        elevation: "Elevation",
        segment_length: "Segment length",
        type: "Type",
        legend: "Legend"
    }

    resize = (size) => {
        if (size.width)
            this._width = size.width;
        if (size.height)
            this._height = size.height;

        // Resize the <svg> along with its container
        select(this._container).selectAll("svg")
            .attr("width", this._width)
            .attr("height", this._height);
        this._svgWidth = this._width - this._margin.left - this._margin.right;
        this._svgHeight = this._height - this._margin.top - this._margin.bottom;

        // Re-add the data to redraw the chart.
        this.addData(this._data);
    }

    /**
     * TODO: this should be refactored to avoid calling _addData on resize
     */
    addData = (data) => {
        this._markSegmentsOnMap([]);
        if (this._svg !== undefined) {
            this._svg.selectAll("*")
                .remove();
        }
        if (!data || this._currentSelection >= data.length) {
            this._currentSelection = 0;
        }
        this._resetDrag(true);

        this._data = data;
        this._prepareData();
        this._calculateElevationBounds();
        this._appendScales();
        this._appendGrid();
        if (Object.keys(data).length !== 0) {
            this._createChart(this._currentSelection);
        }
        this._createSelectionBox();
    }

    _stopPropagation = () => {
        this._container.addEventListener('click mousedown touchstart dblclick', e => {
            if (e.stopPropagation) {
                e.stopPropagation();
            } else if (e.originalEvent) {
                e.originalEvent._stopped = true;
            } else {
                e.cancelBubble = true;
            }
        });
    }

    _dragHandler = () => {
        //we don´t want map events to occur here
        if (typeof event !== 'undefined') {
            event.preventDefault();
            event.stopPropagation();
        }
        this._gotDragged = true;
        this._drawDragRectangle();
    }

    /**
     * Draws the currently dragged rectangle over the chart.
     */
    _drawDragRectangle = () => {
        // todonow: sometimes (depending on which path detail we select) the rectangle is shown *behind* the graph?!
        if (!this._dragStartCoords) {
            return;
        }
        const dragEndCoords = this._dragCurrentCoords = this._dragCache.end = mouse(this._background.node())
        const x1 = Math.min(this._dragStartCoords[0], dragEndCoords[0]),
            x2 = Math.max(this._dragStartCoords[0], dragEndCoords[0])
        if (!this._dragRectangle && !this._dragRectangleG) {
            const g = select(this._container).select("svg").select("g")
            this._dragRectangleG = g.append("g");
            this._dragRectangle = this._dragRectangleG.append("rect")
                .attr("width", x2 - x1)
                .attr("height", this._svgHeight)
                .attr("x", x1)
                .attr('class', 'mouse-drag')
                .style("fill", "grey")
                .style("opacity", 0.5)
                .style("pointer-events", "none");
        } else {
            this._dragRectangle.attr("width", x2 - x1)
                .attr("x", x1);
        }
    }

    /**
     * Removes the drag rectangle
     * @param {boolean} skipMapFitBounds - whether to zoom the map back to the total extent of the data
     */
    _resetDrag = (skipMapFitBounds) => {
        if (this._dragRectangleG) {
            this._dragRectangleG.remove();
            this._dragRectangleG = null;
            this._dragRectangle = null;

            if (skipMapFitBounds !== true) {
                // potential performance improvement:
                // we could cache the full extend when addData() is called
                let bounds = this._getBounds();
                if (bounds) this._fitMapBounds(bounds);
            }
        }
    }

    _getBounds = () => {
        return this._calculateFullExtent(this._areasFlattended);
    }

    /**
     * Handles end of drag operations. Zooms the map to the selected items extent.
     */
    _dragEndHandler = () => {
        if (!this._dragStartCoords || !this._gotDragged) {
            this._dragStartCoords = null;
            this._gotDragged = false;
            this._resetDrag(false);
            return;
        }
        const item1 = this._findItemForX(this._dragStartCoords[0]),
            item2 = this._findItemForX(this._dragCurrentCoords[0])
        this._fitSection(item1, item2);
        this._dragStartCoords = null;
        this._gotDragged = false;
    }

    _dragStartHandler = () => {
        event.preventDefault();
        event.stopPropagation();
        this._gotDragged = false;
        this._dragStartCoords = this._dragCache.start = mouse(this._background.node());
    }

    /*
     * Calculates the full extent of the data array
     */
    _calculateFullExtent = (data) => {
        if (!data || data.length < 1) {
            return null;
        }
        let minLat = data[0].latlng.lat;
        let minLng = data[0].latlng.lng;
        let maxLat = data[0].latlng.lat;
        let maxLng = data[0].latlng.lng;
        data.forEach(c => {
            minLng = Math.min(minLng, c.latlng.lng);
            minLat = Math.min(minLat, c.latlng.lat);
            maxLng = Math.max(maxLng, c.latlng.lng);
            maxLat = Math.max(maxLat, c.latlng.lat);
        });
        return {
            sw: this._createCoordinate(minLng, minLat),
            ne: this._createCoordinate(maxLng, maxLat)
        };
    }

    /**
     * Make the map fit the route section between given indexes.
     */
    _fitSection = (index1, index2) => {
        const start = Math.min(index1, index2), end = Math.max(index1, index2)
        let ext
        if (start !== end) {
            ext = this._calculateFullExtent(this._areasFlattended.slice(start, end + 1));
        } else if (this._areasFlattended.length > 0) {
            ext = [this._areasFlattended[start].latlng, this._areasFlattended[end].latlng];
        }
        if (ext) this._fitMapBounds(ext);
    }

    /**
     * Expand container when button clicked and shrink when close-Button clicked
     */
    _expandContainer = () => {
        if (this._expandControls !== true) {
            // always expand, never collapse
            this._showState = false;
        }
        if (!this._showState) {
            select(this._button)
                .style("display", "none");
            select(this._container)
                .selectAll('svg')
                .style("display", "block");
            select(this._closeButton)
                .style("display", "block");
        } else {
            select(this._button)
                .style("display", "block");
            select(this._container)
                .selectAll('svg')
                .style("display", "none");
            select(this._closeButton)
                .style("display", "none");
        }
        this._showState = !this._showState;
        if (typeof this._expandCallback === "function") {
            this._expandCallback(this._showState);
        }
    }

    /**
     * Removes the svg elements from the d3 chart
     */
    _removeChart = () => {
        if (this._svg !== undefined) {
            // remove areas
            this._svg.selectAll("path.area")
                .remove();
            // remove top border
            this._svg.selectAll("path.border-top")
                .remove();
            // remove legend
            this._svg.selectAll(".legend")
                .remove();
            // remove horizontal Line
            this._svg.selectAll(".lineSelection")
                .remove();
            this._svg.selectAll(".horizontalLine")
                .remove();
            this._svg.selectAll(".horizontalLineText")
                .remove();
        }
    }

    /**
     * Creates a random int between 0 and max
     */
    _randomNumber = (max) => Math.round((Math.random() * (max - 0)))

    _d3ColorCategorical = [
        schemeAccent,
        schemeDark2,
        schemeSet2,
        schemeCategory10,
        schemeSet3,
        schemePaired
    ]

    /**
     * Prepares the data needed for the height graph
     */
    _prepareData = () => {
        this._coordinates = [];
        this._elevations = [];
        this._cumulatedDistances = [];
        this._cumulatedDistances.push(0);
        this._categories = [];
        const data = this._data
        let colorScale
        if (this._mappings === undefined) {
            const randomNumber = this._randomNumber(this._d3ColorCategorical.length - 1)
            colorScale = scaleOrdinal(this._d3ColorCategorical[randomNumber]);
        }
        for (let y = 0; y < data.length; y++) {
            let cumDistance = 0
            this._categories[y] = {
                info: {
                    id: y,
                    text: data[y].properties.label || data[y].properties.summary
                },
                distances: [],
                attributes: [],
                geometries: [],
                legend: {}
            };
            let i, cnt = 0
            const usedColors = {}
            const isMappingFunction = this._mappings !== undefined && typeof this._mappings[data[y].properties.summary] === 'function';
            for (i = 0; i < data[y].features.length; i++) {
                // data is redundant in every element of data which is why we collect it once
                let altitude, ptA, ptB, ptDistance
                const geometry = []
                const coordsLength = data[y].features[i].geometry.coordinates.length
                // save attribute types related to blocks
                const attributeType = data[y].features[i].properties.attributeType
                // check if mappings are defined, otherwise random colors
                let text, color
                if (this._mappings === undefined) {
                    if (attributeType in usedColors) {
                        text = attributeType;
                        color = usedColors[attributeType];
                    } else {
                        text = attributeType;
                        color = colorScale(i);
                        usedColors[attributeType] = color;
                    }
                } else {
                    if (isMappingFunction) {
                        const result = this._mappings[data[y].properties.summary](attributeType);
                        text = result.text;
                        color = result.color;
                    } else {
                        text = this._mappings[data[y].properties.summary][attributeType].text;
                        color = this._mappings[data[y].properties.summary][attributeType].color;
                    }
                }
                const attribute = {
                    type: attributeType, text: text, color: color
                }
                this._categories[y].attributes.push(attribute);
                // add to legend
                if (!(attributeType in this._categories[y].legend)) {
                    this._categories[y].legend[attributeType] = attribute;
                }
                for (let j = 0; j < coordsLength; j++) {
                    ptA = this._createCoordinate(data[y].features[i].geometry.coordinates[j][0], data[y].features[i].geometry.coordinates[j][1]);
                    altitude = data[y].features[i].geometry.coordinates[j][2];
                    // add elevations, coordinates and point distances only once
                    // last point in feature is first of next which is why we have to juggle with indices
                    if (j < coordsLength - 1) {
                        ptB = this._createCoordinate(data[y].features[i].geometry.coordinates[j + 1][0], data[y].features[i].geometry.coordinates[j + 1][1]);
                        ptDistance = this._calcDistance(ptA, ptB) / 1000;
                        // calculate distances of specific block
                        cumDistance += ptDistance;
                        if (y === 0) {
                            this._elevations.push(altitude);
                            this._coordinates.push(ptA);
                            this._cumulatedDistances.push(cumDistance);
                        }
                        cnt += 1;
                    } else if (j === coordsLength - 1 && i === data[y].features.length - 1) {
                        if (y === 0) {
                            this._elevations.push(altitude);
                            this._coordinates.push(ptB);
                        }
                        cnt += 1;
                    }
                    // save the position which corresponds to the distance along the route.
                    let position
                    if (j === coordsLength - 1 && i < data[y].features.length - 1) {
                        position = this._cumulatedDistances[cnt];
                    } else {
                        position = this._cumulatedDistances[cnt - 1];
                    }
                    geometry.push({
                        altitude: altitude,
                        position: position,
                        x: ptA.lng,
                        y: ptA.lat,
                        latlng: ptA,
                        type: text,
                        areaIdx: i
                    });
                }
                this._categories[y].distances.push(cumDistance);
                this._categories[y].geometries.push(geometry);
            }
            if (y === data.length - 1) {
                this._totalDistance = cumDistance;
            }
        }
    }

    /**
     * calculates minimum and maximum values for the elevation scale drawn with d3
     */
    _calculateElevationBounds = () => {
        const max = d3Max(this._elevations)
        const min = d3Min(this._elevations)
        const range = max - min
        this._elevationBounds = {
            min: range < 10 ? min - 10 : min - 0.1 * range,
            max: range < 10 ? max + 10 : max + 0.1 * range
        }
    }

    // todonow: make 'static'? or actually move this into leaflet?
    _drawRouteMarker = (svg, layerPoint, elevation, type) => {
        this._routeMarker = select(svg).append("g").attr('id', 'route-marker')
        const labelBox = this._routeMarker.append("g")
            .attr('class', 'height-focus label')
            .style("display", "block");
        const normalizedY = layerPoint.y - 75
        this._routeMarker.append('svg:line')
            .attr('class', 'height-focus line')
            .attr("x1", layerPoint.x)
            .attr("x2", layerPoint.x)
            .attr("y1", layerPoint.y)
            .attr("y2", normalizedY)
            .style("display", "block");
        const pointG = this._routeMarker.append("g")
            .attr("class", "height-focus circle")
            .attr("transform", "translate(" + layerPoint.x + "," + layerPoint.y + ")")
            .style("display", "block");
        pointG.append("svg:circle")
            .attr("r", 5)
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("class", "height-focus circle-lower");
        labelBox.append("rect")
            .attr("x", layerPoint.x + 3)
            .attr("y", normalizedY)
            .attr("class", 'bBox');
        labelBox.append("text")
            .attr("x", layerPoint.x + 5)
            .attr("y", normalizedY + 12)
            .text(elevation + " m")
            .attr("class", "tspan mouse-height-box-text");
        labelBox.append("text")
            .attr("x", layerPoint.x + 5)
            .attr("y", normalizedY + 24)
            .text(type)
            .attr("class", "tspan mouse-height-box-text");
        const maxWidth = this._dynamicBoxSize("text.tspan")[1]
        // box size should change for profile none (no type)
        const maxHeight = (type === "") ? 12 + 6 : 2 * 12 + 6
        selectAll('.bBox')
            .attr("width", maxWidth + 10)
            .attr("height", maxHeight);
    }

    _removeRouteMarker() {
        if (this._routeMarker)
            this._routeMarker.remove();
    }

    /**
     * Creates the elevation profile
     */
    _createChart = (idx) => {
        let areas = this._categories.length === 0
            ? []
            : this._categories[idx].geometries;
        this._areasFlattended = [].concat.apply([], areas);
        for (let i = 0; i < areas.length; i++) {
            this._appendAreas(areas[i], idx, i);
        }
        this._createFocus();
        this._appendBackground();
        this._createBorderTopLine();
        this._createLegend();
        this._createHorizontalLine();
    }

    /**
     *  Creates focus Line and focus box while hovering
     */
    _createFocus = () => {
        const boxPosition = this._elevationBounds.min
        const textDistance = 15
        if (this._focus) {
            this._focus.remove();
            this._focusLineGroup.remove();
        }
        this._focus = this._svg.append("g")
            .attr("class", "focusbox");
        // background box
        this._focusRect = this._focus.append("rect")
            .attr("x", 3)
            .attr("y", -this._y(boxPosition))
            .attr("display", "none");
        // text line 1
        this._focusDistance = this._focus.append("text")
            .attr("x", 7)
            .attr("y", -this._y(boxPosition) + textDistance)
            .attr("id", "heightgraph.distance")
            .text(this._getTranslation('distance') + ':');
        // text line 2
        this._focusHeight = this._focus.append("text")
            .attr("x", 7)
            .attr("y", -this._y(boxPosition) + 2 * textDistance)
            .attr("id", "heightgraph.height")
            .text(this._getTranslation('elevation') + ':');
        // text line 3
        this._focusBlockDistance = this._focus.append("text")
            .attr("x", 7)
            .attr("y", -this._y(boxPosition) + 3 * textDistance)
            .attr("id", "heightgraph.blockdistance")
            .text(this._getTranslation('segment_length') + ':');
        // text line 4
        this._focusType = this._focus.append("text")
            .attr("x", 7)
            .attr("y", -this._y(boxPosition) + 4 * textDistance)
            .attr("id", "heightgraph.type")
            .text(this._getTranslation('type') + ':');
        this._areaTspan = this._focusBlockDistance.append('tspan')
            .attr("class", "tspan");
        this._typeTspan = this._focusType.append('tspan')
            .attr("class", "tspan");
        const height = this._dynamicBoxSize(".focusbox text")[0]
        selectAll('.focusbox rect')
            .attr("height", height * textDistance + (textDistance / 2))
            .attr("display", "block");
        this._focusLineGroup = this._svg.append("g")
            .attr("class", "focusLine");
        this._focusLine = this._focusLineGroup.append("line")
            .attr("y1", 0)
            .attr("y2", this._y(this._elevationBounds.min));
        this._distTspan = this._focusDistance.append('tspan')
            .attr("class", "tspan");
        this._altTspan = this._focusHeight.append('tspan')
            .attr("class", "tspan");
    }

    /**
     *  Creates horizontal Line for dragging
     */
    _createHorizontalLine = () => {
        this._horizontalLine = this._svg.append("line")
            .attr("class", "horizontalLine")
            .attr("x1", 0)
            .attr("x2", this._width - this._margin.left - this._margin.right)
            .attr("y1", this._y(this._elevationBounds.min))
            .attr("y2", this._y(this._elevationBounds.min))
            .style("stroke", "black");
        this._elevationValueText = this._svg.append("text")
            .attr("class", "horizontalLineText")
            .attr("x", this._width - this._margin.left - this._margin.right - 20)
            .attr("y", this._y(this._elevationBounds.min) - 10)
            .attr("fill", "black");
        //triangle symbol as controller
        const jsonTriangle = [
            {
                "x": this._width - this._margin.left - this._margin.right + 7,
                "y": this._y(this._elevationBounds.min),
                "color": "black",
                "type": symbolTriangle,
                "angle": -90,
                "size": 100
            }
        ]
        const dragstart = (element) => {
            select(element).raise().classed("active", true)
            select(".horizontalLine").raise().classed("active", true)
        }

        const dragged = (element) => {
            const maxY = this._svgHeight
            let eventY = mouse(this._container)[1] - 10
            select(element)
                .attr("transform", d => "translate(" + d.x + "," + (eventY < 0 ? 0
                    : eventY > maxY ? maxY
                        : eventY) + ") rotate(" + d.angle + ")");
            select(".horizontalLine")
                .attr("y1", (eventY < 0 ? 0 : (eventY > maxY ? maxY : eventY)))
                .attr("y2", (eventY < 0 ? 0 : (eventY > maxY ? maxY : eventY)));
            if (eventY >= maxY) {
                this._highlightedCoords = [];
            } else {
                this._highlightedCoords = this._findCoordsForY(eventY);
            }
            select(".horizontalLineText")
                .attr("y", (eventY <= 10 ? 0 : (eventY > maxY ? maxY - 10 : eventY - 10)))
                .text(format(".0f")(this._y.invert((eventY < 0 ? 0 : (eventY > maxY ? maxY : eventY)))) + " m");
            this._markSegmentsOnMap(this._highlightedCoords);
        }

        const dragend = (element) => {
            select(element)
                .classed("active", false);
            select(".horizontalLine")
                .classed("active", false);
            this._markSegmentsOnMap(this._highlightedCoords);
        }

        const horizontalDrag = this._svg.selectAll(".horizontal-symbol").data(jsonTriangle).enter().append("path").
        attr("class", "lineSelection")
            .attr("d", symbol().type(d => d.type).size(d => d.size))
            .attr("transform", d => "translate(" + d.x + "," + d.y + ") rotate(" + d.angle + ")")
            .attr("id", d => d.id)
            .style("fill", d => d.color)
            .call(drag()
                .on("start", function(d) { dragstart(this); })
                .on("drag", function(d) { dragged(this); })
                .on("end", function(d) { dragend(this); })
            )
    }

    /**
     * Defines the ranges and format of x- and y- scales and appends them
     */
    _appendScales = () => {
        const shortDist = Boolean(this._totalDistance <= 10)
        this._x = scaleLinear()
            .range([0, this._svgWidth]);
        this._y = scaleLinear()
            .range([this._svgHeight, 0]);
        this._x.domain([0, this._totalDistance]);
        this._y.domain([this._elevationBounds.min, this._elevationBounds.max]);
        this._xAxis = axisBottom()
            .scale(this._x)
        if (shortDist === true) {
            this._xAxis.tickFormat(d => format(".2f")(d) + " km");
        } else {
            this._xAxis.tickFormat(d => format(".0f")(d) + " km");
        }
        this._xAxis.ticks(this._xTicks ? Math.pow(2, this._xTicks) : Math.round(this._svgWidth / 75), "s");
        this._yAxis = axisLeft()
            .scale(this._y)
            .tickFormat(d => d + " m");
        this._yAxis.ticks(this._yTicks ? Math.pow(2, this._yTicks) : Math.round(this._svgHeight / 30), "s");
    }

    /**
     * Appends a background and adds mouse handlers
     */
    _appendBackground = () => {
        const background = this._background = select(this._container)
            .select("svg")
            .select("g")
            .append("rect")
            .attr("width", this._svgWidth)
            .attr("height", this._svgHeight)
            .style("fill", "none")
            .style("stroke", "none")
            .style("pointer-events", "all")
            .on("mousemove.focusbox", this._mousemoveHandler.bind(this))
            .on("mouseout.focusbox", this._mouseoutHandler.bind(this))
        if (this._isMobile()) {
            background.on("touchstart.drag", this._dragHandler.bind(this))
                .on("touchstart.drag", this._dragStartHandler.bind(this))
                .on("touchstart.focusbox", this._mousemoveHandler.bind(this));
            // todonow: not working on mobile??
            this._container.addEventListener('touchend', this._dragEndHandler);
        } else {
            background.on("mousemove.focusbox", this._mousemoveHandler.bind(this))
                .on("mouseout.focusbox", this._mouseoutHandler.bind(this))
                .on("mousedown.drag", this._dragStartHandler.bind(this))
                .on("mousemove.drag", this._dragHandler.bind(this));
            this._container.addEventListener('mouseup', this._dragEndHandler);
        }
    }

    /**
     * Appends a grid to the graph
     */
    _appendGrid = () => {
        this._svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + this._svgHeight + ")")
            .call(this._make_x_axis()
                .tickSize(-this._svgHeight, 0, 0)
                .ticks(Math.round(this._svgWidth / 75))
                .tickFormat(""));
        this._svg.append("g")
            .attr("class", "grid")
            .call(this._make_y_axis()
                .tickSize(-this._svgWidth, 0, 0)
                .ticks(Math.round(this._svgHeight / 30))
                .tickFormat(""));
        this._svg.append('g')
            .attr("transform", "translate(0," + this._svgHeight + ")")
            .attr('class', 'x axis')
            .call(this._xAxis);
        this._svg.append('g')
            .attr("transform", "translate(-2,0)")
            .attr('class', 'y axis')
            .call(this._yAxis);
    }

    /**
     * Appends the areas to the graph
     */
    _appendAreas = (block, idx, eleIdx) => {
        const c = this._categories[idx].attributes[eleIdx].color
        const area = this._area = d3Area().x(d => {
            const xDiagonalCoordinate = this._x(d.position)
            d.xDiagonalCoordinate = xDiagonalCoordinate
            return xDiagonalCoordinate
        }).y0(this._svgHeight).y1(d => this._y(d.altitude)).curve(curveLinear)
        this._areapath = this._svg.append("path")
            .attr("class", "area");
        this._areapath.datum(block)
            .attr("d", this._area)
            .attr("stroke", c)
            .styles(this._graphStyle)
            .style("fill", c)
            .style("pointer-events", "none");
    }

    // grid lines in x axis function
    _make_x_axis = () => {
        return axisBottom()
            .scale(this._x);
    }

    // grid lines in y axis function
    _make_y_axis = () => {
        return axisLeft()
            .scale(this._y);
    }

    /**
     * Appends a selection box for different blocks
     */
    _createSelectionBox = () => {
        const svg = select(this._container).select("svg")
        const width = this._width - this._margin.right,
            height = this._height - this._margin.bottom
        const verticalItemPosition = height + this._margin.bottom / 2 + 6
        const jsonTriangles = [
            {
                "x": width - 25,
                "y": verticalItemPosition + 3,
                "color": "#000",
                "type": symbolTriangle,
                "id": "leftArrowSelection",
                "angle": 0
            }, {
                "x": width - 10,
                "y": verticalItemPosition,
                "color": "#000",
                "type": symbolTriangle,
                "id": "rightArrowSelection",
                "angle": 180
            }
        ]
        // Use update pattern to update existing symbols in case of resize
        let selectionSign = svg.selectAll(".select-symbol").data(jsonTriangles);
        // remove any existing selection first
        selectionSign.remove();
        // select again
        selectionSign = svg.selectAll(".select-symbol").data(jsonTriangles)
        // then add only if needed
        if (this._data.length > 1) {
            selectionSign.enter().
            append("path").
            merge(selectionSign).
            attr("class", "select-symbol").
            attr("d", symbol().type(d => d.type)).
            attr("transform", d => "translate(" + d.x + "," + d.y + ") rotate(" + d.angle + ")").
            attr("id", d => d.id).style("fill", d => d.color).
            on("mousedown", d => {
                if (d.id === "rightArrowSelection") arrowRight()
                if (d.id === "leftArrowSelection") arrowLeft()
                // fake a drag event from cache values to keep selection
                this._gotDragged = true
                this._dragStartCoords = this._dragCache.start
                this._dragCurrentCoords = this._dragCache.end
            })
        }
        const chooseSelection = (id) => {
            if (this._selectionText) this._selectionText.remove();
            // after cleaning up, there is nothing left to do if there is no data
            if (this._categories.length === 0) return;
            const type = this._categories[id].info
            if (typeof this._chooseSelectionCallback === "function") {
                this._chooseSelectionCallback(id, type);
            }
            const data = [
                {
                    "selection": type.text
                }
            ]
            this._selectionText = svg.selectAll('selection_text')
                .data(data)
                .enter()
                .append('text')
                .attr("x", width - 35)
                .attr("y", verticalItemPosition + 4)
                .text(d => d.selection)
                .attr("class", "select-info")
                .attr("id", "selectionText")
                .attr("text-anchor", "end")
        }

        chooseSelection(this._currentSelection);

        let arrowRight = () => {
            let idx = this._currentSelection += 1
            if (idx === this._categories.length) {
                this._currentSelection = idx = 0
            }
            chooseSelection(idx)
            this._markSegmentsOnMap([])
            // todonow: should we keep or dismiss the rectangle selection?
            this._removeChart()
            this._createChart(idx)
        }

        let arrowLeft = () => {
            let idx = this._currentSelection -= 1
            if (idx === -1) {
                this._currentSelection = idx = this._categories.length - 1
            }
            chooseSelection(idx)
            this._markSegmentsOnMap([])
            // todonow: should we keep or dismiss the rectangle selection?
            this._removeChart()
            this._createChart(idx)
        }
    }

    /**
     * Creates and appends legend to chart
     */
    _createLegend = () => {
        const data = []
        if (this._categories.length > 0) {
            for (let item in this._categories[this._currentSelection].legend) {
                data.push(this._categories[this._currentSelection].legend[item]);
            }
        }
        const height = this._height - this._margin.bottom
        const verticalItemPosition = height + this._margin.bottom / 2
        const leg = [
            {
                "text": this._getTranslation("legend")
            }
        ]
        const legendRectSize = 7
        const legendSpacing = 7
        const legend = this._svg.selectAll(".hlegend-hover").data(data).enter().append("g").attr("class", "legend").
        style("display", "none").attr("transform", (d, i) => {
            const height = legendRectSize + legendSpacing
            const offset = height * 2
            const horizontal = legendRectSize - 15
            const vertical = i * height - offset
            return "translate(" + horizontal + "," + vertical + ")"
        })
        const legendRect = legend.append('rect')
            .attr('class', 'legend-rect')
            .attr('x', 15)
            .attr('y', 6 * 6)
            .attr('width', 6)
            .attr('height', 6);
        if (Object.keys(this._graphStyle).length !== 0) {
            legendRect.styles(this._graphStyle)
                .style('stroke', (d, i) => d.color)
                .style('fill', (d, i) => d.color);
        } else {
            legendRect.style('stroke', 'black')
                .style('fill', (d, i) => d.color);
        }
        legend.append('text')
            .attr('class', 'legend-text')
            .attr('x', 30)
            .attr('y', 6 * 7)
            .text((d, i) => {
                const textProp = d.text
                this._boxBoundY = (height - (2 * height / 3) + 7) * i;
                return textProp;
            });
        let legendHover = this._svg.selectAll('.legend-hover')
            .data(leg)
            .enter()
            .append('g')
            .attr('class', 'legend-hover');
        this._showLegend = false
        legendHover.append('text')
            .attr('x', 15)
            .attr('y', verticalItemPosition)
            .attr('text-anchor', "start")
            .text((d, i) => d.text)
            .on('mouseover', () => {
                selectAll('.legend')
                    .style("display", "block");
            })
            .on('mouseleave', () => {
                if (!this._showLegend) {
                    selectAll('.legend')
                        .style("display", "none");
                }
            })
            .on('click', () => {
                this._showLegend = !this._showLegend
            })
        ;
    }

    /**
     * calculates the margins of boxes
     * @param {String} className: name of the class
     * @return {array} borders: number of text lines, widest range of text
     */
    _dynamicBoxSize = (className) => {
        const cnt = selectAll(className).nodes().length
        const widths = []
        for (let i = 0; i < cnt; i++) {
            widths.push(selectAll(className)
                .nodes()[i].getBoundingClientRect()
                .width);
        }
        const maxWidth = d3Max(widths)
        return [cnt, maxWidth];
    }

    /**
     * Creates top border line on graph
     */
    _createBorderTopLine = () => {
        const data = this._areasFlattended
        const borderTopLine = line()
            .x(d => {
                const x = this._x
                return x(d.position)
            })
            .y(d => {
                const y = this._y
                return y(d.altitude)
            })
            .curve(curveBasis)
        this._svg.append("svg:path")
            .attr("d", borderTopLine(data))
            .attr('class', 'border-top');
    }

    /**
     * Handles the mouseout event when the mouse leaves the background
     */
    _mouseoutHandler = () => {
        this._showMapMarker(null);
    }

    /**
     * Handles the mouseover the chart and displays distance and altitude level
     */
    _mousemoveHandler = (d, i, ctx) => {
        const coords = mouse(this._svg.node())
        const item = this._areasFlattended[this._findItemForX(coords[0])];
        if (item) this._internalMousemoveHandler(item);
    }

    /**
     * Handles the mouseover, given the current item the mouse is over
     */
    _internalMousemoveHandler = (item, showMapMarker = true) => {
        let areaLength
        const alt = item.altitude, dist = item.position,
            ll = item.latlng, areaIdx = item.areaIdx, type = item.type
        const boxWidth = this._dynamicBoxSize(".focusbox text")[1] + 10
        if (areaIdx === 0) {
            areaLength = this._categories[this._currentSelection].distances[areaIdx];
        } else {
            areaLength = this._categories[this._currentSelection].distances[areaIdx] - this._categories[this._currentSelection].distances[areaIdx - 1];
        }
        if (showMapMarker) {
            this._showMapMarker(ll, alt, type);
        }
        this._distTspan.text(" " + dist.toFixed(1) + ' km');
        this._altTspan.text(" " + alt + ' m');
        this._areaTspan.text(" " + areaLength.toFixed(1) + ' km');
        this._typeTspan.text(" " + type);
        this._focusRect.attr("width", boxWidth);
        this._focusLine.style("display", "block")
            .attr('x1', this._x(dist))
            .attr('x2', this._x(dist));
        const xPositionBox = this._x(dist) - (boxWidth + 5)
        const totalWidth = this._width - this._margin.left - this._margin.right
        if (this._x(dist) + boxWidth < totalWidth) {
            this._focus.style("display", "initial")
                .attr("transform", "translate(" + this._x(dist) + "," + this._y(this._elevationBounds.min) + ")");
        }
        if (this._x(dist) + boxWidth > totalWidth) {
            this._focus.style("display", "initial")
                .attr("transform", "translate(" + xPositionBox + "," + this._y(this._elevationBounds.min) + ")");
        }
    }

    /**
     * Finds a data entry for a given x-coordinate of the diagram
     */
    _findItemForX = (x) => {
        const bisect = bisector(d => d.position).left
        const xInvert = this._x.invert(x)
        return bisect(this._areasFlattended, xInvert);
    }

    /**
     * Finds data entries above a given y-elevation value and returns geo-coordinates
     */
    _findCoordsForY = (y) => {
        let bisect = (b, yInvert) => {
            //save indexes of elevation values above the horizontal line
            const list = []
            for (let i = 0; i < b.length; i++) {
                if (b[i].altitude >= yInvert) {
                    list.push(i);
                }
            }
            //split index list into coherent blocks of coordinates
            const newList = []
            let start = 0
            for (let j = 0; j < list.length - 1; j++) {
                if (list[j + 1] !== list[j] + 1) {
                    newList.push(list.slice(start, j + 1));
                    start = j + 1;
                }
            }
            newList.push(list.slice(start, list.length));
            //get lat lon coordinates based on indexes
            for (let k = 0; k < newList.length; k++) {
                for (let l = 0; l < newList[k].length; l++) {
                    newList[k][l] = b[newList[k][l]].latlng;
                }
            }
            return newList;
        }

        const yInvert = this._y.invert(y)
        return bisect(this._areasFlattended, yInvert);
    }

    /**
     * Checks the user passed translations, if they don't exist, fallback to the default translations
     */
    _getTranslation = (key) => {
        if (this._translation[key])
            return this._translation[key];
        if (this._defaultTranslation[key])
            return this._defaultTranslation[key];
        console.error("Unexpected error when looking up the translation for " + key);
        return 'No translation found';
    }

    _createCoordinate = (lng, lat) => {
        return {lat: lat, lng: lng};
    }
    /**
     * calculates the distance between two (lat,lng) coordinates in meters
     */
    _calcDistance = (a, b) => {
        const deg2rad = Math.PI / 180;
        const sinDLat = Math.sin((b.lat - a.lat) * deg2rad / 2);
        const sinDLon = Math.sin((b.lng - a.lng) * deg2rad / 2);
        const f = sinDLat * sinDLat + Math.cos(a.lat * deg2rad) * Math.cos(b.lat * deg2rad) * sinDLon * sinDLon;
        return 6371000 * 2 * Math.atan2(Math.sqrt(f), Math.sqrt(1 - f));
    }

    _createDOMElement(tagName, className, container) {
        const el = document.createElement(tagName);
        el.className = className || '';
        if (container)
            container.appendChild(el);
        return el;
    }

    _isMobile() {
        return /Android|webOS|iPhone|iPad|Mac|Macintosh|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}