'use strict';
// TODO: Instance level: locale (used), at Table level: locales (available), formPath, 
define(['mdl','opendatakit','jquery'], function(mdl,opendatakit,$) {
    return {
  submissionDb:false,
		// maps of:
		//   dbColumnName : { 
		//		type: databaseType, 
		// 		isNotNullable: false/true, 
		//		isPersisted: false/true,
		//      'default': defaultValue,
		//      elementPath: exposedName }
		// 
		// elementPath is the inversion of the property name and model's value name.
		// if elementPath is null, then the entry is not exposed above the database layer.
		// i.e., it is not settable/gettable via Javascript used in prompts.
		// This is used for bookkeeping columns (e.g., server sync, save status).
		//
  dataTablePredefinedColumns: { _id: {type: 'string', isNotNullable: true, isPersisted: true, dbColumnConstraint: 'PRIMARY KEY', elementSet: 'instanceMetadata' },
					 _uri_user: { type: 'string', isNotNullable: false, isPersisted: true, elementSet: 'instanceMetadata' },
                     _last_mod_time: { type: 'integer', isNotNullable: true, 'default': -1, isPersisted: true, elementSet: 'instanceMetadata' },
                     _sync_tag: { type: 'string', isNotNullable: false, isPersisted: true, elementSet: 'instanceMetadata' },
                     _sync_state: { type: 'integer', isNotNullable: true, 'default': 0, isPersisted: true, elementSet: 'instanceMetadata' },
                     _transactioning: { type: 'integer', isNotNullable: true, 'default': 1, isPersisted: true, elementSet: 'instanceMetadata' },
                     _timestamp: { type: 'integer', isNotNullable: true, isPersisted: true, elementSet: 'instanceMetadata' },
                     _saved: { type: 'string', isNotNullable: false, isPersisted: true, elementSet: 'instanceMetadata' },
                     _instance_name: { type: 'string', isNotNullable: true, isPersisted: true, elementPath: 'instanceName', elementSet: 'instanceMetadata' },
                     _locale: { type: 'string', isNotNullable: false, isPersisted: true, elementPath: 'locale', elementSet: 'instanceMetadata' } },
  tableDefinitionsPredefinedColumns: {
					table_id: { type: 'string', isNotNullable: true, isPersisted: true, dbColumnConstraint: 'PRIMARY KEY', elementPath: 'tableId', elementSet: 'tableMetadata' },
					table_key: { type: 'string', isNotNullable: true, isPersisted: true, dbColumnConstraint: 'UNIQUE', elementPath: 'tableKey', elementSet: 'tableMetadata' },
					db_table_name: { type: 'string', isNotNullable: true, isPersisted: true, dbColumnConstraint: 'UNIQUE', elementPath: 'dbTableName', elementSet: 'tableMetadata' },
					type: { type: 'string', isNotNullable: true, isPersisted: true, elementSet: 'tableMetadata' },
					table_id_access_controls: { type: 'string', isNotNullable: false, isPersisted: true, elementSet: 'tableMetadata' },
					sync_tag: { type: 'string', isNotNullable: false, isPersisted: true, elementSet: 'tableMetadata' },
					last_sync_time: { type: 'integer', isNotNullable: true, isPersisted: true, elementSet: 'tableMetadata' },
					sync_state: { type: 'string', isNotNullable: true, isPersisted: true, elementSet: 'tableMetadata' },
					transactioning: { type: 'integer', isNotNullable: true, isPersisted: true, elementSet: 'tableMetadata' } },
  columnDefinitionsTableConstraint: 'PRIMARY KEY ( "table_id", "element_key" )',
  columnDefinitionsPredefinedColumns: {
					table_id: { type: 'string', isNotNullable: true, isPersisted: true, elementPath: 'tableId', elementSet: 'columnMetadata' },
					element_key: { type: 'string', isNotNullable: true, isPersisted: true, elementPath: 'elementKey', elementSet: 'columnMetadata' },
					element_name: { type: 'string', isNotNullable: true, isPersisted: true, elementPath: 'elementName', elementSet: 'columnMetadata' },
					element_type: { type: 'string', isNotNullable: false, isPersisted: true, elementSet: 'columnMetadata' },
					list_child_element_keys: { type: 'array', items: { type: 'string' }, isNotNullable: false, isPersisted: true, elementSet: 'columnMetadata' },
					is_persisted: { type: 'integer', isNotNullable: true, isPersisted: true, elementSet: 'columnMetadata' },
					joins: { type: 'array', items: {
								type: 'object', 
								listChildElementKeys: [],
								properties: {
									"table_id": { type: "string", isNotNullable: false, isPersisted: false, elementKey: 'tableId', elementSet: 'columnMetadata' },
									"element_key": { type: "string", isNotNullable: false, isPersisted: false, elementKey: 'elementKey', elementSet: 'columnMetadata' } } },
							isNotNullable: false, isPersisted: true, elementPath: 'joins', elementSet: 'columnMetadata' } },
  // key value stores are fairly straightforward...
  tableKeyValueStoreActiveTableConstraint: 'PRIMARY KEY ("table_id", "key")',
  tableKeyValueStoreActivePredefinedColumns: {
					table_id: { type: 'string', isNotNullable: true, isPersisted: true },
					key: { type: 'string', isNotNullable: true, isPersisted: true },
					type: { type: 'string', isNotNullable: false, isPersisted: true },
					value: { type: 'string', isNotNullable: false, isPersisted: true } },
   tableKeyValueStoreActiveAccessibleKeys: {
			// keys we are allowing the user to access from within Javascript
			// mapped as psuedo-columns per PredefinedColumns objects, above.
			// propertyName is the value of the 'key' in the database.
	},
   columnKeyValueStoreActiveTableConstraint: 'PRIMARY KEY ("table_id", "element_key", "key")',
   columnKeyValueStoreActivePredefinedColumns: {
					table_id: { type: 'string', isNotNullable: true, isPersisted: true },
					element_key: { type: 'string', isNotNullable: true, isPersisted: true },
					key: { type: 'string', isNotNullable: true, isPersisted: true },
					type: { type: 'string', isNotNullable: false, isPersisted: true },
					value: { type: 'string', isNotNullable: false, isPersisted: true } },
   columnKeyValueStoreActiveAccessibleKeys: {
			// keys we are allowing the user to access from within Javascript
			// mapped as psuedo-columns per PredefinedColumns objects, above.
			// propertyName is the value of the 'key' in the database.
 	},
	_createTableStmt: function( dbTableName, kvMap, tableConstraint ) {
		// TODO: verify that dbTableName is not already in use...
		var createTableCmd = 'CREATE TABLE IF NOT EXISTS "' + dbTableName + '"(';
		var comma = '';
		for ( var dbColumnName in kvMap ) {
			var f = kvMap[dbColumnName];
			if ( f.isPersisted ) {
				createTableCmd += comma + dbColumnName + " ";
				comma = ',';
				if ( f.type == "string" ) {
					createTableCmd += "TEXT" + (f.isNotNullable ? " NOT NULL" : " NULL");
				} else if ( f.type == "integer" ) {
					createTableCmd += "INTEGER" + (f.isNotNullable ? " NOT NULL" : " NULL");
				} else if ( f.type == "number" ) {
					createTableCmd += "REAL" + (f.isNotNullable ? " NOT NULL" : " NULL");
				} else if ( f.type == "boolean" ) {
					createTableCmd += "INTEGER" + (f.isNotNullable ? " NOT NULL" : " NULL");
				} else if ( f.type == "object" ) {
					createTableCmd += "TEXT" + (f.isNotNullable ? " NOT NULL" : " NULL");
				} else if ( f.type == "array" ) {
					createTableCmd += "TEXT" + (f.isNotNullable ? " NOT NULL" : " NULL");
				} else {
					throw new Error("unhandled type: " + f.type);
				}
			}
		}
		if ( tableConstraint != null ) {
			createTableCmd += comma + tableConstraint + " ";
		}
		createTableCmd += ');';
		return  {
			stmt : createTableCmd,
			bind : []
		};
	},
	_fromDatabaseToElementType: function( jsonType, value ) {
		var that = this;
		// date conversion elements...
		var yyyy, mm, dd, hh, min, sec, msec, zsign, zhh, zmm;

		if ( value == null ) {
			if ( jsonType.isNotNullable ) {
				throw new Error("unexpected null value for non-nullable field");
			}
			return null;
		}
		
		if ( jsonType.type == 'array' ) {
			value = JSON.parse(value);
			// TODO: ensure object spec conformance on read?
			return value;
		} else if ( jsonType.type == 'object' ) {
			if ( jsonType.elementType == 'date' ||
				 jsonType.elementType == 'dateTime' ) {
				// convert an iso8601 date yyyymmddTHH:MM:SS.ssszzzzz 
				// to a Date object...
				// TODO: FIX FRAGILE: loss of timezone info
				yyyy = Number(value.substr(0,4));
				mm = Number(value.substr(4,2))-1;// months are 0-11
				dd = Number(value.substr(6,2));
				hh = Number(value.substr(9,2));
				min = Number(value.substr(12,2));
				sec = Number(value.substr(15,2));
				msec = Number(value.substr(18,3));
				zsign = value.substr(21,1);
				zhh = Number(value.substr(22,2));
				zmm = Number(value.substr(24,2));
				value = new Date(Date.UTC(yyyy,mm,dd,hh,min,sec,msec));
				return value;
			} else if ( jsonType.elementType == 'time' ) {
				// convert an iso8601 time HH:MM:SS.ssszzzzz to a Date object...
				// TODO: FIX FRAGILE: loss of timezone info
				var idx = value.indexOf(':');
				hh = Number(value.substring(0,idx));
				min = Number(value.substr(idx+1,2));
				sec = Number(value.substr(idx+3,2));
				msec = Number(value.substr(idx+6,3));
				zsign = value.substr(idx+10,1);
				zhh = Number(value.substr(idx+11,2));
				zmm = Number(value.substr(idx+13,2));
				value = new Date(Date.UTC(0,0,0,hh,min,sec,msec));
				return value;
			} else {
				value = JSON.parse(value);
				return value;
			}
		} else if ( jsonType.type == 'boolean' ) {
			return Boolean(value); // make it a boolean
		} else if ( jsonType.type == 'integer' ) {
			value = Number(value);
			if ( Math.round(value) != value ) {
				throw new Error("non-integer value for integer type");
			}
			return value;
		} else if ( jsonType.type == 'number' ) {
			return Number(value);
		} else if ( jsonType.type == 'string' ) {
			return '' + value;
		} else {
			throw new Error("unrecognized JSON schema type");
		}
	},
	_padWithLeadingZeros: function( value, places ) {
		var digits = [];
		var d, i, s;
		var sign = (value >= 0);
		value = Math.abs(value);
		while ( value != 0 ) {
			d = (value % 10);
			digits.push(d);
			value = Math.floor(value/10);
		}
		while ( digits.length < places ) {
			digits.push(0);
		}
		digits.reverse();
		s = '';
		for ( i = 0 ; i < digits.length ; ++i ) {
			d = digits[i];
			s += d;
		}
		return (sign ? '' : '-') + s;
	},
	_toDatabaseFromElementType: function( jsonType, value ) {
		var that = this;
		var refined;
		var itemType;
		var item;
		var itemValue;
		// date conversion elements...
		var yyyy, mm, dd, hh, min, sec, msec, zsign, zhh, zmm;

		if ( value == null ) {
			if ( jsontype.isNotNullable ) {
				throw new Error("unexpected null value for non-nullable field");
			}
			return null;
		}
		
		if ( jsonType.type == 'array' ) {
			// ensure that it is an array of the appropriate type...
			if ( value instanceof Array ) {
				refined = [];
				itemType = jsonType.items;
				for ( item in value ) {
					itemValue = that._toDatabaseFromElementType( itemType, item );
					refined.push(itemValue);
				}
				value = JSON.stringify(refined);
			} else {
				throw new Error("unexpected non-array value");
			}
			return value;
		} else if ( jsonType.type == 'object' ) {
			if ( jsonType.elementType == 'dateTime' ||
				 jsonType.elementType == 'date' ) {

				yyyy = value.getUTCFullYear();
				mm = value.getUTCMonth() + 1; // months are 0-11
				dd = value.getUTCDate();
				hh = value.getUTCHours();
				min = value.getUTCMinutes();
				sec = value.getUTCSeconds();
				msec = value.getUTCMilliseconds();
				zsign = 'Z';
				zhh = '';
				zmm = '';
				value = that._padWithLeadingZeros(yyyy,4) + 
						that._padWithLeadingZeros(mm,2) +
						that._padWithLeadingZeros(dd,2) + 'T' +
						that._padWithLeadingZeros(hh,2) + ':' +
						that._padWithLeadingZeros(min,2) + ':' +
						that._padWithLeadingZeros(sec,2) + '.' +
						that._padWithLeadingZeros(msec,3) + 'Z';
				return value;
			} else if ( jsonType.elementType == 'time' ) {
				yyyy = value.getUTCFullYear();
				mm = value.getUTCMonth(); // months are 0-11
				if ( mm != 0 || yyyy != 1970 ) {
					throw new Error("time value is not based upon Jan 1, 1970");
				}
				// TODO: this is broken w.r.t. leap years
				dd = value.getUTCDate();
				hh = value.getUTCHours() + 24*(dd);
				min = value.getUTCMinutes();
				sec = value.getUTCSeconds();
				msec = value.getUTCMilliseconds();
				zsign = 'Z';
				zhh = '';
				zmm = '';
				value = that._padWithLeadingZeros(hh,2) + ':' +
						that._padWithLeadingZeros(min,2) + ':' +
						that._padWithLeadingZeros(sec,2) + '.' +
						that._padWithLeadingZeros(msec,3) + 'Z';
				return value;
			} else if ( !jsonType.properties ) {
				// this is an opaque BLOB w.r.t. database layer
				return JSON.stringify(value);
			} else {
				// otherwise, enforce spec conformance...
				// Only values in the properties list, and those
				// must match the type definitions recursively.
				refined = {};
				for ( item in jsonType.properties ) {
					if ( value[item] != null ) {
						itemType = jsonType.properties[item];
						itemValue = that._toDatabaseFromElementType(itemType, value[item]);
						if ( itemValue != null ) {
							refined[item] = itemValue;
						}
					}
				}
				value = JSON.stringify(refined);
				return value;
			}
		} else if ( jsonType.type == 'boolean' ) {
			return (value ? '1' : '0'); // make it a boolean
		} else if ( jsonType.type == 'integer' ) {
			value = '' + Math.round(value);
			return value;
		} else if ( jsonType.type == 'number' ) {
			return '' + value;
		} else if ( jsonType.type == 'string' ) {
			return '' + value;
		} else {
			throw new Error("unrecognized JSON schema type");
		}
	},
	_reconstructElementPath: function(elementPath, jsonType, dbValue, topLevelObject) {
		var value = this._fromDatabaseToElementType( jsonType, dbValue );
		var path = elementPath.split('.');
		var e = topLevelObject;
		var term;
		for (var j = 0 ; j < path.length-1 ; ++j) {
			term = path[j];
			if ( term == null || term == "" ) {
				throw new Error("unexpected empty string in dot-separated variable name");
			}
			if ( e[term] == null ) {
				e[term] = {};
			}
			e = e[term];
		}
		term = path[path.length-1];
		if ( term == null || term == "" ) {
			throw new Error("unexpected empty string in dot-separated variable name");
		}
		e[term] = value;
	},
  withDb:function(ctxt, transactionBody) {
    var inContinuation = false;
    ctxt.append('database.withDb');
	ctxt.sqlStatement = null;
    var that = this;
    try {
        if ( that.submissionDb ) {
            that.submissionDb.transaction(transactionBody, function(error,a) {
					if ( ctxt.sqlStatement != null ) {
						ctxt.append("withDb.transaction.error.sqlStmt", ctxt.sqlStatement.stmt);
					}
                    ctxt.append("withDb.transaction.error", error.message);
                    ctxt.append("withDb.transaction.error.transactionBody", transactionBody.toString());
                    inContinuation = true;
                    ctxt.failure({message: "Error while accessing or saving values to the database."});
                    }, function() {
                        ctxt.append("withDb.transaction.success");
                        inContinuation = true;
                        ctxt.success();
                    });
        } else if(!window.openDatabase) {
            ctxt.append('database.withDb.notSupported');
            console.error('w3c SQL interface is not supported');
            inContinuation = true;
            ctxt.failure({message: "Web client does not support the W3C SQL database standard."});
        } else {
            var settings = opendatakit.getDatabaseSettings(ctxt);
            var database = openDatabase(settings.shortName, settings.version, settings.displayName, settings.maxSize);
              // create the database...
            database.transaction(function(transaction) {
					var td;
					td = that._createTableStmt('_column_key_value_store_active', 
												that.columnKeyValueStoreActivePredefinedColumns,
												that.columnKeyValueStoreActiveTableConstraint);
					ctxt.sqlStatement = td;
                    transaction.executeSql(td.stmt, td.bind);
					td = that._createTableStmt('_column_definitions', 
												that.columnDefinitionsPredefinedColumns,
												that.columnDefinitionsTableConstraint );
                    ctxt.sqlStatement = td;
                    transaction.executeSql(td.stmt, td.bind);
					td = that._createTableStmt('_table_key_value_store_active', 
												that.tableKeyValueStoreActivePredefinedColumns,
												that.tableKeyValueStoreActiveTableConstraint );
                    ctxt.sqlStatement = td;
                    transaction.executeSql(td.stmt, td.bind);
					td = that._createTableStmt('_table_definitions', 
												that.tableDefinitionsPredefinedColumns);
                    ctxt.sqlStatement = td;
                    transaction.executeSql(td.stmt, td.bind);
                }, function(error) {
					if ( ctxt.sqlStatement != null ) {
						ctxt.append("withDb.createDb.transaction.error.sqlStmt", ctxt.sqlStatement.stmt);
					}
                    ctxt.append("withDb.createDb.transaction.error", error.message);
                    ctxt.append("withDb.createDb.transaction.error.transactionBody", "initializing database tables");
                    inContinuation = true;
                    ctxt.failure({message: "Error while initializing database tables."});
                }, function() {
                    // DB is created -- record the submissionDb and initiate the transaction...
                    that.submissionDb = database;
                    ctxt.append("withDb.createDb.transacton.success");
                    that.submissionDb.transaction(transactionBody, function(error) {
								if ( ctxt.sqlStatement != null ) {
									ctxt.append("withDb.afterCreateDb.transaction.error.sqlStmt", ctxt.sqlStatement.stmt);
								}
                                ctxt.append("withDb.afterCreateDb.transaction.error", error.message);
                                ctxt.append("withDb.afterCreateDb.transaction.error.transactionBody", transactionBody.toString());
                                inContinuation = true;
                                ctxt.failure({message: "Error while accessing or saving values to the database."});
                            }, function() {
                                ctxt.append("withDb.afterCreateDb.transaction.success");
                                inContinuation = true;
                                ctxt.success();
                            });
                });
        }
    } catch(e) {
        // Error handling code goes here.
		if ( ctxt.sqlStatement != null ) {
			ctxt.append("withDb.exception.sqlStmt", ctxt.sqlStatement.stmt);
		}
        if(e.INVALID_STATE_ERR) {
            // Version number mismatch.
            ctxt.append('withDb.exception', 'invalid db version');
            console.error("Invalid database version.");
        } else {
            ctxt.append('withDb.exception', 'unknown error: ' + e);
            console.error("Unknown error " + e + ".");
        }
        if ( !inContinuation ) {
            try {
                ctxt.failure({message: "Exception while accessing or saving values to the database."});
            } catch(e) {
                ctxt.append('withDb.ctxt.failure.exception', 'unknown error: ' + e);
                console.error("withDb.ctxt.failure.exception " + e);
            }
        } else {
			console.error("Unrecoverable Internal Error: Exception during success/failure continuation");
		}
        return;
    }
},
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
//   DATA TABLE DATA
//   DATA TABLE DATA
//   DATA TABLE DATA
//   DATA TABLE DATA
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
// Records in the data table are always inserted.
// Metadata columns are indicated by a leading underscore in the name.
// 
// The _saved (metadata) column == "COMPLETE" if they are 'official' values.
// Otherwise, _saved == "INCOMPLETE" indicates a manual user savepoint and
// _saved IS NULL indicates an automatic savepoint. The _timestamp indicates
// the time at which the savepoint occured.

/**
 * get the contents of the active data table row for a given instanceId
 *
 * Requires: no globals
 */
_selectAllFromDataTableStmt:function(dbTableName, instanceId) {
    var stmt = 'select * from "' + dbTableName + '" where _id=? group by _id having _timestamp = max(_timestamp)'; 
    return {
        stmt : stmt,
        bind : [instanceId]
    };
},

/**
 * get the most recent 'COMPLETE' contents of the active data table row for a given instanceId
 * If the row is currently being edited, this will display the last 'COMPLETE' old value.
 *
 * If supplied, the selection filter is applied to the returned set of 'COMPLETE' entries.
 * This query is used for cascading select statements
 *
 * Requires: no globals
 */
_selectAllCompleteFromDataTableStmt:function(dbTableName, selection, selectionArgs) {
	if ( selection != null ) {
		var args = ['COMPLETE'];
		if ( selectionArgs != null ) {
			args = args.concat(selectionArgs);
		}
		return {
				stmt : 'select * from (select * from "' + dbTableName +
						'" where _saved=?  group by _id having _timestamp = max(_timestamp)) where ' + selection,
				bind : args
			};
	} else {
		return {
				stmt : 'select * from "' + dbTableName + '" where _saved=? group by _id having _timestamp = max(_timestamp)',
				bind : ['COMPLETE']    
			};
	}
},
selectMostRecentFromDataTableStmt:function(dbTableName, selection, selectionArgs) {
	if ( selection != null ) {
		return {
				stmt :  'select * from (select * from "' + dbTableName +
						'" group by _id having _timestamp = max(_timestamp)) where ' + selection,
				bind : selectionArgs
			};
	} else {
		return {
				stmt : 'select * from "' + dbTableName + '" group by _id having _timestamp = max(_timestamp)',
				bind : []    
			};
	}
},
/**
 * insert a new automatic savepoint for the given record and change the 
 * database columns (including instance metadata columns) specified in the kvMap.
 * Also used to set a manual savepoint when the kvMap specifies the '_saved' 
 * instance metadata value (not accessible to external users).
 *
 * kvMap : { 'columnName' : { value: "foo name", isInstanceMetadata: false } ...}
 *
 * Assumes: all complex values are already reduced to its persisted column set.
 *
 * Requires: No global dependencies
 */
_insertKeyValueMapDataTableStmt:function(dbTableName, dataTableModel, instanceId, kvMap) {
    var t = new Date();
    var now = t.getTime();
    
    var bindings = [];
	var processSet = {};
	
	var j, f, defElement, kvElement, v;
	var comma = '';
	
    var stmt = 'insert into "' + dbTableName + '" (';
    for ( f in dataTableModel ) {
		defElement = dataTableModel[f];
		if ( defElement.isPersisted ) {
			stmt += comma;
			comma = ', ';
			stmt += '"' + f + '"';
		}
    }
    stmt += ") select _id";
	comma = '';
    for (f in dataTableModel) {
		defElement = dataTableModel[f];
		if ( defElement.isPersisted ) {
			stmt += comma;
			comma = ', ';
			kvElement = kvMap[f];
			if ( kvElement != null ) {
				// track that we matched the keyname...
				processSet[f] = true;
				if (kvElement.value == null) {
					stmt += "null";
				} else {
					stmt += "?";
					// remap kvElement.value into storage value...
					v = this._toDatabaseFromElementType(defElement, kvElement.value);
					bindings.push(v);
				}
			} else if ( f == "_last_mod_time" ) {
				stmt += "?";
				bindings.push(now);
			} else if ( f == "_timestamp" ) {
				stmt += "?";
				bindings.push(now);
			} else if ( f == "_saved" ) {
				stmt += "null";
			} else {
				stmt += '"' + f + '"';
			}
		}
    }
    stmt += ' from "' + dbTableName + '" where _id=? group by _id having _timestamp = max(_timestamp)'; 
    bindings.push(instanceId);
	
	for ( f in kvMap ) {
		if ( processSet[f] != true ) {
			console.error("_insertKeyValueMapDataTableStmt: kvMap contains unrecognized database column " + dbTableName + "." + f );
		}
	}
    return {
        stmt : stmt,
        bind : bindings
        };
},
/**
 * compose query to get 'rowcount' value -- the number of records with the given instanceId in the dbTableName.
 *
 * Requires: no globals
 */
_selectDataTableCountStmt:function(dbTableName, instanceId) {
    
    var stmt = 'select count(*) as rowcount from "' + dbTableName + '" where _id=?';
    return {
        stmt : stmt,
        bind : [instanceId]
    };
},
/**
 * insert an entirely new savepoint for the given instanceId (not based upon 
 * the values in any existing record). Called when creating a new instance
 * or (TODO) sub-form instance.
 *
 * kvMap : { 'columnName' : { value: "foo name", isInstanceMetadata: false } ...}
 *
 * additionally, the dataTablePredefinedColumns and model are assumed to be enhanced
 * JSON schema maps. e.g.,
 * 
 * jsonSchemaMap : { 'columnName' : { type: 'elementType', 
 *                            'default': 'defaultValue',
 *                            isInstanceMetadata: false,
 *                            isPersisted: true } ... }
 *
 * NON_CONFORMANCE NOTE: rather than express everything as a list of 
 * types ['elementType', 'null'] we assume that 'null' is implicitly 
 * allowed. Use isNotNullable: true to force a non-null database restriction.
 * Enforcement of this is primarily in support of metadata.
 *
 * If a kvMap entry is present, its 'value' field is used (and null if 'value' 
 * is undefined).If no kvMap entry is present, the ''default'' field, from 
 * the dataTableModel, if present,  is used as the initial
 * value for this column. If ''default'' is not present, null is used.
 *
 * Assumes: all complex values are already reduced to their persisted column set.
 *
 * Requires: No global context
 */
_insertNewKeyValueMapDataTableStmt:function(dbTableName, dataTableModel, kvMap) {
    var t = new Date();
    var now = t.getTime();
    
    var bindings = [];
	var processSet = {};
	
	var j, f, defElement, kvElement;
	var comma = '';
	
    var stmt = 'insert into "' + dbTableName + '" (';
    for ( f in dataTableModel ) {
		defElement = dataTableModel[f];
		if ( defElement.isPersisted ) {
			stmt += comma;
			comma = ', ';
			stmt += '"' + f + '"';
		}
    }
    stmt += ") values (";
	comma = '';
    for (f in dataTableModel) {	
        defElement = dataTableModel[f];
		if ( defElement.isPersisted ) {
			stmt += comma;
			comma = ', ';
			kvElement = kvMap[f];
			if ( kvElement != null ) {
				// track that we matched the keyname...
				processSet[f] = true;
				if (kvElement.value == null) {
					stmt += "null";
				} else {
					stmt += "?";
					bindings.push(kvElement.value);
				}
			} else if ( f == "_last_mod_time" ) {
				stmt += "?";
				bindings.push(now);
			} else if ( f == "_timestamp" ) {
				stmt += "?";
				bindings.push(now);
			} else {
				// use default values from reference map...
				if ( defElement['default'] == null ) {
					stmt += "null";
				} else {
					stmt += "?";
					bindings.push(defElement['default']);
				}
			}
		}
    }
    stmt += ');'; 
	
	for ( f in kvMap ) {
		if ( processSet[f] != true ) {
			console.error("_insertNewKeyValueMapDataTableStmt: kvMap contains unrecognized database column " + dbTableName + "." + f );
		}
	}
    return {
        stmt : stmt,
        bind : bindings
        };
},
/**
 * Delete all but the last savepoint for this instanceId.
 *
 * NOTE: This can make a currently-visible row invisible in a concurrent ODK Tables if 
 * the current record is not a 'COMPLETE' record. We prevent this by only calling this 
 * within the save-as-complete transaction.
 *
 * Requires: no globals
 */
_deletePriorChangesDataTableStmt:function(dbTableName, instanceId) {
    
    var stmt = 'delete from "' + dbTableName + '" where _id=? and _timestamp not in (select max(_timestamp) from "' + dbTableName + '" where _id=?);';
    return {
        stmt : stmt,
        bind : [instanceId, instanceId]
    };
},
/**
 * Delete all automatic save points for a row. This leaves all the user's manual
 * 'INCOMPLETE' savepoints and any 'COMPLETE' savepoints.
 *
 * Requires: no globals
 */
_deleteUnsavedChangesDataTableStmt:function(dbTableName, instanceId) {
    return {
        stmt : 'delete from "' + dbTableName + '" where _id=? and _saved is null;',
        bind : [instanceId]
    };
},
/**
 * Delete the instanceId entirely from the table (all savepoints).
 *
 * Requires: no globals
 */
_deleteDataTableStmt:function(dbTableName, instanceid) {
    return {
        stmt : 'delete from "' + dbTableName + '" where _id=?;',
        bind : [instanceid]
    };
},
/**
 * Retrieve the latest information on all instances in a given data table.
 * Ordered by most recent first, in reverse chronological order.
 *
 * Requires: no globals
 */
_getAllInstancesDataTableStmt:function(dbTableName) {
    return {
            stmt : 'select _instance_name, _timestamp, _saved, _locale, _id from "' +
                    dbTableName + '" group by _id having _timestamp = max(_timestamp) order by _timestamp desc;',
            bind : []
            };
},
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
//   TABLE META DATA
//   TABLE META DATA
//   TABLE META DATA
//   TABLE META DATA
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
_selectTableDefinitionsDataStmt:function(tableId) {
    return {
            stmt : 'select * from _table_definitions where table_id=?',
            bind : [tableId]    
        };
},

_selectAllTableMetaDataStmt:function(tableId) {
    return {
            stmt : 'select key, type, value from _table_key_value_store_active where table_id=?',
            bind : [tableId]    
        };
},
// save the given value under that name
insertTableMetaDataStmt:function(tableId, name, type, value) {
    var now = new Date().getTime();
    if (value == null) {
        return {
            stmt : 'insert into _table_key_value_store_active (table_id, key, type, value) values (?,?,?,"");',
            bind : [tableId, name, type]
        };
    } else {
        return {
            stmt : 'insert into _table_key_value_store_active (table_id, key, type, value) values (?,?,?,?)',
            bind : [tableId, name, type, value]
        };
    }
},
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
//   COLUMN META DATA
//   COLUMN META DATA
//   COLUMN META DATA
//   COLUMN META DATA
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
_selectColumnDefinitionsDataStmt:function(tableId) {
    return {
            stmt : 'select * from _column_definitions where table_id=?',
            bind : [tableId]    
        };
},
_selectAllColumnMetaDataStmt:function(tableId) {
    return {
            stmt : 'select key, type, value from _column_key_value_store_active where table_id=?',
            bind : [tableId]    
        };
},
// save the given value under that name
insertColumnMetaDataStmt:function(tableId, elementKey, name, type, value) {
    var now = new Date().getTime();
    if (value == null) {
        return {
            stmt : 'insert into _column_key_value_store_active (table_id, element_key, key, type, value) values (?,?,?,?,"");',
            bind : [tableId, elementKey, name, type]
        };
    } else {
        return {
            stmt : 'insert into _column_key_value_store_active (table_id, key, type, value) values (?,?,?,?)',
            bind : [tableId, elementKey, name, type, value]
        };
    }
},
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
//   ACTIONS on DATA
//   ACTIONS on DATA
//   ACTIONS on DATA
//   ACTIONS on DATA
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
putData:function(ctxt, name, value) {
      var that = this;
      var kvMap = {};
	  ctxt.append('putData', 'name: ' + name);
	  kvMap[name] = {value: value, isInstanceMetadata: false };
	  that.putDataKeyValueMap(ctxt, kvMap );
},
putInstanceMetaData:function(ctxt, name, value) {
      var that = this;
      var kvMap = {};
	  var dbColumnName;
	  var f;
	  ctxt.append('putInstanceMetaData', 'name: ' + name);
	  for ( f in that.dataTablePredefinedColumns ) {
		if ( that.dataTablePredefinedColumns[f].elementPath == name ) {
			dbColumnName = f;
			break;
		}
	  }
	  if ( dbColumnName == null ) {
		ctxt.append('putInstanceMetaData.elementPath.missing', 'name: ' + name);
		ctxt.failure({message:"Unrecognized instance metadata"});
		return;
	  }
	  kvMap[dbColumnName] = {value: value, isInstanceMetadata: true };
	  that.putDataKeyValueMap(ctxt, kvMap );
},
/**
 * kvMap is: { 'keyname' : {value: 'val', isInstanceMetadata: false }, ... }
 *
 * Requires: mdl to be initialized -- e.g., mdl.tableMetadata, mdl.dataTableModel
 */
putDataKeyValueMap:function(ctxt, kvMap) {
      var that = this;
	  var property;
	  var names = '';
	  for ( property in kvMap ) {
		names += "," + property;
	  }
	  names = names.substring(1);
      ctxt.append('database.putDataKeyValueMap.initiated', names );
      that.withDb( ctxt, function(transaction) {
            var is = that._insertKeyValueMapDataTableStmt(mdl.tableMetadata.dbTableName, mdl.dataTableModel, opendatakit.getCurrentInstanceId(), kvMap);
			ctxt.sqlStatement = is;
            transaction.executeSql(is.stmt, is.bind, function(transaction, result) {
				ctxt.append("putDataKeyValueMap.success", names);
            });
        });
},
getAllData:function(ctxt, dataTableModel, dbTableName, instanceId) {
      var that = this;
      var tlo = { data: {}, metadata: {}};
      ctxt.append('getAllData');
	  var tmpctxt = $.extend({},ctxt,{success:function() {
                ctxt.append("getAllData.success");
                ctxt.success(tlo);
			}});
      that.withDb( tmpctxt, function(transaction) {
        var ss = that._selectAllFromDataTableStmt(dbTableName, instanceId);
		tmpctxt.sqlStatement = ss;
        transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
            var len = result.rows.length;
            if (len == 0 ) {
				throw new Error("no record for getAllData!");
            } else if (len != 1 ) {
				throw new Error("not exactly one record in getAllData!");
            } else {
                var row = result.rows.item(0);
				var dbKey, dbValue, jsonType;
				var elementPath;
				
				// and then just snarf the fields...
                for ( dbKey in dataTableModel ) {
                    jsonType = dataTableModel[dbKey];
					if ( jsonType.isPersisted ) {
						dbValue = row[dbKey];
						elementPath = jsonType.elementPath;
						if ( elementPath != null ) {
							// we expose it to the Javascript layer if it has an elementPath...
							if ( jsonType.elementSet == 'instanceMetadata' ) {
								that._reconstructElementPath(elementPath, jsonType, dbValue, tlo.metadata );
							} else {
								that._reconstructElementPath(elementPath, jsonType, dbValue, tlo.data );
							}
						}
					}
                }
            }
        });
      });
},
cacheAllData:function(ctxt, instanceId) {
    var that = this;
    this.getAllData($.extend({},ctxt,{success:function(tlo) {
        ctxt.append("cacheAllData.success");
        mdl.metadata = tlo.metadata;
        mdl.data = tlo.data;
        opendatakit.setCurrentInstanceId(instanceId);
        ctxt.success();
    }}), mdl.dataTableModel, mdl.tableMetadata.dbTableName, instanceId);
},
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
//   ACTIONS on METADATA
//   ACTIONS on METADATA
//   ACTIONS on METADATA
//   ACTIONS on METADATA
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
coreGetAllTableMetadata:function(transaction, ctxt, tlo) {
    var that = this;
	var outcome = true;
	var ss;
	ss = that._selectTableDefinitionsDataStmt(tlo.tableId);
	ctxt.sqlStatement = ss;
	transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
		var len = result.rows.length;
		var f;
		var row;
		var defn;
		if ( len != 1 ) {
			throw new Error("Internal error: unknown tableId");
		}
		row = result.rows.item(0);
		for ( f in that.tableDefinitionsPredefinedColumns ) {
			defn = that.tableDefinitionsPredefinedColumns[f];
			if ( defn.elementPath ) {
				that._reconstructElementPath(defn.elementPath, defn, row[f], tlo.tableMetadata );
			}
		}
		ss = that._selectAllTableMetaDataStmt(tlo.tableId);
		ctxt.sqlStatement = ss;
		transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
			var len = result.rows.length;
			var defn;
			for (var i = 0 ; i < len ; ++i ) {
				var row = result.rows.item(i);
				var dbKey = row['key'];
				var dbValue = row['value'];
				var dbType = row['type'];
				defn = that.tableKeyValueStoreActiveAccessibleKeys[dbKey];
				if ( defn != null ) {
					that._reconstructElementPath(defn.elementPath, defn, dbValue, tlo.tableMetadata );
				}
			}
			// read all column definitions...
			ss = that._selectColumnDefinitionsDataStmt(tlo.tableId);
			ctxt.sqlStatement = ss;
			transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
				var len = result.rows.length;
				var i, row;
				var f;
				var defn;
				var colDefn;
				tlo.columnMetadata = {};
				for ( i = 0 ; i < len ; ++i ) {
					row = result.rows.item(i);
					colDefn = {};
					for ( f in that.columnDefinitionsPredefinedColumns ) {
						defn = that.columnDefinitionsPredefinedColumns[f];
						if ( defn.elementPath ) {
							that._reconstructElementPath(defn.elementPath, defn, row[f], colDefn );
						}
					}
					tlo.columnMetadata[defn.elementKey] = defn;
				}
				
				ss = that._selectAllColumnMetaDataStmt(tlo.tableId);
				ctxt.sqlStatement = ss;
				transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
					var len = result.rows.length;
					var defn;
					for (var i = 0 ; i < len ; ++i ) {
						var row = result.rows.item(i);
						var elementKey = row['element_key'];
						var dbKey = row['key'];
						var dbValue = row['value'];
						var dbType = row['type'];
						defn = that.columnKeyValueStoreActiveAccessibleKeys[dbKey];
						if ( defn != null ) {
							that._reconstructElementPath(defn.elementPath, defn, dbValue, tlo.columnMetadata[elementKey] );
						}
					}
				});
			});
		});
	});
},
getAllTableMetaData:function(ctxt, tableId) {
    var that = this;
    var tlo = { tableMetadata: {}, columnMetadata: {}, tableId: tableId };
    ctxt.append('getAllTableMetaData');
	var tmpctxt = $.extend({},ctxt,{success:function() {
                ctxt.append('getAllTableMetaData.success');
                ctxt.success(tlo);
            }});
    that.withDb( tmpctxt, function(transaction) {
            that.coreGetAllTableMetadata(transaction, tmpctxt, tlo);
        });
},
cacheAllTableMetaData:function(ctxt, tableId) {
    var that = this;
    // pull everything for synchronous read access
    ctxt.append('cacheAllTableMetaData.getAllTableMetaData');
    that.getAllTableMetaData($.extend({},ctxt,{success:function(tlo) {
        ctxt.append('cacheAllTableMetaData.success');
        if ( tlo == null ) {
            tlo = {};
        }
        // these values come from the current webpage
        // tlo.formDef = mdl.formDef;
		// mdl.formDef = tlo.formDef;
		mdl.tableMetadata = tlo.tableMetadata;
		mdl.columnMetadata = tlo.columnMetadata;
		mdl.metadata = tlo.metadata;
		mdl.data = tlo.data;
        ctxt.success();
        }}), tableId);
},
save_all_changes:function(ctxt, asComplete) {
      var that = this;
    // TODO: if called from Java, ensure that all data on the current page is saved...
      ctxt.append('save_all_changes');
	  var tmpctxt = $.extend({}, ctxt, {success:function() {
                ctxt.append('save_all_changes.markCurrentStateSaved.success', 
                opendatakit.getSettingValue('formId') + " instanceId: " + opendatakit.getCurrentInstanceId() + " asComplete: " + asComplete);
                ctxt.success();
            }});
      that.withDb( tmpctxt, 
            function(transaction) {
				var kvMap = {};
				kvMap['_saved'] = {value: (asComplete ? 'COMPLETE' : 'INCOMPLETE'), isInstanceMetadata: true };
				var is = that._insertKeyValueMapDataTableStmt(mdl.tableMetadata.dbTableName, mdl.dataTableModel, opendatakit.getCurrentInstanceId(), kvMap);
				tmpctxt.sqlStatement = is;
                transaction.executeSql(is.stmt, is.bind, function(transaction, result) {
                    if ( asComplete ) {
                        ctxt.append('save_all_changes.cleanup');
                        // and now delete the change history...
                        var cs = that._deletePriorChangesDataTableStmt(mdl.tableMetadata.dbTableName, opendatakit.getCurrentInstanceId());
						tmpctxt.sqlStatement = cs;
                        transaction.executeSql(cs.stmt, cs.bind);
                    }
                });
            }
        );
    // TODO: should we have a failure callback in to ODK Collect?
},
ignore_all_changes:function(ctxt) {
      var that = this;
      ctxt.append('database.ignore_all_changes');
      that.withDb( ctxt, function(transaction) {
            var cs = that._deleteUnsavedChangesDataTableStmt(mdl.tableMetadata.dbTableName, opendatakit.getCurrentInstanceId());
			ctxt.sqlStatement = cs;
            transaction.executeSql(cs.stmt, cs.bind);
        });
},
 delete_all:function(ctxt, instanceId) {
      var that = this;
      ctxt.append('delete_all');
      that.withDb( ctxt, function(transaction) {
            var cs = that._deleteDataTableStmt(mdl.tableMetadata.dbTableName, instanceId);
			ctxt.sqlStatement = cs;
            transaction.executeSql(cs.stmt, cs.bind);
        });
},
get_all_instances:function(ctxt, subsurveyType) {
	  var that = this;
	  // TODO: support subforms. The subsurveyType is the form_id of the 
	  // subform. This should then be used to read its config, issue the 
	  // query against it's mdl.tableMetadata.dbTableName, etc.
	  var instanceList = [];
	  ctxt.append('get_all_instances', subsurveyType);
	  that.withDb($.extend({},ctxt,{
		success: function() {
			ctxt.success(instanceList);
		}}), function(transaction) {
            var ss = that._getAllInstancesDataTableStmt(mdl.tableMetadata.dbTableName);
			ctxt.sqlStatement = ss;
            transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
                console.log('test');
                for ( var i = 0 ; i < result.rows.length ; i+=1 ) {
                    var instance = result.rows.item(i);
					instanceList.push({
                        instanceName: instance._instance_name,
                        instance_id: instance._id,
                        last_saved_timestamp: new Date(instance._timestamp),
                        saved_status: instance._saved,
                        locale: instance._locale
                    });
                }
            });
		});
},
initializeInstance:function(ctxt, instanceId, instanceMetadataKeyValueMap) {
    var that = this;
    if ( instanceId == null ) {
        ctxt.append('initializeInstance.noInstance');
        mdl.metadata = {};
        mdl.data = {};
        opendatakit.setCurrentInstanceId(null);
        ctxt.success();
    } else {
        ctxt.append('initializeInstance.access', instanceId);
		var tmpctxt = $.extend({},ctxt,{success:function() {
                that.cacheAllData(ctxt, instanceId);
            }});
        that.withDb( tmpctxt, function(transaction) {
            var cs = that._selectDataTableCountStmt(mdl.tableMetadata.dbTableName, instanceId);
			tmpctxt.sqlStatement = cs;
            transaction.executeSql(cs.stmt, cs.bind, function(transaction, result) {
                var count = 0;
                if ( result.rows.length == 1 ) {
                    var row = result.rows.item(0);
                    count = row['rowcount'];
                }
                if ( count == null || count == 0) {
                    ctxt.append('initializeInstance.insertEmptyInstance');
                    // construct a friendly name for this new form...
                    var date = new Date();
                    var dateStr = date.toISOString();
                    var locale = opendatakit.getDefaultFormLocale(mdl.formDef);
                    var instanceName = dateStr; // .replace(/\W/g, "_")
					
					var kvMap = {};
					kvMap._id = { value: instanceId, isInstanceMetadata: true };
					kvMap._instance_name = { value: instanceName, isInstanceMetadata: true };
					kvMap._locale = { value: locale, isInstanceMetadata: true };
					var propertyCount = 0;
					for ( var f in instanceMetadataKeyValueMap ) {
						++propertyCount;
					}
					if ( propertyCount != 0 ) {
						console.error("Extra arguments found in instanceMetadataKeyValueMap: " + instanceMetadataKeyValueMap );
					}
					var cs = that._insertNewKeyValueMapDataTableStmt(mdl.tableMetadata.dbTableName, mdl.dataTableModel, kvMap);
                    tmpctxt.sqlStatement = cs;
                    transaction.executeSql(cs.stmt, cs.bind);
                }
            });
        });
    }
},
initializeTables:function(ctxt, formDef, tableId, formPath) {
    var that = this;
    var tlo = {data: {},  // dataTable instance data values
		metadata: {}, // dataTable instance Metadata: (instanceName, locale)
		tableMetadata: {}, // _table_definitions and _table_key_value_store_active values: tableId, tableKey, dbTableName
		columnMetadata: {},// _column_definitions and _column_key_value_store_active values: none...
		dataTableModel: {},// inverted and extended formDef.model for representing data store
		formDef: formDef, 
		formPath: formPath, 
		instanceId: null, 
		tableId: tableId
		};
                            
    ctxt.append('initializeTables');
	var tmpctxt = $.extend({},ctxt,{success:function() {
                ctxt.append('getAllTableMetaData.success');
                // these values come from the current webpage
                // update tableId and qp
				mdl.formDef = tlo.formDef;
				mdl.tableMetadata = tlo.tableMetadata;
				mdl.columnMetadata = tlo.columnMetadata;
				mdl.data = tlo.data;
                opendatakit.setCurrentTableId(tableId);
                opendatakit.setCurrentFormPath(formPath);
                ctxt.success();
            }});
    that.withDb(tmpctxt, function(transaction) {
                // now insert records into these tables...
				var ss = that._selectTableDefinitionsDataStmt(tableId);
				ctxt.sqlStatement = ss;
				transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
					var len = result.rows.length;
                    if (len == 0 ) {
                        // TODO: use something other than formId for the dbTableName...
                        that._insertTableAndColumnProperties(transaction, tmpctxt, tlo);
                    } else if(len != 1) {
						throw new Error("getMetaData: multiple rows! " + name + " count: " + len);
					} else {
						that.coreGetAllTableMetadata(transaction, tmpctxt, tlo);
					}
                });
            });
},
_clearPersistedFlag: function( dbKeyMap, listChildElementKeys) {
	var i;
	var f;
	if ( listChildElementKeys != null ) {
		for ( i = 0 ; i < listChildElementKeys.length ; ++i ) {
			var f = listChildElementKeys[i];
			var jsonType = dbKeyMap[f];
			jsonType.isPersisted = false;
			if ( jsonType.type == 'array' ) {
				this._clearPersistedFlag(dbKeyMap, jsonType.listChildElementKeys);
			} else if ( jsonType.type == 'object' ) {
				this._clearPersistedFlag(dbKeyMap, jsonType.listChildElementKeys);
			}
		}
	}
},
_flattenElementPath: function( dbKeyMap, elementPathPrefix, elementName, elementKeyPrefix, jsonType ) {
	var fullPath;
	var elementKey;
	var i = 0;

	// remember the element name...
	jsonType.elementName = elementName;
	// and the set is 'data' because it comes from the data model...
	jsonType.elementSet = 'data';
	
	// update element path prefix for recursive elements
	elementPathPrefix = (elementPathPrefix == null ) ? elementName : (elementPathPrefix + '.' + elementName);
	// and our own element path is exactly just this prefix
	jsonType.elementPath = elementPathPrefix;

	// use the user's elementKey if specified
	elementKey = jsonType.elementKey;

	if ( elementKey != null ) {
		// throw an error if the elementkey is longer than 64 characters
		// or if it is already being used and not by myself...
		if ( elementKey.length > 64 ) {
			throw new Error("elementKey is longer than 64 characters");
		}
		if ( dbKeyMap[elementKey] != null && dbKeyMap[elementKey] != jsonType ) {
			throw new Error("elementKey is already used (autogenerated?) for another model element");
		}
	}
	
	if ( elementKey == null ) {
		// synthesize an element key...
		elementKey = ( elementKeyPrefix == null ) ? elementName : elementKeyPrefix + '_' + elementName;
	}

	// assume the primitive types are persisted.
	// this will be updated if there is an outer array or object
	// that persists itself (below).
	if ( jsonType.type == 'string' || 
			jsonType.type == 'number' || 
			jsonType.type == 'integer' ||
			jsonType.type == 'boolean' ) {
		// these should be persisted...
		jsonType.isPersisted = true;
	}

	// and whether or not we persist, we need to add this to the dbKeyMap
	//
	if ( elementKey.length > 64 ) {
		// shorten by eliminating silent consonants and vowels...
		elementKey = elementKey.replace(/aehiouy/,'');
	}
	if ( elementKey.length > 64 ) {
		// remove leading characters...
		elementKey = elementKey.substring(elementKey.length - 64);
	}
		
	// find a not-yet-used element key
	i = 0;
	while ( dbKeyMap[elementKey] != null ) {
		elementKey = elementKey.substr(0,60);
		elementKey = elementKey + this._padWithLeadingZeros(i,4);
		++i;
	}
	// remember the elementKey we have chosen...
	jsonType.elementKey = elementKey;
	dbKeyMap[elementKey] = jsonType;

	// handle the recursive structures...
	if ( jsonType.type == 'array' ) {
		// explode with subordinate elements
		f = this._flattenElementPath( dbKeyMap, elementPathPrefix, 'items', elementKey, jsonType.items );
		jsonType.listChildElementKeys = [ f.elementKey ];
		jsonType.isPersisted = true;
	} else if ( jsonType.type == 'object' ) {
		// object...
		var hasProperties = false;
		var e;
		var f;
		var listChildElementKeys = [];
		for ( e in jsonType.properties ) {
			hasProperties = true;
			f = this._flattenElementPath( dbKeyMap, elementPathPrefix, e, elementKey, jsonType.properties[e] );
			listChildElementKeys.push(f.elementKey);
		}
		jsonType.listChildElementKeys = listChildElementKeys;
		if ( !hasProperties ) {
			jsonType.isPersisted = true;
		}
	}

	if ( jsonType.isPersisted && (jsonType.listChildElementKeys != null)) {
		// we have some sort of structure that is persisting
		// clear the isPersisted tags on the nested elements
		this._clearPersistedFlag(dbKeyMap, jsonType.listChildElementKeys);
	}
	return jsonType;
},
_insertTableAndColumnProperties:function(transaction, ctxt, tlo) {
    var that = this;
    var fullDef = {
		_table_definitions: [],
        _table_key_value_store_active: [],
        _column_definitions: [],
		_column_key_value_store_active: []
        };

    var displayColumnOrder = [];
	
	// TODO: synthesize dbTableName from some other source...
	var dbTableName = opendatakit.getSetting(tlo.formDef, 'formId');
	// dataTableModel holds an inversion of the tlo.formDef.model
	//
	//  elementKey : jsonSchemaType
	//
	// with the addition of:
	//    isPersisted : true if elementKey is a dbColumnName
	//    elementPath : pathToElement
	//    elementSet : 'data'
	//    listChildElementKeys : ['key1', 'key2' ...]
	//
	// within the jsonSchemaType to be used to transform to/from
	// the model contents and data table representation.
    //	
	var dataTableModel = {};
	var f;
	for ( f in that.dataTablePredefinedColumns ) {
		dataTableModel[f] = that.dataTablePredefinedColumns[f];
	}
	
	// go through the supplied tlo.formDef model
	// and invert it into the dataTableModel
	var jsonDefn;
    for ( f in tlo.formDef.model ) {
        displayColumnOrder.push(f);
        jsonDefn = that._flattenElementPath( dataTableModel, null, f, null, tlo.formDef.model[f] );
		fullDef._column_definitions.push( {
			table_id: tlo.tableId,
			element_key: jsonDefn.elementKey,
			element_name: jsonDefn.elementName,
			element_type: (jsonDefn.elementType == null ? jsonDefn.type : jsonDefn.elementType),
			list_child_element_keys : ((jsonDefn.listChildElementKeys == null) ? null : JSON.stringify(jsonDefn.listChildElementKeys)),
			is_persisted : jsonDefn.isPersisted,
			joins: null
		} );
	}

	// and now traverse the dataTableModel making sure all the
	// elementSet: 'data' values have columnDefinitions entries.
	//
	for ( var dbColumnName in dataTableModel ) {
        // case: simple type
        // TODO: case: geopoint -- expand to different persistence columns
		jsonDefn = dataTableModel[dbColumnName];
		
		if ( jsonDefn.elementSet == 'data' ) {
			var collectElementName = jsonDefn.elementName;
			
			fullDef._column_definitions.push( {
				table_id: tlo.tableId,
				element_key: dbColumnName,
				element_name: jsonDefn.elementName,
				element_type: (jsonDefn.elementType == null ? jsonDefn.type : jsonDefn.elementType),
				list_child_element_keys : ((jsonDefn.type == 'array') ? jsonDefn.items : jsonDefn.properties),
				is_persisted : true,
				joins: null
			} );
			fullDef._column_key_value_store_active.push( {
				table_id: tlo.tableId,
				element_key: dbColumnName,
				key: "displayVisible",
				type: "boolean",
				value: true
			} );
			fullDef._column_key_value_store_active.push( {
				table_id: tlo.tableId,
				element_key: dbColumnName,
				key: "displayName",
				type: "string",
				value: collectElementName
			} );
			fullDef._column_key_value_store_active.push( {
				table_id: tlo.tableId,
				element_key: dbColumnName,
				key: "displayChoicesList",
				type: "string",
				value: ((jsonDefn.choicesList == null) ? null : JSON.stringify(tlo.formDef.choices[jsonDefn.choicesList]))
			} );
			fullDef._column_key_value_store_active.push( {
				table_id: tlo.tableId,
				element_key: dbColumnName,
				key: "displayFormat",
				type: "string",
				value: jsonDefn.displayFormat
			} );
			fullDef._column_key_value_store_active.push( {
				table_id: tlo.tableId,
				element_key: dbColumnName,
				key: "smsIn",
				type: "boolean",
				value: true
			} );
			fullDef._column_key_value_store_active.push( {
				table_id: tlo.tableId,
				element_key: dbColumnName,
				key: "smsOut",
				type: "boolean",
				value: true
			} );
			fullDef._column_key_value_store_active.push( {
				table_id: tlo.tableId,
				element_key: dbColumnName,
				key: "smsLabel",
				type: "string",
				value: null
			} );
			fullDef._column_key_value_store_active.push( {
				table_id: tlo.tableId,
				element_key: dbColumnName,
				key: "footerMode",
				type: "string",
				value: '0'
			} );
		}
    }

	fullDef._table_definitions.push( { 
		table_id: tlo.tableId, 
		table_key: dbTableName, 
		db_table_name: dbTableName, 
		type: 'data', 
		table_id_access_controls: null, 
		sync_tag: "", 
		last_sync_time: -1, 
		sync_state: 'REST', 
		transactioning: 0 } );
										
    var createTableCmd = this._createTableStmt(dbTableName, dataTableModel);

    // construct the kvPairs to insert into kvstore
    fullDef._table_key_value_store_active.push( { table_id: tlo.tableId, key: 'displayName', type: 'string', value: opendatakit.getSetting(tlo.formDef, 'formTitle') } );
    fullDef._table_key_value_store_active.push( { table_id: tlo.tableId, key: 'primeCols', type: 'string', value: '' } );
    fullDef._table_key_value_store_active.push( { table_id: tlo.tableId, key: 'sortCol', type: 'string', value: '' } );
    fullDef._table_key_value_store_active.push( { table_id: tlo.tableId, key: 'coViewSettings', type: 'string', value: '' } );
    fullDef._table_key_value_store_active.push( { table_id: tlo.tableId, key: 'detailViewFile', type: 'string', value: '' } );
    fullDef._table_key_value_store_active.push( { table_id: tlo.tableId, key: 'summaryDisplayFormat', type: 'string', value: '' } );
    fullDef._table_key_value_store_active.push( { table_id: tlo.tableId, key: 'colOrder', type: 'string', value: JSON.stringify(displayColumnOrder) } );
    fullDef._table_key_value_store_active.push( { table_id: tlo.tableId, key: 'ovViewSettings', type: 'string', value: '' } );

	// get first property in fullDef -- we use native iteration ordering to step through the properties.
	var tableToUpdate = null;
	for ( var prop in fullDef ) {
		tableToUpdate = prop;
		break;
	}
	
	ctxt.sqlStatement = createTableCmd;
    transaction.executeSql(createTableCmd.stmt, createTableCmd.bind, function(transaction, result) {
        that.fullDefHelper(transaction, ctxt, tableToUpdate, 0, fullDef, dbTableName, dataTableModel, tlo);
    });
},
fullDefHelper:function(transaction, ctxt, tableToUpdate, idx, fullDef, dbTableName, dataTableModel, tlo) {
    var that = this;
    var row = null;
	
	for (;;) {
		if ( fullDef[tableToUpdate].length > idx ) {
			row = fullDef[tableToUpdate][idx];
		}
	
		if ( row != null ) {
			break;
		}

		// find the next table to insert records into...
		var old = tableToUpdate;
		tableToUpdate = null;
		var found = false;
		for ( var prop in fullDef ) {
			if ( prop == old ) {
				found = true; // get the table after this...
			} else if ( found ) {
				tableToUpdate = prop;
				break;
			}
		}
		
		if ( tableToUpdate == null ) {
			// end of the array -- we are done!
			mdl.dataTableModel = dataTableModel;
			that.coreGetAllTableMetadata(transaction, ctxt, tlo);
			return;
		}

		// reset to the start of the insert array
		idx = 0;
	}
    
    // assemble insert statement...
    var insertStart = 'REPLACE INTO ' + tableToUpdate + ' (';
    var insertMiddle = ') VALUES (';
    var bindArray = [];
    for ( var col in row ) {
        insertStart += col + ',';
        bindArray.push(row[col]);
        insertMiddle += '?,';
    }
    var insertCmd = insertStart.substr(0,insertStart.length-1) + insertMiddle.substr(0,insertMiddle.length-1) + ');';
    
    transaction.executeSql(insertCmd, bindArray, function(transaction, result) {
        that.fullDefHelper(transaction, ctxt, tableToUpdate, idx+1, fullDef, dbTableName, dataTableModel, tlo);
    });
},
getDataValue:function(name) {
    var path = name.split('.');
    var v = mdl.data;
    for ( var i = 0 ; i < path.length ; ++i ) {
        v = v[path[i]];
        if ( v == null ) {
			return null;
		}
    }
    return v;
},
setData:function(ctxt, name, value) {
    ctxt.append('setData: ' + name);
    var that = this;
    that.putData($.extend({}, ctxt, {success: function() {
            that.cacheAllData(ctxt, opendatakit.getCurrentInstanceId());
        }}), name, value);
},
getInstanceMetaDataValue:function(name) {
    var path = name.split('.');
    var v = mdl.metadata;
    for ( var i = 0 ; i < path.length ; ++i ) {
        v = v[path[i]];
        if ( v == null ) {
			return v;
		}
    }
    return v;
},
setInstanceMetaData:function(ctxt, name, value) {
    ctxt.append('setInstanceMetaData: ' + name);
    var that = this;
    that.putInstanceMetaData($.extend({}, ctxt, {success: function() {
                that.cacheAllData(ctxt, opendatakit.getCurrentInstanceId());
            }}), name, value);
},
// TODO: table metadata is under mdl.tableMetadata
// TODO: column metadata is under mdl.columnMetadata
getTableMetaDataValue:function(name) {
    var path = name.split('.');
    var v = mdl.tableMetadata;
    for ( var i = 0 ; i < path.length ; ++i ) {
        v = v[path[i]];
        if ( v == null ) {
			return v;
		}
    }
    return v;
},
getAllDataValues:function() {
	return mdl.data;
},
discoverTableFromTableId:function(ctxt, tableId) {

}
};
});
