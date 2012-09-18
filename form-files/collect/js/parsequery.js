'use strict';
// Cdependency upon: opendatakit, database 
define(['mdl','opendatakit','database'],function(mdl,opendatakit,database) {
return {

    parseQueryHelper:function(dataKeyValueList, key, value) {
        if ( key == 'instanceId' ) return;
		if ( key == 'pageRef' ) return;
        for (var i = 0 ; i < dataKeyValueList.length ; ++i ) {
            var e = dataKeyValueList[i];
            if ( e.key == key ) {
                // update value...
                e.value = value;
                return;
            }
        }
        dataKeyValueList[dataKeyValueList.length] = { key: key, type: 'string', value: value };
    },
    
    parseQueryParameterContinuation:function(formDef, formId, formVersion, instanceId, pageRef, formName, continuation) {
		var that = this;
        return function() {
			if ( instanceId == null ) {
				var result = {};
				// only these values plus instanceId are immediate -- everything else is in metadata table.
				var formLocale = that.getSetting(formDef, 'formLocale');
				var formName = that.getSetting(formDef, 'formName');

				result.formId = { "type" : "string", "value": formId };
				result.instanceId = { "type" : "string", "value": instanceId };
				result.formVersion = { "type" : "string", "value": formVersion };
				result.formLocale = { "type" : "string", "value": formLocale };
				result.formName = { "type" : "string", "value": formName };
				
				var sameForm = (database.getMetaDataValue('formId') == formId);
				var sameInstance = sameForm && (database.getMetaDataValue('instanceId') == instanceId);
				mdl.qp = result;
				continuation(formDef, formId, formVersion, instanceId, pageRef, sameForm, sameInstance);
				return;
			}
            database.getCrossTableMetaData(formId, instanceId, 'instanceName', function(value) {
                if (value == null) {
                    // construct a friendly name for this new form...
                    var date = new Date();
                    var dateStr = date.toISOString();
                    var fnvalue = formName + "_" + dateStr; // .replace(/\W/g, "_")
                    database.putCrossTableMetaData(formId, instanceId, 'instanceName', 'string', fnvalue, function() {
						var result = {};
					    // only these values plus instanceId are immediate -- everything else is in metadata table.
						var formLocale = that.getSetting(formDef, 'formLocale');
						var formName = that.getSetting(formDef, 'formName');

						result.formId = { "type" : "string", "value": formId };
						result.instanceId = { "type" : "string", "value": instanceId };
						result.formVersion = { "type" : "string", "value": formVersion };
						result.formLocale = { "type" : "string", "value": formLocale };
						result.formName = { "type" : "string", "value": formName };

						var sameForm = (database.getMetaDataValue('formId') == formId);
						var sameInstance = sameForm && (database.getMetaDataValue('instanceId') == instanceId);
						mdl.qp = result;
						continuation(formDef, formId, formVersion, instanceId, pageRef, sameForm, sameInstance);
                    });
                } else {
					var result = {};
					// only these values plus instanceId are immediate -- everything else is in metadata table.
					var formLocale = that.getSetting(formDef, 'formLocale');
					var formName = that.getSetting(formDef, 'formName');

					result.formId = { "type" : "string", "value": formId };
					result.instanceId = { "type" : "string", "value": instanceId };
					result.formVersion = { "type" : "string", "value": formVersion };
					result.formLocale = { "type" : "string", "value": formLocale };
					result.formName = { "type" : "string", "value": formName };

					var sameForm = (database.getMetaDataValue('formId') == formId);
					var sameInstance = sameForm && (database.getMetaDataValue('instanceId') == instanceId);
					mdl.qp = result;
					// pull everything for synchronous read access
					continuation(formDef, formId, formVersion, instanceId, pageRef, sameForm, sameInstance);
                }
            });
        };
    },
    getSetting:function(formDef, key) {
        for (var i = 0 ; i < formDef.settings.length ; ++i ) {
            var e = formDef.settings[i];
            if ( e.setting == key ) {
                return e.value;
            }
        }
        return null;
    },
    parseQueryParameters:function( continuation ) {
        var that = this;
        
		var formId = null;
		var formVersion = null;
        var instanceId = null;
		var pageRef = null;
		
        var dataKeyValueList = [];
        if (window.location.hash)
        {
            // split up the query string and store in an associative array
            var params = window.location.hash.slice(1).split("&");
            for (var i = 0; i < params.length; i++)
            {
                var tmp = params[i].split("=");
                var key = tmp[0];
                var value = unescape(tmp[1]);
				if ( key == 'formId' ) {
					formId = value;
				} else if ( key == 'formVersion' ) {
					formVersion = value;
				} else if ( key == 'instanceId' ) {
                    instanceId = value;
                } else if ( key == 'pageRef' ) {
					pageRef = value;
				} else {
                    that.parseQueryHelper(dataKeyValueList, key, value);
                }
            }
        }

/**
        if ( instanceId == null || instanceId == "" ) {
            console.log("ALERT! defining a UUID  because one wasn't specified");
            instanceId = opendatakit.genUUID();
			collect.setInstanceId(instanceId);
        }
 */

		var formDef = {
    "settings": [
        {
            setting: "formId",
            value: "placeholder"
        },
        {
            setting: "formVersion",
            value: "20120901"
        },
        {
            setting: "formLocale",
            value: "en_us"
        },
        {
            setting: "formName",
            value: {
                "en_us": 'Placeholder Form'
                }
        },
        {
            setting: "formLogo",
            value: "img/form_logo.png"
        }
    ],
    "survey": [
        {
            "name": "none", 
            "validate": true,
            "type": "text", 
            "param": null, 
            "label": {
                "en_us": "Choose a form:"
            }
        }, 
    ], 
    "datafields": {
        "none": {
            "type": "string"
        }, 
    }, 
};
		if ( formId != null ) {
			var filename = opendatakit.getCurrentFormDirectory(formId, formVersion) + 'formDef.json';
			requirejs(['text!' + filename], 
				function(formDefTxt) {
					if ( formDefTxt == null || formDefTxt.length == 0 ) {
						alert('Unable to find file: ' + filename);
					} else {
						formDef = JSON.parse(formDefTxt);
						that.fetchContinueParsing(formDef, formId, formVersion, 
													instanceId, pageRef, dataKeyValueList, continuation);
					}
				}
			);
		} else {
			this.fetchContinueParsing(formDef, formId, formVersion, 
													instanceId, pageRef, dataKeyValueList, continuation);
		}
	},
	fetchContinueParsing: function(formDef, formId, formVersion, instanceId, pageRef, dataKeyValueList, continuation) {
		var that = this;
		var settings = formDef.settings;
		
		var formLocale = this.getSetting(formDef, 'formLocale');
		var formName = this.getSetting(formDef, 'formName');
		
        var result = {};
        
        that.parseQueryHelper(dataKeyValueList, 'formId', formId );
        that.parseQueryHelper(dataKeyValueList, 'formVersion', this.getSetting(formDef, 'formVersion') );
        that.parseQueryHelper(dataKeyValueList, 'formLocale', formLocale );
        that.parseQueryHelper(dataKeyValueList, 'formName', formName );
        
        // there are always 4 entries (formId, formVersion, formName, formLocale)
        // we don't need to save them if there are no other parameters to save.
        if ( instanceId != null && dataKeyValueList.length > 4 ) {
            // save all query parameters to metaData queue
            database.putCrossTableMetaDataKeyTypeValueMap(formId, instanceId, dataKeyValueList, 
                that.parseQueryParameterContinuation(formDef, formId, formVersion, instanceId, pageRef, formName, continuation));
        } else {
            (that.parseQueryParameterContinuation(formDef, formId, formVersion, instanceId, pageRef, formName, continuation))();
        }
    }
};
});
