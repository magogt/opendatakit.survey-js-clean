'use strict';

/**
 * The models we will use for rows in the database.
 */


/**
 * A follow, which includes a set of timepoints, where each time point has a
 * set of observations about chimps.
 */
exports.Follow = function Follow(
    date,
    beginTime,
    focalId,
    communityId,
    researcher
) {

  if (!(this instanceof Follow)) {
    throw new Error('must use new');
  }
  
  this.date = date;
  this.beginTime = beginTime;
  this.focalId = focalId;
  this.communityId = communityId;
  this.researcher = researcher;

};


/**
 * Represents an interval in a follow. This is essentially a subset of the
 * information pertaining to a particular chimp during the follow. A
 * FollowInterval might represent the time between 7:15 and 7:30 of a
 * particular longer Follow, for instance.
 *
 * In an effort to make this even clearer, this object has been fabricated in
 * order to allow someone to view a list of the timepoints they've seen during
 * their Follow in order to quickly jump between them or resume where they left
 * off in event of an app crash.
 */
exports.FollowInterval = function FollowInterval(
    date,
    beginTime,
    focalId
) {
  if (!(this instanceof FollowInterval)) {
    throw new Error('must use new');
  }

  this.date = date;
  this.beginTime = beginTime;
  this.focalId = focalId;
};


/**
 * The observation of a chimp in the a particular timepoint.
 */
exports.Chimp = function Chimp(
    rowId,
    date,
    followStartTime,
    focalChimpId,
    chimpId,
    time,
    certainty,
    withinFive,
    estrus,
    closest
) {

  if (!(this instanceof Chimp)) {
    throw new Error('must use new');
  }

  // for our model only--can be undefined
  this.rowId = rowId;

  // data that we must set.
  this.date = date;
  this.followStartTime = followStartTime;
  this.focalChimpId = focalChimpId;
  this.chimpId = chimpId;
  this.time = time;
  this.certainty = certainty;
  this.withinFive = withinFive;
  this.estrus = estrus;
  this.closest = closest;

};


/**
 * Create a chimp with the default values. This is ok to represent a chimp that
 * has not been observed at a given timepoint.
 */
exports.createNewChimp = function(
    date,
    followStartTime,
    focalChimpId,
    chimpId
) {
  var defTime = '0';
  var defCertainty = '0';
  var defWithinFive = '0';
  var defEstrus = '0';
  var defClosest = '0';

  // We don't know the row id when we are creating the chimps. We have to get
  // it from the database after writing. This is annoying...maybe we can start
  // creating the row ids and passing them in? TODO
  var rowId = null;

  // We have to be careful here--the new binding might fail since it is owned
  // by the exports object. I forget precisely how this works. If weird stuff
  // is happening, make sure the context object making it to the Chimp
  // constructor is a new object here.
  var result = new exports.Chimp(
      rowId,
      date,
      followStartTime,
      focalChimpId,
      chimpId,
      defTime,
      defCertainty,
      defWithinFive,
      defEstrus,
      defClosest
  );

  return result;

};


/**
 * The observation of a food item.
 */
exports.Food = function Food(
    rowId,
    date,
    focalChimpId,
    startTime,
    endTime,
    foodName,
    foodPartEaten
) {
  if (!(this instanceof Food)) {
    throw new Error('must use new');
  }

  // Can be undefined as long as creating a row for the first time
  this.rowId = rowId;

  this.date = date;
  this.startTime = startTime;
  this.foodName = foodName;
  this.foodPartEaten = foodPartEaten;
  this.endTime = endTime;
  this.focalChimpId = focalChimpId;
};


exports.createNewFood = function(
    date,
    focalChimpId,
    startTime,
    endTime,
    foodName,
    foodPartEaten
) {
  var rowId = null;
  var result = new exports.Food(
      rowId,
      date,
      focalChimpId,
      startTime,
      endTime,
      foodName,
      foodPartEaten
  );
  return result;
};


/**
 * The observation of a species.
 */
exports.Species = function Species(
    rowId,
    date,
    focalChimpId,
    startTime,
    endTime,
    speciesName,
    number
) {
  if (!(this instanceof Species)) {
    throw new Error('must use new');
  }

  this.rowId = rowId;

  this.date = date;
  this.focalChimpId = focalChimpId;
  this.startTime = startTime;
  this.endTime = endTime;
  this.speciesName = speciesName;
  this.number = number;
};


exports.createNewSpecies = function(
    date,
    focalChimpId,
    startTime,
    endTime,
    speciesName,
    number
) {
  var rowId = null;
  var result = new exports.Species(
      rowId,
      date,
      focalChimpId,
      startTime,
      endTime,
      speciesName,
      number
  );
  return result;
};
