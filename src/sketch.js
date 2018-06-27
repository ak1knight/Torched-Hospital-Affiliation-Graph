var nodes = [];
var edges = [];
var data = '[{"name":"Garfield County","id":"257096","Percent of Total Hospital Referral Volume by Group":"32.3%"},{"name":"Ihc Health Services, Inc.","id":"137212","Percent of Total Hospital Referral Volume by Group":"23.8%"},{"name":"Wayne Community Health Centers Inc","id":"55942","Percent of Total Hospital Referral Volume by Group":"20.6%"},{"name":"Cedar City Radiology Llc","id":"16543","Percent of Total Hospital Referral Volume by Group":"6.4%"},{"name":"Cedar Anesthesia Group Llp","id":"7295","Percent of Total Hospital Referral Volume by Group":"5.5%"},{"name":"Foot And Ankle Institute, Inc.","id":"204286","Percent of Total Hospital Referral Volume by Group":"2.4%"},{"name":"Dr. Randy G Delcore, M.D. P.C.","id":"221194","Percent of Total Hospital Referral Volume by Group":"1.9%"},{"name":"Beaver Medical, Llc","id":"165594","Percent of Total Hospital Referral Volume by Group":"1.4%"},{"name":"Central Utah Clinic Pc","id":"285132","Percent of Total Hospital Referral Volume by Group":"1.3%"},{"name":"Kane County Human Resource Special Service District","id":"226821","Percent of Total Hospital Referral Volume by Group":"0.8%"},{"name":"Robert D Pearson Pc","id":"254412","Percent of Total Hospital Referral Volume by Group":"0.5%"},{"name":"St George Urology Llc","id":"180238","Percent of Total Hospital Referral Volume by Group":"0.3%"},{"name":"Huntsman West Spine Llc","id":"8768","Percent of Total Hospital Referral Volume by Group":"0.3%"},{"name":"Dialysis Program Physicians University Of Utah","id":"210779","Percent of Total Hospital Referral Volume by Group":"0.2%"},{"name":"University Of Utah Adult Services","id":"22859","Percent of Total Hospital Referral Volume by Group":"0.2%"},{"name":"Enterprise Valley Medical Clinic, Inc.","id":"267522","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"Karen Murray Radley M.D.Pc","id":"294084","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"St. George Radiology Inc.","id":"278298","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"Tooele Valley Imaging Llc","id":"169445","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"San Juan County Hospital","id":"212970","Percent of Total Hospital Referral Volume by Group":"0.1%"},{"name":"Beaver Valley Hospital","id":"174531","Percent of Total Hospital Referral Volume by Group":"0%"},{"name":"Advanced Pulmonary, Sleep Disorder And Internal Medicine,Llc","id":"186979","Percent of Total Hospital Referral Volume by Group":"0%"},{"name":"Portercare Adventist Health System","id":"20698","Percent of Total Hospital Referral Volume by Group":"0%"},{"name":"Catholic Health Initiatives Colorado","id":"297077","Percent of Total Hospital Referral Volume by Group":"0%"}]';
var hospData = '[{"name":"Garfield Memorial Hospital"}]';
var authToken;

function preload() {
  //Use dummy data when testing to not constantly ping the server
  //populateGraph(JSON.parse(data), JSON.parse(hospData));
  sendHttpRequest('GET',
    '../credentials.json',
    [
      {header:'Content-Type', value:'application/json'}
    ],
    null,
    request => {
      let response = JSON.parse(request.responseText);
      authenticate(response.email, response.password);
    }
  );
}

function authenticate(email, password) {
  sendHttpRequest('POST', 
    'https://api.torchinsight.com/authenticate',
    [
      {header:'Content-Type', value:'application/json'}
    ],
    '{"email":"' + email + '","password":"' + password + '"}',
    request => {
      authToken = request.responseText;
      getAffiliationData(document.querySelector('#hospitalid').value);
    }
  );
}

function getAffiliationData(id) {
  sendHttpRequest('GET',
    'https://api.torchinsight.com/data/hospital/' + id + '/affiliations/physiciangroup',
    [
      {header:'Content-Type', value:'application/json'},
      {header:'Authorization', value:'Bearer ' + authToken}
    ],
    null,
    request => {
      getHospitalData(id, JSON.parse(request.responseText));
    }
  );
}

function getHospitalData(id, affiliationData) {
  sendHttpRequest('POST', 
    'https://api.torchinsight.com/data/hospital/',
    [
      {header:'Content-Type', value:'application/json'},
      {header:'Authorization', value:'Bearer ' + authToken}
    ],
    '{"fields":["name"],"filters":[{"field":"torch_hospital_id","test":"=","value":' + id + '}]}',
    request => {
      populateGraph(affiliationData, JSON.parse(request.responseText));
    }
  );
}

function sendHttpRequest(type, url, headers, payload, callback) {
  let httpRequest = new XMLHttpRequest();
  httpRequest.open(type, url, true);

  headers.forEach(e => {
    httpRequest.setRequestHeader(e.header, e.value);
  });

  httpRequest.onreadystatechange = () => {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        callback(httpRequest);
      } else {
        alert('There was a problem with the request.');
      }
    }
  }

  payload == null ? httpRequest.send() : httpRequest.send(payload);
}

function populateGraph(entityArray, hospitalData) {
  nodes.push(new Entity(window.innerWidth / 2 - 50, window.innerHeight / 2 - 50, hospitalData[0].name, 100 ));

  let filtered = entityArray.filter(e => parseInt(e['Percent of Total Hospital Referral Volume by Group']) >= 1);
  let nodeAngle = radians(360 / filtered.length);

  filtered.forEach((e, i) => {
    let size = parseInt(e['Percent of Total Hospital Referral Volume by Group']);
    let nodeX = (window.innerWidth / 2 - (size + 50) / 2) + (300 * cos((nodeAngle * i) - PI/2));
    let nodeY = (window.innerHeight / 2 - (size + 50) / 2) + (300 * sin((nodeAngle * i) - PI/2));
    nodes.push(new WeightedEntity(nodeX, nodeY, e.name, size, size + 50 ));
  });

  nodes.slice(1).forEach(e => {
    edges.push(new Edge(nodes[0], e));
  })
}

function updateDataForID() {
  nodes = [];
  edges = [];

  getAffiliationData(document.querySelector('#hospitalid').value);
}

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
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
  constructor(x, y, entityName, radius) {
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
  constructor(x, y, entityName, entityWeight, radius) {
    super(x, y, entityName, radius);
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