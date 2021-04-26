const UNIT_MOVE = 0
const UNIT_NEW = 1
const UNIT_REMOVE = 2

var grid_size = 40;
var grid_container_padding = 20;

var ctx;
var canvas;
var container;
var width;
var height;

var units = {};
var changes = [];
var movingUnit = null;

var mx, my;

function removeThisScript() { document.currentScript.remove(); }

function isOdd(num) { return num % 2 != 0; }
function isEven(num) { return !isOdd(num); }

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function setupBattlemapVars() {
    ctx = document.getElementById('main').getContext('2d');
    canvas = document.getElementById('main');
    container = document.getElementById('battlemap-container');
    width = ctx.canvas.width;
    height = ctx.canvas.height;
}

function registerClickEvent() {
    document.addEventListener('mousemove', function (e) {
        mx = e.mouseX;
        my = e.mouseY;
    }, true);

    canvas.addEventListener('click',
        canvasClicked, true);
}

function drawGrid() {
    for (x = 0; x < width; x += grid_size)
        for (y = 0; y < height; y += grid_size) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
}

function canvasClicked(e) {
    if (movingUnit != null) {
        var rect = canvas.getBoundingClientRect();

        var mouseX = e.x - rect.left;
        var mouseY = e.y - rect.top;
        var mouseGridX = Math.floor(mouseX / grid_size);
        var mouseGridY = Math.floor(mouseY / grid_size);
        container.appendChild(movingUnit.html_element);
        document.getElementById('moving-preview').innerHTML = '';
        movingUnit.grid_x = mouseGridX;
        movingUnit.grid_y = mouseGridY;
        movingUnit.update();

        changes.push({
            type: UNIT_MOVE,
            id: movingUnit.id,
            x: movingUnit.grid_x,
            y: movingUnit.grid_y
        });
        sendChangesToServer();
        
        movingUnit = null;
    }
}

function getUnitsFromServer() {
    if (movingUnit != null) return; // don't get units while client is moving a unit, otherwise extreme jank occurs

    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var serverUnits = JSON.parse(this.responseText);
            console.log(serverUnits);

            for (let su of serverUnits) {
                new unit(su.id, su.name, su.size, su.x, su.y);
            }
            updateUnits();
        }
    };
    request.open('GET', '/units', true);
    request.send();
}

function sendChangesToServer() {
    if (changes.length > 0) {
        var request = new XMLHttpRequest();
        request.open('POST', '/units/change');
        request.send(JSON.stringify(changes));
        changes = [];
    }
}

function updateUnits() {
    for (let html of document.querySelectorAll('[unit]')) {
        html.remove();
    }

    for (let id in units) {
        container.appendChild(units[id].html_element);
    }
}

function getUnit(unit) {
    for (let u in units) {
        if (u == unit.id)
            return units[u];
    }
}

function unitHtmlClicked() {
    if (movingUnit == null) {
        movingUnit = getUnitWithHtmlElement(this);
        movingUnit.html_element.remove();

        var preview = document.getElementById('moving-preview');
        var previewRect = preview.getBoundingClientRect();
        preview.appendChild(movingUnit.html_element.cloneNode(true));
        preview.lastChild.style.left = previewRect.left;
        preview.lastChild.style.top = previewRect.top;
    }
}
function getUnitWithHtmlElement(element) {
    for (let u in units)
        if (units[u].html_element == element)
            return units[u];
}

class unit {
    move(amount_x, amount_y) {
        this.grid_x += amount_x;
        this.grid_y += amount_y;
        this.update();
    }

    update() {
        this.html_element.style.width = this.size * grid_size;
        this.html_element.style.height = this.size * grid_size;
        this.html_element.style.left = grid_container_padding + this.grid_x * grid_size;
        this.html_element.style.top = grid_container_padding + this.grid_y * grid_size;
    }

    constructor(id, name, size, grid_x, grid_y) {
        this.id = id;
        this.name = name;
        this.size = size;
        this.grid_x = grid_x;
        this.grid_y = grid_y;

        var unit = document.createElement('div');
        unit.setAttribute('unit', '');
        container.appendChild(unit);
        this.html_element = unit;
        this.html_element.onclick = unitHtmlClicked;

        unit.setAttribute('style', 'background-color: blue');
        this.update();

        units[id] = this;
    }
}