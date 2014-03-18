'use strict';
/**
 * This is a random collection of methods that don't quite belong anywhere.
 *
 * A set of utilities, some of which wrap the Java interface (shim.js), and others
 * provide useful parsing or interpretation of localization details.
 *
 */
define(['mdl','underscore'],function(mdl,_) {
verifyLoad('opendatakit',
    ['mdl','underscore'],
    [ mdl,  _]);
return {
    initialScreenPath: "initial/0",
    savepoint_type_complete: 'COMPLETE',
    savepoint_type_incomplete: 'INCOMPLETE',
    baseDir: '',
    databaseSettings: null,
    platformInfo: null,
    
    logInitDone:function(pagename) {
        shim.log("I","logInitDone: doneInit ms: " + (+new Date()) + " page: " + pagename);
    },

    /**
     * immediate return: platformInfo structure from ODK
     */
    getPlatformInfo:function() {
        // fetch these settings from ODK Survey (the container app)
        if ( this.platformInfo === undefined || this.platformInfo === null ) {
            var jsonString = shim.getPlatformInfo();
            this.platformInfo = JSON.parse(jsonString);
        }
        return this.platformInfo;
    },
    
    /**
     * immediate return: databaseSettings structure from ODK
     */
    getDatabaseSettings:function() {
        // fetch these settings from ODK Survey (the container app)
        if ( this.databaseSettings === undefined || this.databaseSettings === null ) {
            var jsonString = shim.getDatabaseSettings();
            shim.log("I",'opendatakit.getDatabaseSettings: ' + jsonString);
            this.databaseSettings = JSON.parse(jsonString);
        }
        return this.databaseSettings;
    },

    genUUID:function() {
        // construct a UUID (from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript )
        var id = "uuid:" + 
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = (c === 'x') ? r : (r&0x3|0x8);
            return v.toString(16);
        });
        return id;
    },
    getSameRefIdHashString:function(formPath, instanceId, screenPath) {
        var refId = this.getRefId();
        if ( formPath === undefined || formPath === null ) {
            formPath = shim.getBaseUrl() + "/";
        }
        var qpl =
            '#formPath=' + escape(formPath) +
            ((instanceId === undefined || instanceId === null) ? '' : ('&instanceId=' + escape(instanceId))) +
            '&screenPath=' + escape((screenPath === undefined || screenPath === null) ? this.initialScreenPath : screenPath) +
            ((refId === undefined || refId === null) ? '' : ('&refId=' + escape(refId)));
        return qpl;
    },

    getHashString:function(formPath, instanceId, screenPath) {
        var refId = this.genUUID();
        if ( formPath === undefined || formPath === null ) {
            formPath = shim.getBaseUrl() + "/";
        }
        var qpl =
            '#formPath=' + escape(formPath) +
            ((instanceId === undefined || instanceId === null) ? '' : ('&instanceId=' + escape(instanceId))) +
            '&screenPath=' + escape((screenPath === undefined || screenPath === null) ? this.initialScreenPath : screenPath) +
            ((refId === undefined || refId === null) ? '' : ('&refId=' + escape(refId)));
        return qpl;
    },

    setCurrentFormDef:function(formDef) {
        mdl.formDef = formDef;
    },
    
    getCurrentFormDef:function() {
        return mdl.formDef;
    },
    
    getQueriesDefinition: function(query_name) {
        return mdl.formDef.specification.queries[query_name];
    },
    
    getChoicesDefinition: function(choice_list_name) {
        return mdl.formDef.specification.choices[choice_list_name];
    },
    
    setCurrentFormPath:function(formPath) {
        mdl.formPath = formPath;
    },
    
    getCurrentFormPath:function() {
        return mdl.formPath;
    },
    
    setRefId:function(refId) {
        mdl.ref_id = refId;
    },
    
    getRefId:function() {
        return mdl.ref_id;
    },
    
    clearLocalInfo:function(type) {
        // wipe the ref_id --
        // this prevents saves into the shim from succeeding...
        mdl.ref_id = this.genUUID();
        if ( type === "table" ) {
            mdl.table_id = null;
            mdl.formPath = null;
        } else if ( type === "form" ) {
            mdl.formPath = null;
        } else if ( type === "instance" ) {
          // do not alter instance id
          return;
        }
    },
    
    clearCurrentInstanceId:function() {
        // Update container so that it can save media and auxillary data
        // under different directories...
        shim.clearInstanceId(this.getRefId());
    },
    
    setCurrentInstanceId:function(instanceId) {
        // Update container so that it can save media and auxillary data
        // under different directories...
        shim.setInstanceId( this.getRefId(), instanceId);
    },
    
    getCurrentInstanceId:function() {
        return shim.getInstanceId(this.getRefId());
    },
    
    setCurrentTableId:function(table_id) {
        mdl.table_id = table_id;
    },
    
    getCurrentTableId:function() {
        return mdl.table_id;
    },
    
    getSectionTitle:function(formDef, sectionName) {
        var ref = this.getSettingObject(formDef, sectionName);
        if ( ref === null ) {
            ref = this.getSettingObject(formDef, 'survey'); // fallback
        }
        if ( ref === null || !("display" in ref) ) {
            return "<no title>";
        } else {
            var display = ref.display;
            if ( "title" in display ) {
                return display.title;
            } else {
                return "<no title>";
            }
        }
    },
    getCurrentSectionTitle:function(sectionName) {
        return this.getSectionTitle(this.getCurrentFormDef(),sectionName);
    },
    getCurrentSectionShowContents: function(sectionName) {
        var formDef = this.getCurrentFormDef();
        var sectionSettings = this.getSettingObject(formDef,sectionName);
        if ( sectionSettings === null ) {
            sectionSettings = this.getSettingObject(formDef, 'survey'); // fallback
        }
        
        if ( sectionSettings === null ||
             !('showContents' in sectionSettings) ) {
            return true;
        }
        
        return sectionSettings.showContents;
    },
    localize:function(textOrLangMap, locale) {
        if(_.isUndefined(textOrLangMap)) {
            return 'text_undefined';
        }
        if(_.isString(textOrLangMap)) {
            return textOrLangMap;
        }
        if( locale in textOrLangMap ){
            return textOrLangMap[locale];
        } else if( 'default' in textOrLangMap ){
            return textOrLangMap['default'];
        } else {
            alert("Could not localize object. See console:");
            console.error("Non localizable object:");
            console.error(textOrLangMap);
            return 'no_suitable_language_mapping_defined';
        }
    },
    
    /**
     * NOTE: this rounds and looses the nano fields...
     */
    convertNanosToDateTime:function(timestamp) {
        if ( timestamp === undefined || timestamp === null ) return null;
        timestamp = timestamp.substring(0,timestamp.length-6);
        // convert from a nanosecond-extended iso8601-style UTC date yyyy-mm-ddTHH:MM:SS.sssssssss
        // yyyy-mm-ddTHH:MM:SS.sssssssss
        // 01234567890123456789012345678
        // to a Date object...
        var yyyy,mm,dd,hh,min,sec,msec;
        // NOTE: we toss out the nanoseconds field
        yyyy = Number(timestamp.substr(0,4));
        mm = Number(timestamp.substr(5,2))-1;// months are 0-11
        dd = Number(timestamp.substr(8,2));
        hh = Number(timestamp.substr(11,2));
        min = Number(timestamp.substr(14,2));
        sec = Number(timestamp.substr(17,2));
        msec = Number(timestamp.substr(20,3));
        var value = new Date(Date.UTC(yyyy,mm,dd,hh,min,sec,msec));
        return value;
    },
    padWithLeadingZeros: function( value, places ) {
        var digits = [];
        var d, i, s;
        var sign = (value >= 0);
        value = Math.abs(value);
        while ( value !== 0 ) {
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
    /**
     * Converts a Date to nanos. If no date supplied, uses the current time.
     */
    convertDateTimeToNanos: function(dateTime) {
        var that = this;
        // convert to a nanosecond-extended iso8601-style UTC date yyyy-mm-ddTHH:MM:SS.sssssssss
        // yyyy-mm-ddTHH:MM:SS.sssssssss
        // 01234567890123456789012345678
        if ( dateTime === undefined || dateTime === null ) {
            dateTime = new Date();
        }
        var yyyy,mm,dd,hh,min,sec,msec;
        yyyy = dateTime.getUTCFullYear();
        mm = dateTime.getUTCMonth() + 1; // months are 0-11
        dd = dateTime.getUTCDate();
        hh = dateTime.getUTCHours();
        min = dateTime.getUTCMinutes();
        sec = dateTime.getUTCSeconds();
        msec = dateTime.getUTCMilliseconds();
        var value;
        value = that.padWithLeadingZeros(yyyy,4) + '-' +
                that.padWithLeadingZeros(mm,2) + '-' +
                that.padWithLeadingZeros(dd,2) + 'T' +
                that.padWithLeadingZeros(hh,2) + ':' +
                that.padWithLeadingZeros(min,2) + ':' +
                that.padWithLeadingZeros(sec,2) + '.' +
                that.padWithLeadingZeros(msec,3) + '000000';
        return value;
    },
    /**
     * Retrieve the value of a setting from the form definition file or null if
     * undefined.
     * NOTE: in Survey XLSX syntax, the settings are row-by-row, like choices.
     * The returned object is therefore a map of keys to values for that row.
     * 
     * Immediate.
      */
    getSettingObject:function(formDef, key) {
        if (formDef === undefined || formDef === null) return null;
        var obj = formDef.specification.settings[key];
        if ( obj === undefined ) return null;
        return obj;
    },
    
    /**
     * use this if you know the formDef is valid within the mdl...
     */
    getSettingValue:function(key) {
        var obj = this.getSettingObject(this.getCurrentFormDef(), key);
        if ( obj === null ) return null;
        return obj.value;
    },
    /**
        The list of locales should have been constructed by the XLSXConverter.
        It will be saved under settings._locales.value as a list:
        
        [ { name: "en_us", display: { text: { "en_us": "English", "fr": "Anglais"}}},
           { name: "fr", display: { text: {"en_us": "French", "fr": "Francais"}}} ]
    */
    getFormLocales:function(formDef) {
        if ( formDef !== undefined && formDef !== null ) {
            var locales = this.getSettingObject(formDef, '_locales' );
            if ( locales !== null && locales.value != null ) {
                return locales.value;
            }
            alert("_locales not present in form! See console:");
            console.error("The synthesized _locales field is not present in the form!");
        }
        return [ { display: { text: 'default' }, name: 'default' } ];
    },
    
    /**
        The default locale is a synthesized value. It is specified by 
        the value of the '_default_locale' setting.
        
        This is generally the first locale in the _locales list, above.
     */
    getDefaultFormLocale:function(formDef) {
        if ( formDef != null ) {
            var localeObject = this.getSettingObject(formDef, '_default_locale');
            if ( localeObject !== null && localeObject.value != null ) {
                return localeObject.value;
            }
            alert("_default_locales not present in form! See console:");
            console.error("The synthesized _default_locales field is not present in the form!");
        }
        return "default";
    },
    /**
     use this when the formDef is known to be stored in the mdl
     */
    getDefaultFormLocaleValue:function() {
        return this.getDefaultFormLocale(this.getCurrentFormDef());
    },
    
    getFormLocalesValue:function() {
        return this.getFormLocales(this.getCurrentFormDef());
    },
    
    /**
     * Lower-level function to access a formDef file and parse it.
     * Should not be called from renderers!
     *
     * Read and JSON.parse() the specified filename. 
     * Then invoke ctxt.success(jsonObj).
     */
    readFormDefFile: function(ctxt, filename) {
        var that = this;
        require(['text!' + filename], 
            function(formDefTxt) {
                if ( formDefTxt === undefined || formDefTxt === null || formDefTxt.length === 0 ) {
                    alert('Unable to find file: ' + filename);
                    ctxt.failure({message: "Form definition is empty."});
                } else {
                    setTimeout(function() {
                        var formDef;
                        try {
                            formDef = JSON.parse(formDefTxt);
                        } catch (ex) {
                            ctxt.log('E','opendatakit.readFormDefFile.require.JSONexception',  'JSON parsing error: ' + ex.message);
                            ctxt.failure({message: "Exception while processing form definition."});
                            return;
                        }
                        try {
                            ctxt.success(formDef);
                        } catch (ex) {
                            ctxt.log('E','opendatakit.readFormDefFile.require.continuationException', 
                                        'formDef interpetation or database setup error: ' + ex.message);
                            ctxt.failure({message: "Exception while processing form definition."});
                        }
                    }, 0);
                }
            }, function(err) {
                ctxt.log('E',"opendatakit.readFormDefFile.require.failure" + err.requireType + ' modules: ', err.requireModules.toString());
                ctxt.failure({message: "Failure while reading form definition (" + err.requireType + ")."});
            });
    },

    getShortDateFormat:function(date) {
        if (date == null || date.constructor.name != 'Date')
            return null;
        
        var shortDate = (date.getMonth() + 1) + "/" + date.getDate()  + "/" + date.getFullYear();      

        return shortDate;
    }
};
});
