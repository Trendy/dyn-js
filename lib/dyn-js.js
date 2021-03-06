'use strict';
var Dyn, callWithError, crudAccounts, crudGslb, crudGslbRegion, crudHttpRedirect, crudMessaging, crudRecipients, crudRecord, crudReportsBounces, crudReportsClicks, crudReportsComplaints, crudReportsDelivered, crudReportsIssues, crudReportsOpens, crudReportsSentMail, crudSendMail, crudSenders, crudSuppressions, crudTraffic, crudZone, extract, extractData, extractMsgData, extractMsgs, extractRecords, extractZones, failBool, https, identity, isOk, log, makePromise, msgIsOk, okBool, q, qs, throwMessages, throwMsgMessages, _, _request_q;

_ = require('underscore');

q = require('q');

https = require('https');

log = require('npmlog');

qs = require('querystring');

_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

_request_q = function(dyn, method, path, body, isTraffic) {
  var cc, defer, headers, host, opts, port, req;
  log.verbose('dyn', "invoking via https : " + method + " " + path);
  defer = q.defer();
  cc = function(a, b, c) {
    log.verbose('dyn', "invocation returned : " + method + " " + path);
    if (a !== null) {
      return defer.reject.call({}, [a]);
    }
    return defer.resolve.call({}, [a, b, c]);
  };
  host = dyn.defaults.host;
  port = dyn.defaults.port;
  path = dyn.defaults.prefix + path;
  headers = _.clone(dyn.defaults.headers);
  if (body && typeof body !== 'string') {
    body = JSON.stringify(body);
    headers['Content-Length'] = body.length;
  } else {
    if (body) {
      headers['Content-Length'] = body.length;
    } else {
      headers['Content-Length'] = 0;
    }
  }
  if (isTraffic) {
    if (!((path.indexOf("/REST/Session/") === 0) && (method === 'POST'))) {
      if (dyn.defaults.token === null) {
        throw new Error('must open a session first');
      }
      headers['Auth-Token'] = dyn.defaults.token;
    }
  }
  opts = {
    hostname: host,
    port: port,
    method: method,
    path: path,
    headers: headers
  };
  log.silly('dyn', "request : " + (JSON.stringify(opts)));
  req = https.request(opts, function(res) {
    var data;
    data = '';
    res.on('readable', function() {
      var chunk;
      chunk = res.read();
      return data += chunk.toString('ascii');
    });
    return res.on('end', function() {
      var response;
      log.silly('dyn', "response : " + data);
      response = JSON.parse(data);
      return cc(null, response, res);
    });
  });
  req.on('error', function(e) {
    log.warn('dyn', "error : " + (JSON.stringify(e)));
    return cc(e);
  });
  if (body) {
    req.write(body);
  }
  req.end();
  return defer.promise;
};

crudTraffic = function(path, custom) {
  var methods;
  custom || (custom = {});
  methods = {
    _list: 'GET',
    _create: 'POST',
    _get: 'GET',
    _update: 'PUT',
    _destroy: 'DELETE'
  };
  return _.reduce(_.keys(methods), function(a, x) {
    a[x] || (a[x] = {});
    a[x]._path = function(dyn, data) {
      var cpath, _ref;
      cpath = (custom != null ? (_ref = custom[x]) != null ? _ref.path : void 0 : void 0) || path;
      return _.template(cpath)(data);
    };
    a[x]._call = function(dyn, pathData, bodyData) {
      log.silly('dyn', "api call : " + x + " -> " + path);
      return _request_q(dyn, (custom != null ? custom.method : void 0) || methods[x], a[x]._path(dyn, pathData), bodyData, true);
    };
    return a;
  }, {});
};

crudMessaging = function(path, custom) {
  var allKeys, methods;
  custom || (custom = {});
  methods = {
    _list: 'GET',
    _create: 'POST',
    _get: 'GET',
    _update: 'POST',
    _destroy: 'POST'
  };
  allKeys = _.uniq(_.keys(custom).concat(_.keys(methods)));
  return _.reduce(allKeys, function(a, x) {
    a[x] || (a[x] = {});
    a[x]._path = function(dyn, data) {
      var cpath, _ref;
      cpath = (custom != null ? (_ref = custom[x]) != null ? _ref.path : void 0 : void 0) || path;
      data.e = escape;
      return _.template(cpath)(data);
    };
    a[x]._call = function(dyn, pathData, bodyData) {
      var method, _ref;
      log.silly('dyn', "api call : " + x + " -> " + path);
      method = (custom != null ? (_ref = custom[x]) != null ? _ref.method : void 0 : void 0) || methods[x];
      if (method === 'GET') {
        return _request_q(dyn, method, a[x]._path(dyn, pathData) + "?" + qs.stringify(bodyData));
      } else {
        return _request_q(dyn, method, a[x]._path(dyn, pathData), qs.stringify(bodyData));
      }
    };
    return a;
  }, {});
};

crudRecord = function(type) {
  return crudTraffic("/" + type + "Record/", {
    _list: {
      path: "/" + type + "Record/{{zone}}/{{fqdn}}"
    },
    _create: {
      path: "/" + type + "Record/{{zone}}/{{fqdn}}/"
    },
    _get: {
      path: "/" + type + "Record/{{zone}}/{{fqdn}}/{{id}}"
    },
    _update: {
      path: "/" + type + "Record/{{zone}}/{{fqdn}}/{{id}}"
    },
    _destroy: {
      path: "/" + type + "Record/{{zone}}/{{fqdn}}/{{id}}"
    }
  });
};

crudZone = function() {
  return crudTraffic("/Zone/", {
    _list: {
      path: "/Zone/"
    },
    _create: {
      path: "/Zone/{{zone}}/"
    },
    _get: {
      path: "/Zone/{{zone}}/"
    },
    _update: {
      path: "/Zone/{{zone}}/"
    },
    _destroy: {
      path: "/Zone/{{zone}}/"
    }
  });
};

crudHttpRedirect = function() {
  return crudTraffic("/HTTPRedirect/", {
    _get: {
      path: "/HTTPRedirect/{{zone}}/{{fqdn}}"
    },
    _update: {
      path: "/HTTPRedirect/{{zone}}/{{fqdn}}"
    },
    _create: {
      path: "/HTTPRedirect/{{zone}}/{{fqdn}}"
    },
    _destroy: {
      path: "/HTTPRedirect/{{zone}}/{{fqdn}}"
    }
  });
};

crudGslb = function() {
  return crudTraffic("/GSLB/", {
    _list: {
      path: "/GSLB/{{zone}}"
    },
    _create: {
      path: "/GSLB/{{zone}}/{{fqdn}}"
    },
    _get: {
      path: "/GSLB/{{zone}}/{{fqdn}}"
    },
    _update: {
      path: "/GSLB/{{zone}}/{{fqdn}}"
    },
    _destroy: {
      path: "/GSLB/{{zone}}/{{fqdn}}"
    }
  });
};

crudGslbRegion = function() {
  return crudTraffic("/GSLBRegion/", {
    _list: {
      path: "/GSLBRegion/{{zone}}"
    },
    _create: {
      path: "/GSLBRegion/{{zone}}/{{fqdn}}"
    },
    _get: {
      path: "/GSLBRegion/{{zone}}/{{fqdn}}"
    },
    _update: {
      path: "/GSLBRegion/{{zone}}/{{fqdn}}/{{region_code}}"
    },
    _destroy: {
      path: "/GSLBRegion/{{zone}}/{{fqdn}}"
    }
  });
};

crudSenders = function(type) {
  return crudMessaging("/senders", {
    _list: {
      path: "/senders"
    },
    _create: {
      path: "/senders"
    },
    _update: {
      path: "/senders"
    },
    _details: {
      path: "/senders/details",
      method: "GET"
    },
    _status: {
      path: "/senders/status",
      method: "GET"
    },
    _dkim: {
      path: "/senders/dkim",
      method: "POST"
    },
    _destroy: {
      path: "/senders/delete"
    }
  });
};

crudAccounts = function(type) {
  return crudMessaging("/accounts", {
    _list: {
      path: "/accounts"
    },
    _create: {
      path: "/accounts"
    },
    _destroy: {
      path: "/accounts/delete"
    },
    _list_xheaders: {
      path: "/accounts/xheaders",
      method: "GET"
    },
    _update_xheaders: {
      path: "/accounts/xheaders",
      method: "POST"
    }
  });
};

crudRecipients = function(type) {
  return crudMessaging("/recipients", {
    _activate: {
      path: "/recipients/activate",
      method: "POST"
    },
    _status: {
      path: "/recipients/status",
      method: "GET"
    }
  });
};

crudSendMail = function(type) {
  return crudMessaging("/send/", {
    _create: {
      path: "/send"
    }
  });
};

crudSuppressions = function(type) {
  return crudMessaging("/suppressions", {
    _list: {
      path: "/suppressions"
    },
    _create: {
      path: "/suppressions"
    },
    _activate: {
      path: "/suppressions/activate",
      method: "POST"
    },
    _count: {
      path: "/suppressions/count",
      method: "GET"
    }
  });
};

crudReportsSentMail = function(type) {
  return crudMessaging("/reports", {
    _list: {
      path: "/reports/sent"
    },
    _count: {
      path: "/reports/sent/count",
      method: "GET"
    }
  });
};

crudReportsDelivered = function(type) {
  return crudMessaging("/reports", {
    _list: {
      path: "/reports/delivered"
    },
    _count: {
      path: "/reports/delivered/count",
      method: "GET"
    }
  });
};

crudReportsBounces = function(type) {
  return crudMessaging("/reports", {
    _list: {
      path: "/reports/bounces"
    },
    _count: {
      path: "/reports/bounces/count",
      method: "GET"
    }
  });
};

crudReportsComplaints = function(type) {
  return crudMessaging("/reports", {
    _list: {
      path: "/reports/complaints"
    },
    _count: {
      path: "/reports/complaints/count",
      method: "GET"
    }
  });
};

crudReportsIssues = function(type) {
  return crudMessaging("/reports", {
    _list: {
      path: "/reports/issues"
    },
    _count: {
      path: "/reports/issues/count",
      method: "GET"
    }
  });
};

crudReportsOpens = function(type) {
  return crudMessaging("/reports", {
    _list: {
      path: "/reports/opens"
    },
    _count: {
      path: "/reports/opens/count",
      method: "GET"
    },
    _unique: {
      path: "/reports/opens/unique",
      method: "GET"
    },
    _unique_count: {
      path: "/reports/opens/count/unique",
      method: "GET"
    }
  });
};

crudReportsClicks = function(type) {
  return crudMessaging("/reports", {
    _list: {
      path: "/reports/clicks"
    },
    _count: {
      path: "/reports/clicks/count",
      method: "GET"
    },
    _unique: {
      path: "/reports/clicks/unique",
      method: "GET"
    },
    _unique_count: {
      path: "/reports/clicks/count/unique",
      method: "GET"
    }
  });
};

makePromise = function(val) {
  var r;
  r = q.defer();
  r.resolve(val);
  return r.promise;
};

callWithError = function(funProm, description, successFilter, successCase, errorCase) {
  return funProm.then(function(x) {
    return makePromise(successFilter(x[1]) ? (log.silly('dyn', "api call returned successfully : " + (JSON.stringify(x[1]))), successCase(x[1])) : (log.info('dyn', "api call returned error : " + (JSON.stringify(x[1]))), errorCase(x[1])));
  }, function(x) {
    log.warn('dyn', "unexpected error : " + (JSON.stringify(x[1])));
    return errorCase(x);
  });
};

isOk = function(x) {
  return x && (x.status === 'success');
};

identity = function(x) {
  return x;
};

extract = function(key) {
  return function(x) {
    return x != null ? x[key] : void 0;
  };
};

extractData = extract('data');

extractMsgs = extract('msgs');

msgIsOk = function(x) {
  return x && x.response && (x.response.status === 200);
};

extractMsgData = function(x) {
  var _ref;
  return x != null ? (_ref = x.response) != null ? _ref.data : void 0 : void 0;
};

okBool = function() {
  return true;
};

failBool = function() {
  return false;
};

extractRecords = function(x) {
  if (!(x && x.data)) {
    return [];
  }
  return _(x.data).map(function(r) {
    var v;
    v = r.split("/");
    return {
      type: v[2].replace(/Record$/, ""),
      zone: v[3],
      fqdn: v[4],
      id: v[5]
    };
  });
};

extractZones = function(x) {
  if (!(x && x.data)) {
    return [];
  }
  return _(x.data).map(function(r) {
    var v;
    v = r.split("/");
    return {
      zone: v[3]
    };
  });
};

throwMessages = function(x) {
  throw x.msgs || "unknown exception when calling api";
};

throwMsgMessages = function(x) {
  var _ref;
  throw (x != null ? (_ref = x.response) != null ? _ref.message : void 0 : void 0) || "unknown exception when calling api";
};

Dyn = function(opts) {
  var allow, dyn, messaging, messaging_defaults, recordTypes, traffic, traffic_defaults, whiteList;
  traffic_defaults = _.defaults((opts != null ? opts.traffic : void 0) || {}, {
    host: 'api2.dynect.net',
    port: 443,
    prefix: '/REST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'dyn-js v1.0.3'
    },
    token: null
  });
  messaging_defaults = _.defaults((opts != null ? opts.messaging : void 0) || {}, {
    host: 'emailapi.dynect.net',
    port: 443,
    prefix: '/rest/json',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'dyn-js v1.0.3'
    },
    apikey: null
  });
  dyn = {};
  dyn.traffic = {};
  traffic = dyn.traffic;
  dyn.log = log;
  dyn.log.level = "info";
  traffic.defaults = _.clone(traffic_defaults);
  traffic.withZone = function(zone) {
    traffic.defaults.zone = zone;
    return traffic;
  };
  traffic.zone = crudZone();
  traffic.zone.list = function() {
    return callWithError(traffic.zone._list._call(traffic, {}, {}), "zone.list", isOk, extractZones, throwMessages);
  };
  traffic.zone.create = function(args) {
    return callWithError(traffic.zone._create._call(traffic, {
      zone: traffic.defaults.zone
    }, args), "zone.create", isOk, extractData, throwMessages);
  };
  traffic.zone.get = function() {
    return callWithError(traffic.zone._list._call(traffic, {
      zone: traffic.defaults.zone
    }, {}), "zone.get", isOk, extractData, throwMessages);
  };
  traffic.zone.destroy = function() {
    return callWithError(traffic.zone._destroy._call(traffic, {
      zone: traffic.defaults.zone
    }, {}), "zone.destroy", isOk, extractMsgs, throwMessages);
  };
  traffic.zone.publish = function() {
    return callWithError(traffic.zone._update._call(traffic, {
      zone: traffic.defaults.zone
    }, {
      publish: true
    }), "zone.publish", isOk, extractData, throwMessages);
  };
  traffic.zone.freeze = function() {
    return callWithError(traffic.zone._update._call(traffic, {
      zone: traffic.defaults.zone
    }, {
      freeze: true
    }), "zone.freeze", isOk, extractData, throwMessages);
  };
  traffic.zone.thaw = function() {
    return callWithError(traffic.zone._update._call(traffic, {
      zone: traffic.defaults.zone
    }, {
      thaw: true
    }), "zone.thaw", isOk, extractData, throwMessages);
  };
  traffic.session = crudTraffic("/Session/");
  traffic.session.create = function() {
    return callWithError(traffic.session._create._call(traffic, {}, _.pick(traffic.defaults, 'customer_name', 'user_name', 'password')), "session.create", isOk, function(x) {
      traffic.defaults.token = x.data.token;
      return makePromise(x);
    }, throwMessages);
  };
  traffic.session.destroy = function() {
    return callWithError(traffic.session._destroy._call(traffic, {}, {}), "session.destroy", isOk, function(x) {
      traffic.defaults.token = null;
      return makePromise(x);
    }, throwMessages);
  };
  recordTypes = ['All', 'ANY', 'A', 'AAAA', 'CERT', 'CNAME', 'DHCID', 'DNAME', 'DNSKEY', 'DS', 'IPSECKEY', 'KEY', 'KX', 'LOC', 'MX', 'NAPTR', 'NS', 'NSAP', 'PTR', 'PX', 'RP', 'SOA', 'SPF', 'SRV', 'SSHFP', 'TXT'];
  whiteList = {
    'All': 'list',
    'ANY': 'list',
    'SOA': {
      'list': true,
      'get': true,
      'update': true
    }
  };
  allow = function(x, op) {
    return !whiteList[x] || (_.isString(whiteList[x]) && whiteList[x] === op) || (_.isObject(whiteList[x]) && whiteList[x][op]);
  };
  traffic.record = _.reduce(recordTypes, function(a, x) {
    var type;
    type = "_" + x;
    a[type] = crudRecord(x);
    if (allow(x, 'list')) {
      a[type].list = (function(fqdn) {
        return callWithError(traffic.record[type]._list._call(traffic, {
          zone: traffic.defaults.zone,
          fqdn: fqdn || ''
        }, {}), "record._" + type + ".list", isOk, extractRecords, throwMessages);
      });
    }
    if (allow(x, 'create')) {
      a[type].create = (function(fqdn, record) {
        return callWithError(traffic.record[type]._create._call(traffic, {
          zone: traffic.defaults.zone,
          fqdn: fqdn
        }, record), "record._" + type + ".create", isOk, extractData, throwMessages);
      });
    }
    if (allow(x, 'destroy')) {
      a[type].destroy = (function(fqdn, opt_id) {
        return callWithError(traffic.record[type]._destroy._call(traffic, {
          zone: traffic.defaults.zone,
          fqdn: fqdn,
          id: opt_id || ''
        }, {}), "record._" + type + ".destroy", isOk, extractMsgs, throwMessages);
      });
    }
    if (allow(x, 'get')) {
      a[type].get = (function(fqdn, id) {
        return callWithError(traffic.record[type]._get._call(traffic, {
          zone: traffic.defaults.zone,
          fqdn: fqdn,
          id: id
        }, {}), "record._" + type + ".get", isOk, extractRecords, throwMessages);
      });
    }
    if (allow(x, 'update')) {
      a[type].update = (function(fqdn, id, record) {
        return callWithError(traffic.record[type]._update._call(traffic, {
          zone: traffic.defaults.zone,
          fqdn: fqdn,
          id: id
        }, record), "record._" + type + ".update", isOk, extractData, throwMessages);
      });
    }
    if (allow(x, 'replace')) {
      a[type].replace = (function(fqdn, records) {
        var arg;
        arg = {};
        arg["" + x + "Records"] = records;
        return callWithError(traffic.record[type]._update._call(traffic, {
          zone: traffic.defaults.zone,
          fqdn: fqdn,
          id: ''
        }, arg), "record._" + type + ".replace", isOk, extractData, throwMessages);
      });
    }
    return a;
  }, {});
  traffic.http_redirect = crudHttpRedirect();
  traffic.http_redirect.list = function(fqdn) {
    return callWithError(traffic.http_redirect._list._call(traffic, {
      zone: traffic.defaults.zone
    }, {}), "http_redirect.list", isOk, extractData, throwMessages);
  };
  traffic.http_redirect.get = function(fqdn, detail) {
    return callWithError(traffic.http_redirect._get._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {
      detail: detail || 'N'
    }), "http_redirect.get", isOk, extractData, throwMessages);
  };
  traffic.http_redirect.create = function(fqdn, code, keep_uri, url) {
    return callWithError(traffic.http_redirect._create._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {
      code: code,
      keep_uri: keep_uri,
      url: url
    }), "http_redirect.create", isOk, extractData, throwMessages);
  };
  traffic.http_redirect.update = function(fqdn, code, keep_uri, url) {
    return callWithError(traffic.http_redirect._update._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {
      code: code,
      keep_uri: keep_uri,
      url: url
    }), "http_redirect.update", isOk, extractData, throwMessages);
  };
  traffic.http_redirect.destroy = function(fqdn) {
    return callWithError(traffic.http_redirect._destroy._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {}), "http_redirect.destroy", isOk, extractData, throwMessages);
  };
  traffic.gslb = crudGslb();
  traffic.gslb.list = function(detail) {
    return callWithError(traffic.gslb._list._call(traffic, {
      zone: traffic.defaults.zone
    }, {
      detail: detail || 'N'
    }), "gslb.list", isOk, extractData, throwMessages);
  };
  traffic.gslb.get = function(fqdn) {
    return callWithError(traffic.gslb._get._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {}), "gslb.get", isOk, extractData, throwMessages);
  };
  traffic.gslb.create = function(fqdn, opts) {
    return callWithError(traffic.gslb._create._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, opts), "gslb.create", isOk, extractData, throwMessages);
  };
  traffic.gslb.destroy = function(fqdn) {
    return callWithError(traffic.gslb._destroy._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {}), "gslb.destroy", isOk, extractData, throwMessages);
  };
  traffic.gslb.update = function(fqdn, opts) {
    return callWithError(traffic.gslb._update._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, opts), "gslb.update", isOk, extractData, throwMessages);
  };
  traffic.gslb.activate = function(fqdn) {
    return callWithError(traffic.gslb._update._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {
      activate: true
    }), "gslb.activate", isOk, extractData, throwMessages);
  };
  traffic.gslb.deactivate = function(fqdn) {
    return callWithError(traffic.gslb._update._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {
      deactivate: true
    }), "gslb.deactivate", isOk, extractData, throwMessages);
  };
  traffic.gslb.recover = function(fqdn) {
    return callWithError(traffic.gslb._update._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {
      recover: true
    }), "gslb.recover", isOk, extractData, throwMessages);
  };
  traffic.gslb.recoverip = function(fqdn, opts) {
    return callWithError(traffic.gslb._update._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, opts), "gslb.recoverip", isOk, extractData, throwMessages);
  };
  traffic.gslbRegion = crudGslbRegion();
  traffic.gslbRegion.list = function(detail) {
    return callWithError(traffic.gslbRegion._list._call(traffic, {
      zone: traffic.defaults.zone
    }, {
      detail: detail || 'N'
    }), "gslbRegion.list", isOk, extractData, throwMessages);
  };
  traffic.gslbRegion.get = function(fqdn) {
    return callWithError(traffic.gslbRegion._get._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {}), "gslbRegion.get", isOk, extractData, throwMessages);
  };
  traffic.gslbRegion.create = function(fqdn, opts) {
    return callWithError(traffic.gslbRegion._create._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, opts), "gslbRegion.create", isOk, extractData, throwMessages);
  };
  traffic.gslbRegion.destroy = function(fqdn) {
    return callWithError(traffic.gslbRegion._destroy._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn
    }, {}), "gslbRegion.destroy", isOk, extractData, throwMessages);
  };
  traffic.gslbRegion.update = function(fqdn, region_code, opts) {
    return callWithError(traffic.gslbRegion._update._call(traffic, {
      zone: traffic.defaults.zone,
      fqdn: fqdn,
      region_code: region_code
    }, opts), "gslbRegion.update", isOk, extractData, throwMessages);
  };
  dyn.messaging = {};
  messaging = dyn.messaging;
  messaging.defaults = _.clone(messaging_defaults);
  messaging.senders = crudSenders();
  messaging.senders.list = function(startindex) {
    return callWithError(messaging.senders._list._call(messaging, {}, _.defaults({
      startindex: startindex || '0'
    }, {
      apikey: messaging.defaults.apikey
    })), "senders.list", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.senders.create = function(email, seeding) {
    return callWithError(messaging.senders._create._call(messaging, {}, _.defaults({
      emailaddress: email,
      seeding: seeding || '0'
    }, {
      apikey: messaging.defaults.apikey
    })), "senders.create", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.senders.update = function(email, seeding) {
    return callWithError(messaging.senders._update._call(messaging, {}, _.defaults({
      emailaddress: email
    }, {
      apikey: messaging.defaults.apikey
    })), "senders.update", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.senders.details = function(email) {
    return callWithError(messaging.senders._details._call(messaging, {}, _.defaults({
      emailaddress: email
    }, {
      apikey: messaging.defaults.apikey
    })), "senders.details", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.senders.status = function(email) {
    return callWithError(messaging.senders._status._call(messaging, {}, _.defaults({
      emailaddress: email
    }, {
      apikey: messaging.defaults.apikey
    })), "senders.status", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.senders.dkim = function(email, dkim) {
    return callWithError(messaging.senders._dkim._call(messaging, {}, _.defaults({
      emailaddress: email,
      dkim: dkim
    }, {
      apikey: messaging.defaults.apikey
    })), "senders.dkim", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.senders.destroy = function(email) {
    return callWithError(messaging.senders._destroy._call(messaging, {}, _.defaults({
      emailaddress: email
    }, {
      apikey: messaging.defaults.apikey
    })), "senders.destroy", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.accounts = crudAccounts();
  messaging.accounts.create = function(username, password, companyname, phone, address, city, state, zipcode, country, timezone, bounceurl, spamurl, unsubscribeurl, trackopens, tracelinks, trackunsubscribes, generatenewapikey) {
    return callWithError(messaging.accounts._create._call(messaging, {}, _.defaults({
      username: username,
      password: password,
      companyname: companyname,
      phone: phone,
      address: address,
      city: city,
      state: state,
      zipcode: zipcode,
      country: country,
      timezone: timezone,
      bounceurl: bounceurl,
      spamurl: spamurl,
      unsubscribeurl: unsubscribeurl,
      trackopens: trackopens,
      tracelinks: tracelinks,
      trackunsubscribes: trackunsubscribes,
      generatenewapikey: generatenewapikey
    }, {
      apikey: messaging.defaults.apikey
    })), "accounts.create", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.accounts.list = function(startindex) {
    return callWithError(messaging.accounts._list._call(messaging, {}, _.defaults({
      startindex: startindex || '0'
    }, {
      apikey: messaging.defaults.apikey
    })), "accounts.list", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.accounts.destroy = function(username) {
    return callWithError(messaging.accounts._destroy._call(messaging, {}, _.defaults({
      username: username
    }, {
      apikey: messaging.defaults.apikey
    })), "accounts.destroy", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.accounts.list_xheaders = function() {
    return callWithError(messaging.accounts._list_xheaders._call(messaging, {}, _.defaults({}, {
      apikey: messaging.defaults.apikey
    })), "accounts.list_xheaders", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.accounts.update_xheaders = function(xh1, xh2, xh3, xh4) {
    return callWithError(messaging.accounts._update_xheaders._call(messaging, {}, _.defaults({
      xheader1: xh1,
      xheader2: xh2,
      xheader3: xh3,
      xheader4: xh4
    }, {
      apikey: messaging.defaults.apikey
    })), "accounts.update_xheaders", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.recipients = crudRecipients();
  messaging.recipients.status = function(email) {
    return callWithError(messaging.recipients._status._call(messaging, {}, _.defaults({
      emailaddress: email
    }, {
      apikey: messaging.defaults.apikey
    })), "recipients.status", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.recipients.activate = function(email) {
    return callWithError(messaging.recipients._activate._call(messaging, {}, _.defaults({
      emailaddress: email
    }, {
      apikey: messaging.defaults.apikey
    })), "recipients.activate", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.suppressions = crudSuppressions();
  messaging.suppressions.count = function(startdate, enddate) {
    return callWithError(messaging.suppressions._count._call(messaging, {}, _.defaults({}, {
      apikey: messaging.defaults.apikey
    })), "suppressions.count", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.suppressions.list = function(startdate, enddate, startindex) {
    return callWithError(messaging.suppressions._list._call(messaging, {}, _.defaults({
      startdate: startdate,
      enddate: enddate,
      startindex: startindex || '0'
    }, {
      apikey: messaging.defaults.apikey
    })), "suppressions.list", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.suppressions.create = function(email) {
    return callWithError(messaging.suppressions._create._call(messaging, {}, _.defaults({
      emailaddress: email
    }, {
      apikey: messaging.defaults.apikey
    })), "suppressions.create", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.suppressions.activate = function(email) {
    return callWithError(messaging.suppressions._activate._call(messaging, {}, _.defaults({
      emailaddress: email
    }, {
      apikey: messaging.defaults.apikey
    })), "suppressions.activate", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.delivery = crudReportsDelivered();
  messaging.delivery.count = function(starttime, endtime) {
    return callWithError(messaging.delivery._count._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "delivery.count", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.delivery.list = function(starttime, endtime, startindex) {
    return callWithError(messaging.delivery._list._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime,
      startindex: startindex || '0'
    }, {
      apikey: messaging.defaults.apikey
    })), "delivery.list", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.sent_mail = crudReportsSentMail();
  messaging.sent_mail.count = function(starttime, endtime) {
    return callWithError(messaging.sent_mail._count._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "sent_mail.count", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.sent_mail.list = function(starttime, endtime, startindex) {
    return callWithError(messaging.sent_mail._list._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime,
      startindex: startindex || '0'
    }, {
      apikey: messaging.defaults.apikey
    })), "sent_mail.list", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.bounces = crudReportsBounces();
  messaging.bounces.count = function(starttime, endtime) {
    return callWithError(messaging.bounces._count._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "bounces.count", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.bounces.list = function(starttime, endtime, startindex) {
    return callWithError(messaging.bounces._list._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime,
      startindex: startindex || '0'
    }, {
      apikey: messaging.defaults.apikey
    })), "bounces.list", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.complaints = crudReportsComplaints();
  messaging.complaints.count = function(starttime, endtime) {
    return callWithError(messaging.complaints._count._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "complaints.count", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.complaints.list = function(starttime, endtime, startindex) {
    return callWithError(messaging.complaints._list._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime,
      startindex: startindex || '0'
    }, {
      apikey: messaging.defaults.apikey
    })), "complaints.list", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.issues = crudReportsIssues();
  messaging.issues.count = function(starttime, endtime) {
    return callWithError(messaging.issues._count._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "issues.count", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.issues.list = function(starttime, endtime, startindex) {
    return callWithError(messaging.issues._list._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime,
      startindex: startindex || '0'
    }, {
      apikey: messaging.defaults.apikey
    })), "issues.list", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.opens = crudReportsOpens();
  messaging.opens.count = function(starttime, endtime) {
    return callWithError(messaging.opens._count._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "opens.count", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.opens.list = function(starttime, endtime, startindex) {
    return callWithError(messaging.opens._list._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "opens.list", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.opens.unique = function(starttime, endtime, startindex) {
    return callWithError(messaging.opens._unique._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "opens.unqiue", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.opens.unique_count = function(starttime, endtime) {
    return callWithError(messaging.opens._unique_count._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "opens.unique_count", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.clicks = crudReportsClicks();
  messaging.clicks.count = function(starttime, endtime) {
    return callWithError(messaging.clicks._count._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "clicks.count", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.clicks.list = function(starttime, endtime, startindex) {
    return callWithError(messaging.clicks._list._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "clicks.list", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.clicks.unique = function(starttime, endtime, startindex) {
    return callWithError(messaging.clicks._unique._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "clicks.unique", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.clicks.unique_count = function(starttime, endtime) {
    return callWithError(messaging.clicks._unique_count._call(messaging, {}, _.defaults({
      starttime: starttime,
      endtime: endtime
    }, {
      apikey: messaging.defaults.apikey
    })), "clicks.unique_count", msgIsOk, extractMsgData, throwMsgMessages);
  };
  messaging.send_mail = crudSendMail();
  messaging.send_mail.create = function(mailObj) {
    return callWithError(messaging.send_mail._create._call(messaging, {}, _.defaults(mailObj, {
      apikey: messaging.defaults.apikey
    })), "send_mail.create", msgIsOk, extractMsgData, throwMsgMessages);
  };
  return dyn;
};

module.exports = Dyn;
