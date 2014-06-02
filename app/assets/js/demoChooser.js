"use strict";

var currentTab = 0;

function display() { 
    updateForTab(currentTab);
    // set up the click listeners.
    $('#teaTimeTab').on('click', function() {
        currentTab = 0;
        updateForTab(currentTab);
    });
    $('#hopeTab').on('click', function() {
        currentTab = 1;
        updateForTab(currentTab);
    });
    $('#plotterTab').on('click', function() {
        currentTab = 2;
        updateForTab(currentTab);
    });
    $('#geotaggerTab').on('click', function() {
        currentTab = 3;
        updateForTab(currentTab);
    });

    $('#all-screen').on(
            'click',
            function() {
                if (currentTab === 0) {
                    control.launchHTML('assets/teatime.html');
                } else if (currentTab === 1) {
                    control.launchHTML('assets/hope.html');
                } else if (currentTab === 2) {
                    control.launchHTML('assets/plotter.html');
                } else if (currentTab === 3) {
                    // Note we're relying on geotagger's list view to be set.
                    control.openTableToListView(
                        'geotagger',
                        null,
                        null,
                        null);
                } else {
                    console.log('trouble, unrecognized tab');
                }
            });
}

function updateForTab(tab) {
    var fileUri;
    var tabItem;
    // Remove all the active-tab classes.
    $('.tab-item').removeClass('active');
    // Now add the current tab to active.
    if (tab === 0) {
        fileUri = control.getFileAsUrl('assets/img/teaBackground.jpg');
        tabItem = $('#teaTimeTab');
    } else if (tab === 1) {
        fileUri = control.getFileAsUrl('/assets/img/hopePic.JPG');
        tabItem = $('#hopeTab');
    } else if (tab === 2) {
        fileUri = control.getFileAsUrl(
                'assets/img/Agriculture_in_Malawi_by_Joachim_Huber_CClicense.jpg');
        tabItem = $('#plotterTab');
    } else if (tab === 3) {
        fileUri = control.getFileAsUrl(
                'assets/img/spaceNeedle_CCLicense_goCardUSA.jpg');
        tabItem = $('#geotaggerTab');
    } else {
        console.log('unrecognized tab index: ' + tab);
    }
    //$('#appImage').attr('src', fileUri);
    $('body').css('background-image', 'url(' + fileUri + ')');
    // Make the tab highlighted as active.
    tabItem.addClass('active');
}
