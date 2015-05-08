/* global alert */
'use strict';

// For the JGI Home Screen, but to be used with browserify.

var db = require('./jgiDb');
var $ = require('jquery');
var util = require('./jgiUtil');
var urls = require('./jgiUrls');
var logging = require('./jgiLogging');

exports.initializeListeners = function(control) {
  var $mostRecentFollow = $('#most-recent-follow-button');
  $mostRecentFollow.click(function() {
    console.log('clicked most recent');
    var follows = db.getAllFollows(control);
    
    if (follows.length === 0) {
      alert('No Follows!');
      return;
    }

    util.sortFollows(follows);

    var mostRecentFollow = follows[follows.length - 1];

    var intervals = db.getFollowIntervalsForFollow(
        control,
        mostRecentFollow.date,
        mostRecentFollow.focalId
    );

    if (intervals.length === 0) {
      alert('No observations yet recorded for the latest Follow');
      return;
    }

    util.sortFollowIntervals(intervals);
    var lastInterval = intervals[intervals.length - 1];

    var queryParams = urls.createParamsForFollow(
        lastInterval.date,
        lastInterval.beginTime,
        lastInterval.focalId
    );

    control.launchHTML('assets/followScreen.html' + queryParams);
  });
};

exports.initializeUi = function(control) {
  logging.initializeClickLogger();

  exports.initializeListeners(control);
};
