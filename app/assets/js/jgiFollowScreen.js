/* global control, util, alert */
'use strict';

if (JSON.parse(control.getPlatformInfo()).container === 'Chrome') {
    console.log('Welcome to Tables debugging in Chrome!');
    $.ajax({
        url: control.getFileAsUrl('output/debug/follow_data.json'),
        async: false,  // do it first
        success: function(dataObj) {
            if (dataObj === undefined || dataObj === null) {
                console.log('Could not load data json for table: follow');
            }
            window.data.setBackingObject(dataObj);
        }
    });
}

function display() {

    // We're expecting the follow time to be present as a url parameter,
    // something along the lines of:
    // ?follow_time=07_15
    var followTime = util.getQueryParameter(util.timeKey);

    var followDate = util.getQueryParameter(util.dateKey);
    var focalChimpId = util.getQueryParameter(util.focalChimpKey);

    // These flags correspond to the values of the FA_type_of_certainty column
    // in the follow_arrival table. They don't have a type 2, while we do. This
    // is going to mean "not present", as we're going to have a row per chimp
    // per time point, even if they're not there, just to simplify the logic.
    var flag_chimpPresent = 1;
    var flag_chimpAbsent = 2;

    // These are the suffixes we'll use for the ids of the checkboxes. A whole
    // id would thus consist of something along the lines of:
    // chimpId + present_suffix
    var presentSuffix = '_present';
    var fiveMeterSuffix = '_5m';
    var closestSuffix = '_closest';
    
    var followTimeUserFriendly;
    if (followTime === null) {
        // notify the user if we haven't specified a follow time. This will be
        // only useful for debugging purposes.
        alert('No follow time has been specified!');
        followTimeUserFriendly = 'N/A';
    } else {
        followTimeUserFriendly = followTime.replace('_', ':');
    }

    /**
     * Update the state of the UI to reflect what is stored in the database.
     * I.e. if someone goes back to look at an earlier time, this method will
     * retrieve the existing data and update the checkboxes with the
     * appropriate contents.
     */
    var initUIFromDatabaseForTime = function(time) {
        // First get all the data for the table.
        var tableData = util.getTableDataForTimePoint(
                followDate,
                time,
                focalChimpId);
        for (var i = 0; i < tableData.getCount(); i++) {
            // First get the ids of the chimp. These are stored in the
            // FA_B_arr_AnimID column.
            var id = tableData.getData(i, 'FA_B_arr_AnimID');
            // The "present" checkbox id is the combination of the id and the
            // suffix defined above.
            var presentCheckboxId = id + presentSuffix;
            var checkbox = $('#' + presentCheckboxId);
            var valueOfPresent = tableData.getData(i, 'FA_type_of_certainty');
            if (valueOfPresent !== undefined && valueOfPresent !== '') {
                valueOfPresent = parseInt(valueOfPresent);
            }
            if (valueOfPresent === flag_chimpPresent) {
                checkbox.prop('checked', true);
            } else {
                checkbox.prop('checked', false);
            }
        }

    };

    var isNewTimePoint = function(time) {
        // just query for any rows in the db. This is an extra call that we
        // might be able to cache the results of if performance is bad
        var tableData = util.getTableDataForTimePoint(
                followDate,
                time,
                focalChimpId);
        return tableData.getCount() === 0;
    };

    // The way we interact with the database can lead to a bit of wonkiness
    // here. Essentially, we want to be able to update rows, but to do that we
    // need their row ids. We're going to do a query once to get all the data
    // at this time point and build the row ids out of that to try and speed
    // things up.
    /**
     * Create an object that serves as a cache for the row id for each chimp.
     * Row ids will be stored keyed against the chimp id.
     */
    var createIdCache = function() {
        var tableData = util.getTableDataForTimePoint(
                followDate,
                followTime,
                focalChimpId);
        var result = {};
        for (var i = 0; i < tableData.getCount(); i++) {
            var chimpId = tableData.getData(i, 'FA_B_arr_AnimID');
            var rowId = tableData.getRowId(i);
            result[chimpId] = rowId;
        }
        return result;
    };

    var updateOlderMenu = function() {

        var dropdownMenu = $('#older-items-menu');
        // Remove any older items that are somehow hanging around. This
        // should always be unnecessary, I think.
        dropdownMenu.empty();
        
        // First, get the older times.
        var existingTimes = util.getExistingTimesForDate(
                followDate,
                focalChimpId);

        console.log('existing timepoints: ' + existingTimes);

        var baseUrl = 'assets/followScreen.html';

        // handle the case where there are no timepoints yet.
        if (existingTimes.length === 0) {
            var noTimesItem = $('<li>').eq(0);
            // we also need to create an anchor to get bootstrap to style the
            // item correctly
            var anchor = $('<a>');
            anchor.prop('href', '#');  // we don't want it to go anywhere
            anchor.html('No Other Time Points');
            noTimesItem.append(anchor);
            dropdownMenu.append(noTimesItem);
            return;
        }

        for (var i = 0; i < existingTimes.length; i++) {
            var olderFollowTime = existingTimes[i];
            // The url these will launch is ths jgiFollowScreen plus the query
            // parameters defining the unique moment (date, time, and chimp).
            var queryString = util.getKeysToAppendToURL(
                    followDate,
                    olderFollowTime,
                    focalChimpId);
            var anchor = $('<a>');
            //anchor.prop('href', control.getFileAsUrl(baseUrl + queryString));
            anchor.html(olderFollowTime);
            // Ok, and now yet another annoyance of dealing with the current
            // setup. We can't let the links launch themselves, as this
            // wouldn't inject the correct objects. We need to launch the page
            // using our own method.
            // Note that weirdness of adding the click handler in a closure is
            // due to the way that javascript scope works--it only has function
            // scope, so without the closure we only ever call the last value,
            // which obviously isn't correct. Assigning the correct query
            // string in the closure solves this.
            (function(queryStr) {
                anchor.on('click', function() {
                    control.launchHTML(baseUrl + queryStr);
                });
            })(queryString);
            //anchor.on('click', function() {
                //control.launchHTML(baseUrl + queryString);
            //});
            var menuItem = $('<li>');
            menuItem.append(anchor);
            
            // And now append the menu item.
            dropdownMenu.append(menuItem);
        }
    };

    /**
     * Annoyingly, js has an 'insertBefore' but not an 'insertAfter' function.
     * Why, I could not begin to explain. Maybe because you can do something
     * like this, but still, that's no reason at all.
     *
     * This method came from:
     * http://stackoverflow.com/questions/4793604/how-to-do-insert-after-in-javascript-without-using-a-library
     */
    var insertAfter = function(newNode, node) {
        node.parentNode.insertBefore(newNode, node.nextSibling);
    };

    /**
     * Add the requesite checkboxes for the chimps.
     */
    var appendCheckBoxes = function(chimpTDArray) {
        // We're assuming that we have three checkboxes each, in the order:
        // present, within five meters, closest to primary chimp
        for (var i = 0; i < chimpTDArray.length; i++) {
            var chimpNode = chimpTDArray[i];
            var chimpId = chimpNode.id;

            // make the td elements. I don't remember having to do [0] in the
            // past, but apparently you usually do. Hmm.
            var presentTD = $('<td>')[0];
            var fiveMetersTD = $('<td>')[0];
            var closestTD = $('<td>')[0];

            // The checkboxes that will go in each row.
            var presentCB =
                $('<input type="checkbox" class="present-checkbox">')[0];
            var fiveMetersCB = $('<input type="checkbox">')[0];
            var closestCB = $('<input type="checkbox">')[0];

            // Set the ids so we can retrieve and save the data later.
            presentCB.id = chimpId + presentSuffix;
            fiveMetersCB.id = chimpId + fiveMeterSuffix;
            closestCB.id = chimpId + closestSuffix;

            // Add the checkboxes to the td elements.
            presentTD.appendChild(presentCB);
            fiveMetersTD.appendChild(fiveMetersCB);
            closestTD.appendChild(closestCB);

            // And then add the td to the table.
            insertAfter(closestTD, chimpNode);
            insertAfter(fiveMetersTD, chimpNode);
            insertAfter(presentTD, chimpNode);
        }
    };

    var getMaleChimps = function() {
        // We've defined the male chimps by giving them the
        // class 'male-chimp'. Selectors use '.class', so we'll find them and
        // append three checkboxes to each.
        var result = $('.male-chimp');
        return result;
    };

    var getFemaleChimps = function() {
        var result = $('.female-chimp');
        return result;
    };


    /**
     * Update the contents of the database based on the state of the UI.
     * Creates rows, does not update rows.
     */
    var initDatabaseFromUI = function() {
        // Update the database with the contents of the boxes that are
        // checked. This is complicated slightly by the fact that the database
        // structure we currently have doesn't match perfectly with the way
        // we'd ideally be doing this. We'll make a best pass.

        // First, get all the chimps. This means the male chimps and the female
        // chimps.
        var maleChimps = getMaleChimps();
        var femaleChimps = getFemaleChimps();
        
        var allChimps = maleChimps.toArray().concat(femaleChimps.toArray());
        
        for (var i = 0; i < allChimps.length; i++) {
            var chimp = allChimps[i];
            var chimpId = chimp.id;
            var presentCheckbox = $('#' + chimpId + presentSuffix);
            var isChecked = presentCheckbox.prop('checked');
            writeRowForChimp(false, null, chimpId, isChecked);
        }
    };

    /**
     * Update the row for the given chimp. As we start persisting more data
     * this function should grow.
     *
     * isUpdate is true if we are updating the database rather than writing a
     * new row. If true, rowId cannot be null. If false, rowId is ignored.
     */
    var writeRowForChimp = function(isUpdate, rowId, chimpId, isPresent) {
        var struct = {};
        // JGI wanted three checkboxes. However, it isn't obvious to me how
        // we'll be persisting those checkboxes. So, let's just use the 
        // 'present' checkbox and persist a row if they are there.
        // We're also going to be using the FA_type_of_certainty column to
        // indicate the state of the chimp. They have in the data tables
        // document that 1 is chimp definitely seen, 0 is expected to be
        // nearby. We're also going to say 2 is not present.
        struct['FA_FOL_date'] = followDate;
        struct['FA_FOL_B_focal_AnimID'] = focalChimpId;
        struct['FA_B_arr_AnimID'] = chimpId;
        struct['FA_time_start'] = followTime;
        if (isPresent) {
            struct['FA_type_of_certainty'] = flag_chimpPresent;
        } else {
            struct['FA_type_of_certainty'] = flag_chimpAbsent;
        }
        var stringified = JSON.stringify(struct);
        if (isUpdate) {
            control.updateRow('follow_arrival', stringified, rowId);
        } else {
            control.addRow('follow_arrival', stringified);
        }
    };


    /**
     * Increment the time for the next interval. time is expected to be of the
     * format hh:mm. Returns the next time point, accounting for minute
     * overflows. Does NOT consider hour overflows.
     */
    var incrementTime = function(time) {
        var interval = 15;
        var parts = time.split(':');
        var hours = parseInt(parts[0]);
        var mins = parseInt(parts[1]);
        var maybeTooLarge = mins + interval;

        if (maybeTooLarge > 59) {
            // then we've overflowed our time system.
            mins = maybeTooLarge % 60;
            // Don't worry about overflowing hours. Not going to worry about
            // late night chimp monitoring.
            hours = hours + 1;
        } else {
            mins = maybeTooLarge;
        }

        // Format these strings to be two digits.
        var hoursStr = convertToStringWithTwoZeros(hours);
        var minsStr = convertToStringWithTwoZeros(mins);
        var result = hoursStr + ':' + minsStr;
        return result;
    };

    /**
     * Take an integer and return a correctly formatted string--i.e. one with
     * two zeros.
     */
    var convertToStringWithTwoZeros = function(time) {
        var result;
        if (time < 10) {
            result = '0' + time;
        } else {
            result = time.toString();
        }
        return result;
    };

    /**
     * Get the time point for the interval before this one. Does NOT consider
     * hour overflows/underflows (if an underflow is when it goes below 0...
     */
    var decrementTime = function(time) {
        var interval = 15;
        var parts = time.split(':');
        var hours = parseInt(parts[0]);
        var mins = parseInt(parts[1]);
        var maybeTooSmall = mins - interval;

        if (maybeTooSmall < 0) {
            mins = maybeTooSmall % 60 * -1;
            hours = hours - 1;
        } else {
            mins = maybeTooSmall;
        }

        // Format these strings to be two digits.
        var minsStr = convertToStringWithTwoZeros(mins);
        var hoursStr = convertToStringWithTwoZeros(hours);
        var result = hoursStr + ':' + minsStr;
        return result;
    };

    /**
     * Set up the ui to show the focal chimp.
     */
    var initUIForFocalChimp = function() {
        // There are four items pertaining to the focal chimp:
        // its id, present, 5m, and closest.
        // we are going to hide the three checkboxes and create a new td
        // spanning its space saying "Focal"
        var present = $('#' + focalChimpId + presentSuffix);
        var fiveMeters = $('#' + focalChimpId + fiveMeterSuffix);
        var closest = $('#' + focalChimpId + closestSuffix);
        
        // We have selected the inputs, but we actually need to remove their
        // parents to keep the correct number of td elements.
        present.parent().remove();
        fiveMeters.parent().remove();
        closest.parent().remove();

        // Now add the new element.
        var focalTd = $('<td colspan=3 class="focal-label">');
        focalTd.html('Focal');
        var chimp = $('#' + focalChimpId)[0];
        // we're passing the first element because we want the HTML object, not
        // the jquery object.
        insertAfter(focalTd[0], chimp);

        // and assign the focal-chimp class to the chimp.
        $('#' + focalChimpId).addClass('focal-chimp');
    };

    /*****  end function declaractions  *****/

    // First we'll add the dynamic UI elements.
    // First get all the male chimps
    var maleChimps = getMaleChimps();
    appendCheckBoxes(maleChimps);

    // and now take care of the ladies.
    var femaleChimps = getFemaleChimps();
    appendCheckBoxes(femaleChimps);

    // Now handle the first pass of the screen.
    if (isNewTimePoint(followTime)) {
        // Might have to update the UI from the previous time point.
        // We'll do this if the previous time exists.
        var previousTime = decrementTime(followTime);
        if (!isNewTimePoint(previousTime)) {
            initUIFromDatabaseForTime(previousTime);
            // And now generate entries for all the rows. This will also
            // establish a row for every chimp, which is important for our
            // assumptions down the line.
            initDatabaseFromUI();
        } else {
            // Then all the checkboxes are empty. We'll generate a row for
            // every chimp with this call, which is important for establishing
            // the invariants we're going to use later.
            initDatabaseFromUI();
        }
    } else {
        // We're returning to an existing timepoint, so update the UI to
        // reflect this.
        initUIFromDatabaseForTime(followTime);
    }

    var rowIdCache = createIdCache();

    $('#time-label').eq(0).html(followTimeUserFriendly);

    updateOlderMenu();
    initUIForFocalChimp();


    // Now we'll attach a click listener that rights the state of the checkbox
    // into the database. Note that for now we're only using the present
    // checkboxes, as those are the only ones we're bothering to persist atm
    // until we get a better sense of the database schema.
    $('.present-checkbox').on('click', function() {
        // Get the id of the chimp this box is associated with. Note that the
        // id of the checkbox is the chimp's id + presentSuffix, so we can
        // reclaim the chimp id without issue.
        var indexOfSuffix = this.id.indexOf(presentSuffix);
        var chimpId = this.id.substr(0, indexOfSuffix);
        // now we have the chimp id. Now we need the id of the row for this
        // chimp, which we've cached above.
        var rowId = rowIdCache[chimpId];
        // log it for a sanity check
        console.log('clicked chimp id: ' + chimpId + ' with row id: ' + rowId);
        // And now write the value into the database.
        var isChecked = this.checked;
        writeRowForChimp(true, rowId, chimpId, isChecked);
    });

    // We also want a click listener on each of the chimp names, which will
    // mark that it is closest to the active chimp.
    $('.chimp').on('click', function() {
        var chimp = $(this);
        if (chimp.hasClass('focal-chimp')) {
            // do nothing
            return;
        }
        if (chimp.hasClass('closest-chimp')){ 
            chimp.removeClass('closest-chimp');
        } else {
            // We want to eliminate the closest-chimp class on anything else
            // that has it, lest we end up with two active chimps.
            $('.closest-chimp').removeClass('closest-chimp');
            chimp.addClass('closest-chimp');
        }
    });

    $('#next-button').on('click', function() {
        console.log('clicked next');

        // And now launch the next screen
        var nextTime = incrementTime(followTime);

        var queryString = util.getKeysToAppendToURL(
            followDate,
            nextTime,
            focalChimpId);
        control.launchHTML('assets/followScreen.html' + queryString);

    });

}
