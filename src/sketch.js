var nodes = [];
var edges = [];
var data = '[{"name":"Garfield County","id":"257096","Percent of Total Hospital Referral Volume by Group":"32.3%"},{"name":"Ihc Health Services, Inc.","id":"137212","Percent of Total Hospital Referral Volume by Group":"23.8%"},{"name":"Wayne Community Health Centers Inc","id":"55942","Percent of Total Hospital Referral Volume by Group":"20.6%"},{"name":"Cedar City Radiology Llc","id":"16543","Percent of Total Hospital Referral Volume by Group":"6.4%"},{"name":"Cedar Anesthesia Group Llp","id":"7295","Percent of Total Hospital Referral Volume by Group":"5.5%"},{"name":"Foot And Ankle Institute, Inc.","id":"204286","Percent of Total Hospital Referral Volume by Group":"2.4%"},{"name":"Dr. Randy G Delcore, M.D. P.C.","id":"221194","Percent of Total Hospital Referral Volume by Group":"1.9%"},{"name":"Beaver Medical, Llc","id":"165594","Percent of Total Hospital Referral Volume by Group":"1.4%"},{"name":"Central Utah Clinic Pc","id":"285132","Percent of Total Hospital Referral Volume by Group":"1.3%"},{"name":"Kane County Human Resource Special Service District","id":"226821","Percent of Total Hospital Referral Volume by Group":"0.8%"},{"name":"Robert D Pearson Pc","id":"254412","Percent of Total Hospital Referral Volume by Group":"0.5%"},{"name":"St George Urology Llc","id":"180238","Percent of Total Hospital Referral Volume by Group":"0.3%"},{"name":"Huntsman West Spine Llc","id":"8768","Percent of Total Hospital Referral Volume by Group":"0.3%"},{"name":"Dialysis Program Physicians University Of Utah","id":"210779","Percent of Total Hospital Referral Volume by Group":"0.2%"},{"name":"University Of Utah Adult Services","id":"22859","Percent of Total Hospital Referral Volume by Group":"0.2%"},{"name":"Enterprise Valley Medical Clinic, Inc.","id":"267522","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"Karen Murray Radley M.D.Pc","id":"294084","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"St. George Radiology Inc.","id":"278298","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"Tooele Valley Imaging Llc","id":"169445","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"San Juan County Hospital","id":"212970","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"Beaver Valley Hospital","id":"174531","Percent of Total Hospital Referral Volume by Group":"0%"},{"name":"Advanced Pulmonary, Sleep Disorder And Internal Medicine,Llc","id":"186979","Percent of Total Hospital Referral Volume by Group":"0%"},{"name":"Portercare Adventist Health System","id":"20698","Percent of Total Hospital Referral Volume by Group":"0%"},{"name":"Catholic Health Initiatives Colorado","id":"297077","Percent of Total Hospital Referral Volume by Group":"0%"}]';
var hospData = '[{"name":"Garfield Memorial Hospital"}]';
var authToken;
var datasetFields = {
  'hospital' : {
    id : 'torch_hospital_id',
    primaryname : 'name',
    affiliationname : 'name'
  },
  'physiciangroup' : {
    id : 'torch_provider_group_id',
    primaryname : 'organizationlegalname',
    affiliationname : 'name'
  }
}

function preload() {
  //Use dummy data when testing to not constantly ping the server
  //populateGraph(JSON.parse(data), JSON.parse(hospData));
  sendHttpRequest(
    '../credentials.json',
    {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    },
    request => {
      authenticate(request.email, request.password);
    }
  )
}

function authenticate(email, password) {
  authToken = getCookie('Token');
  if (authToken == "") {
    sendHttpRequest('https://api.torchinsight.com/authenticate',
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: '{"email":"' + email + '","password":"' + password + '"}'
      },
      response => {
        authToken = response;
        setCookie("Token", authToken, 1);
        getData(document.querySelector('#entityid').value, 'hospital', 'physiciangroup');
      }
    );
  } else {
    getData(document.querySelector('#entityid').value, 'hospital', 'physiciangroup');
  }
}

function getData(id, fromDataSource, toDataSource) {
  let affiliationData;
  let primaryEntityData;
  
  Promise.all([
    getAffiliationData(id, fromDataSource, toDataSource, data => { affiliationData = data }),
    getPrimaryEntityData(id, fromDataSource, data => { primaryEntityData = data })
  ]).then(() => {
    populateGraph(affiliationData, primaryEntityData, toDataSource, fromDataSource);
    redraw();
  });
}

function getAffiliationData(id, fromDataSource, toDataSource, callback) {
  return new Promise((resolve) => {
    sendHttpRequest(
      'https://api.torchinsight.com/data/' + fromDataSource + '/' + id + '/affiliations/' + toDataSource,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        }
      },
      response => {
        resolve(callback(JSON.parse(response)));
      }
    );
  });
}

function getPrimaryEntityData(id, entityDataSource, callback) {
  return new Promise((resolve) => {
    sendHttpRequest(
      'https://api.torchinsight.com/data/' + entityDataSource + '/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: '{"fields":["' + datasetFields[entityDataSource].primaryname + '","' + datasetFields[entityDataSource].id + '"],"filters":[{"field":"' + datasetFields[entityDataSource].id + '","test":"=","value":' + id + '}]}'
      },
      response => {
        resolve(callback(JSON.parse(response)));
      }
    );
  });
}

function populateGraph(affiliatedEntityArray, primaryEntityData, affiliatedEntityType, primaryEntityType) {
  const centerX = window.innerWidth / 2 - 50;
  const centerY = window.innerHeight / 2 - 50;

  nodes.push(
    new Entity(
      centerX, 
      centerY, 
      100, 
      primaryEntityData[0][datasetFields[primaryEntityType].primaryname], 
      primaryEntityType, 
      primaryEntityData[0][datasetFields[primaryEntityType].id]
    )
  );

  const filtered = affiliatedEntityArray.filter(e => parseInt(e[Object.keys(e)[2]]) >= 1);
  const nodeAngle = (2 * PI) / filtered.length;

  filtered.forEach((entity, i) => {
    const size = parseInt(entity[Object.keys(entity)[2]]);
    const radius = size + 50;
    const nodeX = centerX + (300 * cos((nodeAngle * i) - PI/2));
    const nodeY = centerY + (300 * sin((nodeAngle * i) - PI/2));

    nodes.push(
      new WeightedEntity(
        nodeX, 
        nodeY, 
        radius, 
        entity[datasetFields[affiliatedEntityType].affiliationname], 
        affiliatedEntityType, 
        entity.id, 
        size 
      )
    );
  });

  nodes.slice(1).forEach(e => {
    edges.push(new Edge(nodes[0], e));
  });

  runDraw();
}

function sendHttpRequest(url, options, callback) {
  let httpRequest = new XMLHttpRequest();
  httpRequest.open(options.method, url, true);

  Object.keys(options.headers).forEach(e => {
    httpRequest.setRequestHeader(e, options.headers[e]);
  });

  httpRequest.onreadystatechange = () => {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        callback(httpRequest.responseText);
      } else {
        alert('There was a problem with the request.');
      }
    }
  }

  options.body == null ? httpRequest.send() : httpRequest.send(options.body);
}

function updateDataForID(id, fromDataset, toDataset) {
  nodes = [];
  edges = [];

  getData(id, fromDataset, toDataset);
}

function updateData() {
  if (document.querySelector('#entitytype').value === 'physiciangroup') {
    updateDataForID(document.querySelector('#entityid').value, 'physiciangroup', 'hospital');
  } else {
    updateDataForID(clickedNode.id, 'hospital', 'physiciangroup');
  }
}

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  noLoop();
}

function draw() {
  // background(255);
  // nodes.forEach(n => {
  //   n.draw();
  // });
  // edges.forEach(e => {
  //   e.draw();
  // });
}

function runDraw() {
  nodes.forEach(n => {
    n.draw();
  });
  edges.forEach(e => {
    e.draw();
  });
}

function mouseClicked() {
  //Take the last element of the array because they are drawn last and appear on top as a result
  const clickedNode = nodes.filter(n => n.contains(mouseX, mouseY)).slice(-1)[0];

  if (clickedNode != null) {
    document.querySelector('#entitytype').value = clickedNode.type;
    document.querySelector('#entityid').value = clickedNode.id;

    document.querySelector('#chart').innerHTML = '';

    if (clickedNode.type === 'physiciangroup') {
      updateDataForID(clickedNode.id, 'physiciangroup', 'hospital');
    } else {
      updateDataForID(clickedNode.id, 'hospital', 'physiciangroup');
    }
  }
}

class GraphNode {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.drawingGroup = document.createElementNS("http://www.w3.org/2000/svg","g");
    document.getElementById("chart").appendChild(this.drawingGroup);
  }

  draw() {
    let circle = document.createElementNS("http://www.w3.org/2000/svg","circle");

    circle.setAttributeNS(null,"cx",this.x);
    circle.setAttributeNS(null,"cy",this.y);
    circle.setAttributeNS(null,"r",this.radius);

    this.drawingGroup.appendChild(circle);
  }

  contains(x, y) {
    const distance = pow(this.x - x, 2) + pow(this.y - y, 2);
    return distance < pow(this.radius, 2);
  }
}

class Entity extends GraphNode {
  constructor(x, y, radius, name, type, id) {
    super(x, y, radius);
    this.name = name;
    this.type = type;
    this.id = id;
  }

  get label() {
    return this.name;
  }

  draw() {
    super.draw();
    let text = document.createElementNS("http://www.w3.org/2000/svg","foreignObject");

    text.setAttributeNS(null, "x", this.x - this.radius);
    text.setAttributeNS(null, "y", this.y - this.radius);
    text.setAttributeNS(null, "width", this.radius * 2);
    text.setAttributeNS(null, "height", this.radius * 2);
    text.setAttributeNS(null, "class", "entityTitle");

    text.innerHTML = '<div class="entityTitle"><p>'+this.label+'</p></div>';

    this.drawingGroup.appendChild(text);
  }
}

class WeightedEntity extends Entity {
  constructor(x, y, radius, name, type, id, weight) {
    super(x, y, radius, name, type, id);
    this.weight = weight;
  }

  get label() {
    return this.name + '<br>' + this.weight + '%';
  }
}

class Edge {
  constructor(left, right) {
    if (left.x <= right.x) {
      this.left = left;
      this.right = right;
    } else {
      this.right = left;
      this.left = right;
    }
  }

  draw() {
    let l = this.left;
    let r = this.right;
    let theta = atan((r.y - l.y)/(r.x - l.x))

    let line = document.createElementNS("http://www.w3.org/2000/svg","line");

    line.setAttributeNS(null, "x1", l.x + (l.radius * cos(theta)));
    line.setAttributeNS(null, "y1", l.y + (l.radius * sin(theta)));
    line.setAttributeNS(null, "x2", r.x - (r.radius * cos(theta)));
    line.setAttributeNS(null, "y2", r.y - (r.radius * sin(theta)));

    document.getElementById("chart").appendChild(line);
  }
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
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