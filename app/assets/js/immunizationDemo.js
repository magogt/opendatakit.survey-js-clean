/* global control */
'use strict';

function display() {
    $('#expected-visits').on('click', function() {
        alert('Not yet implemented');
    });

    $('#follow-up').on('click', function() {
        alert('Not yet implemented');
    });
    $('#coverage-rates').on('click', function() {
        alert('Not yet implemented');
    });

    $('#find-record').on('click', function() {
        control.launchHTML('assets/immunizationFindRecord.html');
    });
}
