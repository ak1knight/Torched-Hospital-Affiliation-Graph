var nodes = [];
var edges = [];
var data = '[{"name":"Garfield County","id":"257096","Percent of Total Hospital Referral Volume by Group":"32.3%"},{"name":"Ihc Health Services, Inc.","id":"137212","Percent of Total Hospital Referral Volume by Group":"23.8%"},{"name":"Wayne Community Health Centers Inc","id":"55942","Percent of Total Hospital Referral Volume by Group":"20.6%"},{"name":"Cedar City Radiology Llc","id":"16543","Percent of Total Hospital Referral Volume by Group":"6.4%"},{"name":"Cedar Anesthesia Group Llp","id":"7295","Percent of Total Hospital Referral Volume by Group":"5.5%"},{"name":"Foot And Ankle Institute, Inc.","id":"204286","Percent of Total Hospital Referral Volume by Group":"2.4%"},{"name":"Dr. Randy G Delcore, M.D. P.C.","id":"221194","Percent of Total Hospital Referral Volume by Group":"1.9%"},{"name":"Beaver Medical, Llc","id":"165594","Percent of Total Hospital Referral Volume by Group":"1.4%"},{"name":"Central Utah Clinic Pc","id":"285132","Percent of Total Hospital Referral Volume by Group":"1.3%"},{"name":"Kane County Human Resource Special Service District","id":"226821","Percent of Total Hospital Referral Volume by Group":"0.8%"},{"name":"Robert D Pearson Pc","id":"254412","Percent of Total Hospital Referral Volume by Group":"0.5%"},{"name":"St George Urology Llc","id":"180238","Percent of Total Hospital Referral Volume by Group":"0.3%"},{"name":"Huntsman West Spine Llc","id":"8768","Percent of Total Hospital Referral Volume by Group":"0.3%"},{"name":"Dialysis Program Physicians University Of Utah","id":"210779","Percent of Total Hospital Referral Volume by Group":"0.2%"},{"name":"University Of Utah Adult Services","id":"22859","Percent of Total Hospital Referral Volume by Group":"0.2%"},{"name":"Enterprise Valley Medical Clinic, Inc.","id":"267522","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"Karen Murray Radley M.D.Pc","id":"294084","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"St. George Radiology Inc.","id":"278298","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"Tooele Valley Imaging Llc","id":"169445","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"San Juan County Hospital","id":"212970","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"Beaver Valley Hospital","id":"174531","Percent of Total Hospital Referral Volume by Group":"0%"},{"name":"Advanced Pulmonary, Sleep Disorder And Internal Medicine,Llc","id":"186979","Percent of Total Hospital Referral Volume by Group":"0%"},{"name":"Portercare Adventist Health System","id":"20698","Percent of Total Hospital Referral Volume by Group":"0%"},{"name":"Catholic Health Initiatives Colorado","id":"297077","Percent of Total Hospital Referral Volume by Group":"0%"}]';
var hospData = '[{"name":"Garfield Memorial Hospital"}]';
var authToken;
var datasetFields = {
  'hospital' : {
    'id' : 'torch_hospital_id',
    'primaryname' : 'name',
    'affiliationname' : 'name'
  },
  'physiciangroup' : {
    'id' : 'torch_provider_group_id',
    'primaryname' : 'organizationlegalname',
    'affiliationname' : 'name'
  }
}

function preload() {
  //Use dummy data when testing to not constantly ping the server
  //populateGraph(JSON.parse(data), JSON.parse(hospData));
  // let credentials = loadJSON('../credentials.json');
  // authenticate(credentials.email, credentials.password);
  httpDo(
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
    httpDo('https://api.torchinsight.com/authenticate',
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: '{"email":"' + email + '","password":"' + password + '"}'
      },
      request => {
        authToken = request;
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
  return new Promise((resolve, reject) => {
    httpDo(
      'https://api.torchinsight.com/data/' + fromDataSource + '/' + id + '/affiliations/' + toDataSource,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        }
      },
      request => {
        resolve(callback(JSON.parse(request)));
      }
    );
  });
}

function getPrimaryEntityData(id, entityDataSource, callback) {
  return new Promise((resolve, reject) => {
    httpDo(
      'https://api.torchinsight.com/data/' + entityDataSource + '/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: '{"fields":["' + datasetFields[entityDataSource].primaryname + '"],"filters":[{"field":"' + datasetFields[entityDataSource].id + '","test":"=","value":' + id + '}]}'
      },
      request => {
        resolve(callback(JSON.parse(request)));
      }
    );
  });
}

function populateGraph(affiliatedEntityArray, primaryEntityData, affiliatedEntityType, primaryEntityType) {
  const centerX = window.innerWidth / 2 - 50;
  const centerY = window.innerHeight / 2 - 50;
  nodes.push(new Entity(centerX, centerY, 100, primaryEntityData[0][datasetFields[primaryEntityType].primaryname], primaryEntityType));

  const filtered = affiliatedEntityArray.filter(e => parseInt(e[Object.keys(e)[2]]) >= 1);
  const nodeAngle = (2 * PI) / filtered.length;

  filtered.forEach((e, i) => {
    const size = parseInt(e[Object.keys(e)[2]]);
    const radius = size + 50;
    const nodeX = centerX + (300 * cos((nodeAngle * i) - PI/2));
    const nodeY = centerY + (300 * sin((nodeAngle * i) - PI/2));
    console.log(e);
    nodes.push(new WeightedEntity(nodeX, nodeY, radius, e[datasetFields[affiliatedEntityType].affiliationname], affiliatedEntityType, size ));
  });

  nodes.slice(1).forEach(e => {
    edges.push(new Edge(nodes[0], e));
  });
}

function updateDataForID() {
  nodes = [];
  edges = [];

  getData(document.querySelector('#entityid').value, 'physiciangroup', 'hospital');
}

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  noLoop();
}

function draw() {
  background(255);
  nodes.forEach(n => {
    n.draw();
  });
  edges.forEach(e => {
    e.draw();
  });
}

class GraphNode {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  draw() {
    ellipse(this.x, this.y, this.radius * 2);
  }
}

class Entity extends GraphNode {
  constructor(x, y, radius, entityName, entityType) {
    super(x, y, radius);
    this.entityName = entityName;
  }

  get label() {
    return this.entityName;
  }

  draw() {
    super.draw();
    textAlign(CENTER, CENTER);
    text(this.label, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
  }
}

class WeightedEntity extends Entity {
  constructor(x, y, radius, entityName, entityType, entityWeight) {
    super(x, y, radius, entityName);
    this.entityWeight = entityWeight;
  }

  get label() {
    return this.entityName + '\n' + this.entityWeight + '%';
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
    line(l.x + (l.radius * cos(theta)), l.y + (l.radius * sin(theta)), r.x - (r.radius * cos(theta)), r.y - (r.radius * sin(theta)));
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