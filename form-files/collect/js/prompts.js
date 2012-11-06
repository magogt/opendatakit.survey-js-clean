'use strict';

define(['mdl','database','opendatakit','controller','backbone','handlebars','promptTypes','builder','jquery','underscore', 'handlebarsHelpers'],
function(mdl,  database,  opendatakit,  controller,  Backbone,  Handlebars,  promptTypes,  builder,  $,       _) {

promptTypes.base = Backbone.View.extend({
    className: "current",
    type: "base",
    database: database,
    mdl: mdl,
    constraint_message: "Constraint violated.",
	invalid_value_message: "Invalid value.",
	required_message: "Required value not provided.",
    // track how many times we've tried to retrieve and compile the 
    // handlebars template for this prompt.
    initializeTemplateMaxTryCount: 4,
    initializeTemplateTryCount: 0,
    initializeTemplateFailed: false,
    //renderContext is a dynamic object to be passed into the render function.
    //renderContext is meant to be private.
    renderContext: {},
    //Template context is an user specified object that overrides the render context.
    templateContext: {},
    //base html attributes shouldn't be overridden by the user.
    //they should use inputAttributes for that.
    baseInputAttributes: {},
    inputAttributes: {},
    initialize: function() {
        this.initializeTemplate();
        this.initializeRenderContext();
        this.afterInitialize();
    },
    whenTemplateIsReady: function(ctxt){
        var that = this;
        if(this.template){
            ctxt.success();
        } else if(this.templatePath) {
            requirejs(['text!'+this.templatePath], function(source) {
                that.template = Handlebars.compile(source);
                ctxt.success();
            });
        } else {
			ctxt.append("prompts." + this.type + ".whenTemplateIsReady.noTemplate", "px: " + this.promptIdx);
            alert("No template for prompt: " + prompt.name);
            console.error(this);
			ctxt.failure();
        }
    },
    initializeTemplate: function() {
        return;
        /*
        //if (this.template != null) return;
        var that = this;
        var f = function() {
            if(that.templatePath){
                that.initializeTemplateTryCount++;
                requirejs(['text!'+that.templatePath], function(source) {
                    that.template = Handlebars.compile(source);
                }, function(err) {
                    if ( err.requireType == "timeout" ) {
                        if ( that.initializeTemplateTryCount >
                                that.initializeTemplateMaxTryCount ) {
                            that.initializeTemplateFailed = true;
                        } else {
                            setTimeout( f, 100);
                        }
                    } else {
                        that.initializeTemplateFailed = true;
                    }
                });
            }
        };
        f();
        */
    },

    isInitializeComplete: function() {
        return (this.templatePath == null || this.template != null);
    },
    initializeRenderContext: function() {
        //Object.create is used because we don't want to modify the class's render context.
        this.renderContext = Object.create(this.renderContext);
        this.renderContext.label = this.label;
        this.renderContext.name = this.name;
        this.renderContext.disabled = this.disabled;
        this.renderContext.image = this.image;
        this.renderContext.audio = this.audio;
        this.renderContext.video = this.video;
        this.renderContext.hide = this.hide;
        this.renderContext.hint = this.hint;
        //It's probably not good to get data like this in initialize
        //Maybe it would be better to use handlebars helpers to get metadata?
        this.renderContext.formTitle = database.getTableMetaDataValue('formTitle');
        this.renderContext.formVersion = database.getTableMetaDataValue('formVersion');
        
        this.renderContext.inputAttributes = $.extend({}, this.baseInputAttributes, this.inputAttributes);
        $.extend(this.renderContext, this.templateContext);
    },
    afterInitialize: function() {},
    baseActivate: function(ctxt) {
        var that = this;
        function callFunctionsInSeries(functions){
            if(functions.length > 0){
                functions[0]($.extend({}, ctxt, { success : function(){callFunctionsInSeries(functions.slice(1));}}))
            } else {
                that.whenTemplateIsReady(ctxt);
            }
        }
        callFunctionsInSeries(that.additionalActivateFunctions);
    },
    /*
    baseActivate: function(ctxt) {
        var that = this;
        var additionalActivateComplete = _.after(that.additionalActivateFunctions.length, function(){
            that.whenTemplateIsReady(ctxt);
        });
        _.each(that.additionalActivateFunctions, function(additionalActivateFunc){
            additionalActivateFunc($.extend({}, ctxt, { success : additionalActivateComplete}));
        });
    },*/
    onActivate: function(ctxt) {
        this.baseActivate(ctxt);
    },
    /**
     * stopPropagation is used in the events map to disable swiping on various elements
     **/
    stopPropagation: function(evt){
        console.log('stopProp');
        console.log(evt);
        evt.stopImmediatePropagation();
    },
    render: function() {
        var that = this;
        //A virtual element is created so images can be loaded before the newly rendered screen is shown.
        //I think there is a better way to do this. meteor.js uses an approach were you add template markup to indicate
        //which elements should not be rerendered.
        //This is better because we don't have to wait for images to reload,
        //and it has the additional benefit of making it so we don't loose focus on input fields.
        var $virtualEl = $('<div>');
        var $imagesToLoad;
        var numImagesLoaded = 0;
        function imagesLoaded(){
            that.$el.empty();
            that.$el.append($virtualEl.children());
            that.$el.trigger('create');
        }
        try {
            $virtualEl.html(this.template(this.renderContext));
        } catch(e) {
            alert("Error in template.");
            console.error(e);
            console.error(that);
        }
        $imagesToLoad = $virtualEl.find('img');
        $imagesToLoad.load(function(){
            numImagesLoaded++;
            if(numImagesLoaded === $imagesToLoad.length) {
                imagesLoaded();
            }
        });
        if($imagesToLoad.length === 0) {
            imagesLoaded();
        }
        //If the images don't load after 1 second render the template anyways.
        setTimeout(function(){
            if(numImagesLoaded < $imagesToLoad.length) {
                imagesLoaded();
                //prevent imagesLoaded from being triggered by late images.
                numImagesLoaded = $imagesToLoad.length + 1;
            }
        },1000);
        return this;
        /*
        this.$el.html(this.template(this.renderContext));
        //Triggering create seems to prevent some issues where jQm styles are not applied.
        this.$el.trigger('create');
        return this;
        */
    },
    //baseValidate isn't meant to be overidden or called externally.
    //It does validation that will be common to most prompts.
    //Validate is menat be overridden and publicly called. 
    //It is validate's responsibility to call baseValidate.
    baseValidate: function(context) {
        var that = this;
        var isRequired = false;
		try {
			isRequired = ('required' in that) ? that.required() : false;
		} catch (e) {
			context.append("prompts."+that.type+".baseValidate.required.exception", e);
			isRequired = false;
		}
        that.valid = true;
        if ( !('name' in that) ) {
            // no data validation if no persistence...
            context.success();
            return;
        } 
		var value = that.getValue();
        if ( value == null || value == "" ) {
            if ( isRequired ) {
                that.valid = false;
                context.failure({ message: that.required_message });
                return;
            }
        } else if ( 'validateValue' in that ) {
            if ( !that.validateValue() ) {
                that.valid = false;
                context.failure({ message: that.invalid_value_message });
                return;
            }
        } 
        if ( 'constraint' in that ) {
			var outcome = false;
			try {
                outcome = that.constraint({"allowExceptions":true});
                if ( !outcome ) {
                    that.valid = false;
                    context.failure({ message: that.constraint_message });
                    return;
                }
			} catch (e) {
				context.append("prompts."+that.type+"baseValidate.constraint.exception", e);
				outcome = false;
                that.valid = false;
                context.failure({ message: "Exception in constraint." });
                return;
			}
        }
        context.success();
    },
    validate: function(context) {
        return this.baseValidate(context);
    },
    getValue: function() {
        if (!this.name) {
            console.error(this);
            throw "Cannot get value of prompt with no name.";
        }
        return database.getDataValue(this.name);
    },
    setValue: function(ctxt, value) {
        // NOTE: data IS NOT updated synchronously. Use callback!
        var that = this;
        database.setData(ctxt, that.name, that.datatype, value);
    },
    beforeMove: function(ctxt) {
        ctxt.append("prompts." + this.type, "px: " + this.promptIdx);
        ctxt.success();
    },
    getCallback: function(ctxt, path, action) {
        ctxt.append("prompts." + this.type, "px: " + this.promptIdx + " unimplemented: " + path + " action: " + action);
        alert('getCallback: Unimplemented: ' + actionPath);
        ctxt.failure();
    },
    /*
    registerChangeHandlers: function() {
        // TODO: code that is executed after all page prompts are inserted into the DOM.
        // This code would, e.g., handle value-change events to propagate changes across
        // a page (e.g., update calculated fields).
    },
    */
    validationFailedAction: function(isMoveBackward) {
        alert(this.validationFailedMessage);
    },
    requiredFieldMissingAction: function(isMovingBackward) {
        alert(this.requiredFieldMissingMessage);
    }

});
promptTypes.opening = promptTypes.base.extend({
    type: "opening",
    hideInHierarchy: true,
    templatePath: "templates/opening.handlebars",
    onActivate: function(ctxt) {
        var formLogo = false;//TODO: Need way to access form settings.
        if(formLogo){
            this.renderContext.headerImg = formLogo;
        }
        var instanceName = database.getInstanceMetaDataValue('instanceName');
        if ( instanceName == null ) {
            // construct a friendly name for this form... use just the date, as the form name is well known
            var date = new Date();
            var dateStr = date.toISOString();
            instanceName = dateStr; // .replace(/\W/g, "_")
            this.renderContext.instanceName = instanceName;
			database.setInstanceMetaData($.extend({}, ctxt, {success: function() { ctxt.success({enableBackNavigation: false}); }}),
										 'instanceName', 'string', instanceName);
            return;
        }
        this.renderContext.instanceName = instanceName;
        this.baseActivate($.extend({}, ctxt, {
            success:function(){
                ctxt.success({enableBackwardNavigation: false});
            }
        }));
    },
    renderContext: {
        headerImg: opendatakit.baseDir + 'img/form_logo.png',
        backupImg: opendatakit.baseDir + 'img/backup.png',
        advanceImg: opendatakit.baseDir + 'img/advance.png'
    },
    //Events copied from input_type, should probably refactor.
    events: {
        "change input": "modification",
        "swipeleft .input-container": "stopPropagation",
        "swiperight .input-container": "stopPropagation"
    },
    modification: function(evt) {
        var ctxt = controller.newContext(evt);
        ctxt.append("prompts." + this.type + ".modification", "px: " + this.promptIdx);
		database.setInstanceMetaData(ctxt, 'instanceName', 'string', this.$('input').val());
    },
    beforeMove: function(ctxt) {
        ctxt.append("prompts." + this.type + ".beforeMove", "px: " + this.promptIdx);
		database.setInstanceMetaData(ctxt, 'instanceName', 'string', this.$('input').val());
        // ctxt.success();
    }
});
promptTypes.finalize = promptTypes.base.extend({
    type:"finalize",
    hideInHierarchy: true,
    valid: true,
    templatePath: "templates/finalize.handlebars",
    events: {
        "click .incomplete": "saveIncomplete",
        "click .finalize": "saveFinal"
    },
    renderContext: {
        headerImg: opendatakit.baseDir + 'img/form_logo.png'
    },
    onActivate: function(ctxt) {
        var formLogo = false;//TODO: Need way to access form settings.
        if(formLogo){
            this.renderContext.headerImg = formLogo;
        }
        this.renderContext.instanceName = database.getInstanceMetaDataValue('instanceName');
        this.baseActivate($.extend({}, ctxt, {
            success:function(){
                ctxt.success({enableForwardNavigation: false});
            }
        }));
    },
    saveIncomplete: function(evt) {
        var ctxt = controller.newContext(evt);
        ctxt.append("prompts." + this.type + ".saveIncomplete", "px: " + this.promptIdx);
		controller.saveAllChanges(ctxt,false);
    },
    saveFinal: function(evt) {
         var ctxt = controller.newContext(evt);
        ctxt.append("prompts." + this.type + ".saveFinal", "px: " + this.promptIdx);
		controller.saveAllChanges(ctxt,true);
    }
});
promptTypes.json = promptTypes.base.extend({
    type:"json",
    hideInHierarchy: true,
    valid: true,
    templatePath: "templates/json.handlebars",
    onActivate: function(ctxt) {
        var that = this;
        if ( JSON != null ) {
            that.renderContext.value = JSON.stringify(mdl.data,null,2);
        } else {
            that.renderContext.value = "JSON Unavailable";
        }
        that.baseActivate($.extend({}, ctxt, {
            success:function(){
                ctxt.success({enableNavigation: false});
            }
        }));
    }
});
promptTypes.instances = promptTypes.base.extend({
    type:"instances",
    hideInHierarchy: true,
    valid: true,
    templatePath: "templates/instances.handlebars",
    events: {
        "click .openInstance": "openInstance",
        "click .deleteInstance": "deleteInstance",
        "click .createInstance": "createInstance"
    },
    onActivate: function(ctxt) {
        var that = this;
		ctxt.append("prompts." + this.type + ".onActivate", "px: " + this.promptIdx);
        database.withDb($.extend({},ctxt,{success:function() {
            $.extend(that.renderContext, {
                formTitle: database.getTableMetaDataValue('formTitle'),
                headerImg: opendatakit.baseDir + 'img/form_logo.png'
            });
            that.baseActivate($.extend({}, ctxt, {
                success:function(){
                    ctxt.success({
                        showHeader: false,
                        enableNavigation:false,
                        showFooter:false
                    });
                }
            }));
        }}), function(transaction) {
            var ss = database.getAllFormInstancesStmt();
            transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
                that.renderContext.instances = [];
                console.log('test');
                for ( var i = 0 ; i < result.rows.length ; i+=1 ) {
                    var instance = result.rows.item(i);
                    that.renderContext.instances.push({
                        instanceName: instance.instanceName,
                        instance_id: instance.id,
                        last_saved_timestamp: new Date(instance.timestamp),
                        saved_status: instance.saved,
                        locale: instance.locale,
                        xml_publish_status: instance.xmlPublishStatus,
                        xml_publish_timestamp: instance.xmlPublishTimestamp
                    });
                }
            });
        });
    },
    createInstance: function(evt){
        var ctxt = controller.newContext(evt);
        ctxt.append("prompts." + this.type + ".createInstance", "px: " + this.promptIdx);
        evt.stopPropagation(true);
        opendatakit.openNewInstanceId(ctxt, null);
    },
    openInstance: function(evt) {
        var ctxt = controller.newContext(evt);
        ctxt.append("prompts." + this.type + ".openInstance", "px: " + this.promptIdx);
        evt.stopPropagation(true);
        opendatakit.openNewInstanceId(ctxt, $(evt.target).attr('id'));
    },
    deleteInstance: function(evt){
        var ctxt = controller.newContext(evt);
        ctxt.append("prompts." + this.type + ".deleteInstance", "px: " + this.promptIdx);
        var that = this;
        database.delete_all($.extend({}, ctxt,{
                    success:function() {
                        that.onActivate($.extend({}, ctxt,{
                            success:function(){that.render();ctxt.success();}}));
                }}), 
                database.getTableMetaDataValue('formId'), $(evt.target).attr('id'));
    }
});
promptTypes.hierarchy = promptTypes.base.extend({
    type:"hierarchy",
    hideInHierarchy: true,
    valid: true,
    templatePath: 'templates/hierarchy.handlebars',
    events: {
    },
    onActivate: function(ctxt) {
        this.renderContext.prompts = controller.prompts;
        this.baseActivate($.extend({}, ctxt, {
            success:function(){
                ctxt.success({showHeader: false, showFooter: false});
            }
        }));
    }
});
promptTypes.repeat = promptTypes.base.extend({
    type: "repeat",
    valid: true,
    templatePath: 'templates/repeat.handlebars',
    events: {
        "click .openInstance": "openInstance",
        "click .deleteInstance": "deleteInstance",
        "click .addInstance": "addInstance"
    },
    onActivate: function(ctxt) {
        var that = this;
        var subsurveyType = this.param;
        ctxt.append("prompts." + this.type + ".onActivate", "px: " + this.promptIdx);
        database.withDb(ctxt, function(transaction) {
            //TODO: Make statement to get all subsurveys with this survey as parent.
            var ss = database.getAllFormInstancesStmt();
            transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
                that.renderContext.instances = [];
                console.log('test');
                for ( var i = 0 ; i < result.rows.length ; i+=1 ) {
                    that.renderContext.instances.push(result.rows.item(i));
                }
            });
        });
    },
    openInstance: function(evt) {
        var instanceId = $(evt.target).attr('id');
    },
    deleteInstance: function(evt) {
        var instanceId = $(evt.target).attr('id');
    },
    addInstance: function(evt) {
        //TODO: Launch new instance of collect
    }
});
promptTypes.select = promptTypes.select_multiple = promptTypes.base.extend({
    type: "select",
    datatype: "string",
    templatePath: "templates/select.handlebars",
    events: {
        "change input": "modification"
    },
    choiceFilter: function(){ return true; },
    updateRenderValue: function(formValue) {
        var that = this;
        //that.renderContext.value = formValue;
        var filteredChoices = _.filter(that.renderContext.choices, function(choice){
            return that.choiceFilter(choice);
        });
        if ( !formValue ) {
            that.renderContext.choices = _.map(filteredChoices, function(choice) {
                choice.checked = false;
                return choice;
            });
            return;
        }
        that.renderContext.choices = _.map(filteredChoices, function(choice) {
            choice.checked = _.any(formValue, function(valueObject) {
                return choice.name === valueObject.value;
            });
            return choice;
        });
        var otherObject = _.find(formValue, function(valueObject) {
            return (that.name + 'OtherValue' === valueObject.value);
        })
        that.renderContext.other = {
            value: otherObject ? otherObject.value : '',
            checked: _.any(formValue, function(valueObject) {
                return (that.name + 'Other' === valueObject.name);
            })
        };
        console.log(that.renderContext);
    },
    generateSaveValue: function(jsonFormSerialization) {
        return jsonFormSerialization ? JSON.stringify(jsonFormSerialization) : null;
    },
    parseSaveValue: function(savedValue){
        return savedValue ? JSON.parse(savedValue) : null;
    },
    // TODO: choices should be cloned and allow calculations in the choices
    // perhaps a null 'name' would drop the value from the list of choices...
    // could also allow calculations in the 'checked' and 'value' fields.
    modification: function(evt) {
        var ctxt = controller.newContext(evt);
        ctxt.append("prompts." + this.type + ".modification", "px: " + this.promptIdx);
        var that = this;
        console.log("select modification");
        console.log(this.$('form').serializeArray());
        var formValue = (this.$('form').serializeArray());
        this.setValue($.extend({}, ctxt, {
            success: function() {
                that.updateRenderValue(formValue);
                that.render();
                ctxt.success();
            }
        }), this.generateSaveValue(formValue));
    },
    onActivate: function(ctxt) {
        var that = this;
        var saveValue = that.parseSaveValue(that.getValue());
        var query;
        if(that.param in that.form.queries) {
            query = that.form.queries[that.param];
            //TODO: Come up with a tables uri and when we get that kind of uri do tables queries.
            $.ajax({
                "type": 'GET',
                "url": query.uri(),
                "dataType": 'json',
                "data": {},
                "success": function(result){
                    that.renderContext.choices = query.callback(result);
                    that.updateRenderValue(saveValue);
                    that.baseActivate(ctxt);
                },
                "error": function(e){
                    console.error(e);
                    alert('Could not get remote data');
                }
            });
            return;
        } else if (that.param in that.form.choices) {
            //Very important.
            //We need to clone the choices so their values are unique to the prompt.
            that.renderContext.choices = _.map(that.form.choices[that.param], _.clone);
        }
        that.updateRenderValue(saveValue);
        that.baseActivate(ctxt);
    }
});
promptTypes.select_one = promptTypes.select.extend({
    renderContext: {
        select_one: true
    },
    events: {
        "change input": "modification",
        "click .deselect": "deselect"
    },
    deselect: function(evt) {
        var ctxt = controller.newContext(evt);
        ctxt.append("prompts." + this.type + ".deselect", "px: " + this.promptIdx);
        var that = this;
        this.setValue($.extend({}, ctxt, {
            success: function() {
                that.updateRenderValue(null);
                that.render();
                ctxt.success();
            }
        }), null);
    },
    generateSaveValue: function(jsonFormSerialization) {
        if(jsonFormSerialization){
            if(jsonFormSerialization.length > 0){
                return jsonFormSerialization[0].value;
            }
        }
        return null;
    },
    parseSaveValue: function(savedValue){
        return [{"name": this.name, "value": savedValue}];
    }
});
promptTypes.select_one_or_other = promptTypes.select_one.extend({
    renderContext: {
        select_one: true,
        or_other: true
    }
});
promptTypes.select_or_other = promptTypes.select.extend({
    renderContext: {
        or_other: true
    }
});
promptTypes.input_type = promptTypes.text = promptTypes.base.extend({
    type: "text",
    datatype: "string",
    templatePath: "templates/input_type.handlebars",
    renderContext: {
        "type": "text"
    },
    events: {
        "change input": "modification",
        "swipeleft .input-container": "stopPropagation",
        "swiperight .input-container": "stopPropagation"
    },
    //a debounced function will postpone execution until after wait (parameter 2)
    //milliseconds have elapsed since the last time it was invoked.
    //Useful for sliders.
    //It might be better to listen for the jQm event for when a slider is released.
    //This could cause problems since the debounced function could fire after a page change.
    debouncedRender: _.debounce(function() {
        this.render();
    }, 500),
    //This has to be debounced for the slider to work.
    //However, debouncing might cause an event ordering problem in screen groups
    //if a select is clicked to unfocus an input box.
    modification: _.debounce(function(evt) {
        var value = $(evt.target).val();
        var that = this;
        var ctxt = controller.newContext(evt);
        ctxt.append("prompts." + that.type + ".modification", "px: " + that.promptIdx);
        var renderContext = that.renderContext;
        that.setValue($.extend({}, ctxt, {
            success: function() {
                renderContext.value = value;
                renderContext.invalid = !that.validateValue();
                that.debouncedRender();
                ctxt.success();
            },
            failure: function() {
                renderContext.value = value;
                renderContext.invalid = true;
                that.debouncedRender();
                ctxt.failure();
            }
        }), (value.length === 0 ? null : value));
    }, 500),
    onActivate: function(ctxt) {
        var renderContext = this.renderContext;
        var value = this.getValue();
        renderContext.value = value;
        this.baseActivate(ctxt);
    },
    beforeMove: function(ctxt) {
        var that = this;
        that.setValue(ctxt, this.$('input').val());
    },
    validateValue: function() {
        return true;
    }
});
promptTypes.integer = promptTypes.input_type.extend({
    type: "integer",
    datatype: "integer",
    baseInputAttributes: {
        'type':'number'
    },
    invalidMessage: "Integer value expected",
    validateValue: function() {
        return !isNaN(parseInt(this.getValue()));
    }
});
promptTypes.decimal = promptTypes.input_type.extend({
    type: "decimal",
    datatype: "number",
    //TODO: This doesn't seem to be working.
    baseInputAttributes: {
        'type':'number'
    },
    invalidMessage: "Numeric value expected",
    validateValue: function() {
        return !isNaN(parseFloat(this.getValue()));
    }
});
promptTypes.datetime = promptTypes.input_type.extend({
    type: "datetime",
    datatype: "string",
    baseInputAttributes: {
        'type':'datetime'
    },
    scrollerAttributes: {
        preset: 'datetime',
        theme: 'jqm'
        //Avoiding inline because there
        //can be some debouncing issues
        //display: 'inline',
        //Warning: mixed/clickpick mode doesn't work on galaxy nexus
        //mode: 'scroll'
    },
    events: {
        "change input": "modification",
        "swipeleft input": "stopPropagation",
        "swiperight input": "stopPropagation"
    },

    onActivate: function(ctxt) {
        var that = this;
        var renderContext = this.renderContext;
        var value = this.getValue();
        renderContext.value = value;
        require(["mobiscroll"], function() {
            $.scroller.themes.jqm.defaults = {
                jqmBody: 'd',
                jqmHeader:'d',
                jqmWheel: 'd',
                jqmClickPick: 'd',
                jqmSet: 'd',
                jqmCancel: 'd'
            };
            that.baseActivate(ctxt);
        });
    },
    //TODO: This will have problems with image labels.
    render: function() {
        var that = this;
        that.$el.html(that.template(that.renderContext));
        //Triggering create seems to prevent some issues where jQm styles are not applied.
        that.$el.trigger('create');
        that.$('input').scroller(that.scrollerAttributes);
        return this;
    }
});
promptTypes.date = promptTypes.datetime.extend({
    type: "date",
    baseInputAttributes: {
        'type':'date'
    },
    scrollerAttributes: {
        preset: 'date',
        theme: 'jqm'
    }
});
promptTypes.time = promptTypes.datetime.extend({
    type: "time",
    baseInputAttributes: {
        'type':'time'
    },
    scrollerAttributes: {
        preset: 'time',
        theme: 'jqm'
    }
});
/**
 * Media is an abstract object used as a base for image/audio/video
 */
promptTypes.media = promptTypes.base.extend({
    type: "media",
    events: {
        "click .captureAction": "capture"
    },
    getCallback: function(ctxt, bypath, byaction) {
        var that = this;
        return function(ctxt, path, action, jsonString) {
            ctxt.append("prompts." + this.type + 'getCallback.actionFn', "px: " + this.promptIdx + " action: " + action);
            var jsonObject = JSON.parse(jsonString);
            if (jsonObject.status == -1 /* Activity.RESULT_OK */ ) {
                ctxt.append("prompts." + this.type + 'getCallback.actionFn.resultOK', "px: " + this.promptIdx + " action: " + action);
                var mediaPath = (jsonObject.result !== null) ? jsonObject.result.mediaPath : null;
                if (mediaPath !== null) {
                    var oldPath = database.getDataValue(that.name);
                    if ( mediaPath != oldPath) {
                        // TODO: delete old??? Or leave until marked as finalized?
                        // TODO: I'm not sure how the resuming works, but we'll need to make sure
                        // onActivate get's called AFTER this happens.
                        database.setData( ctxt, that.name, "file", mediaPath);
                    }
                }
            }
            else {
                ctxt.append("prompts." + this.type + 'getCallback.actionFn.failureOutcome', "px: " + this.promptIdx + " action: " + action);
                console.log("failure returned");
                alert(jsonObject.result);
                ctxt.failure();
            }
        };
    }
});
promptTypes.image = promptTypes.media.extend({
    type: "image",
    datatype: "image",
    label: 'Take your photo:',
    templatePath: "templates/image.handlebars",
    onActivate: function(ctxt) {
        var that = this;
        var value = that.getValue();
        that.renderContext.mediaPath = value;
        that.renderContext.uriValue = opendatakit.asUri(ctxt, value, 'img');
        this.baseActivate(ctxt);
    },
    capture: function(evt) {
        var ctxt = controller.newContext(evt);
        var platInfo = opendatakit.getPlatformInfo(ctxt);
        if (platInfo.container == 'Android') {
            // TODO: is this the right sequence?
            var outcome = collect.doAction('' + this.promptIdx, 'takePicture', 'org.opendatakit.collect.android.activities.MediaCaptureImageActivity', null);
            ctxt.append('media.capture', platInfo.container + " outcome is " + outcome);
            if (outcome === null || outcome !== "OK") {
                alert("Should be OK got >" + outcome + "<");
                ctxt.failure();
            } else {
                ctxt.success();
            }
        }
        else {
            ctxt.append('media.capture.disabled', platInfo.container);
            // TODO: enable file chooser???
            alert("Not running on Android -- disabled");
            ctxt.failure();
        }
    }
});
promptTypes.video = promptTypes.media.extend({
    type: "video",
    label: 'Take your video:',
    templatePath: "templates/video.handlebars",
    onActivate: function(ctxt) {
        var that = this;
        var value = that.getValue();
        if (value != null && value.length != 0) {
            that.renderContext.uriValue = opendatakit.asUri(ctxt, value, 'video', 'src');
            that.renderContext.videoPoster = opendatakit.asUri(ctxt, opendatakit.baseDir + "img/play.png", 'video', 'poster');
        }
        this.baseActivate(ctxt);
    },
    capture: function(evt) {
        var ctxt = controller.newContext(evt);
        var platInfo = opendatakit.getPlatformInfo(ctxt);
        if (platInfo.container == 'Android') {
         // TODO: is this the right sequence?
            var outcome = collect.doAction('' + this.promptIdx, 'takeVideo', 'org.opendatakit.collect.android.activities.MediaCaptureVideoActivity', null);
            ctxt.append('media.capture', platInfo.container + " outcome is " + outcome);
            console.log("button click outcome is " + outcome);
            if (outcome === null || outcome !== "OK") {
                alert("Should be OK got >" + outcome + "<");
                ctxt.failure();
            } else {
                ctxt.success();
            }
        }
        else {
            ctxt.append('media.capture.disabled', platInfo.container);
            // TODO: enable file chooser???
            alert("Not running on Android -- disabled");
            ctxt.failure();
        }
    }
});
promptTypes.audio = promptTypes.media.extend({
    type: "audio",
    datatype: "audio",
    templatePath: "templates/audio.handlebars",
    label: 'Take your audio:',
    capture: function(evt) {
        var ctxt = controller.newContext(evt);
        var platInfo = opendatakit.getPlatformInfo(ctxt);
        if (platInfo.container == 'Android') {
            // TODO: is this the right sequence?
            var outcome = collect.doAction('' + this.promptIdx, 'takeAudio', 'org.opendatakit.collect.android.activities.MediaCaptureAudioActivity', null);
            ctxt.append('media.capture', platInfo.container + " outcome is " + outcome);
            console.log("button click outcome is " + outcome);
            if (outcome === null || outcome !== "OK") {
                alert("Should be OK got >" + outcome + "<");
                ctxt.failure();
            } else {
                ctxt.success();
            }
        }
        else {
            ctxt.append('media.capture.disabled', platInfo.container);
            // TODO: enable file chooser???
            alert("Not running on Android -- disabled");
            ctxt.failure();
        }
    }

});
/*
promptTypes.geopoint = promptTypes.base.extend({
    type: "geopoint",
    datatype: "geopoint",
    label: 'Capture geopoint:',
    templatePath: "templates/geopoint.handlebars",
    events: {
        "click .captureAction": "capture"
    },
    onActivate: function(ctxt) {
        var that = this;
        var value = that.getValue();
        that.renderContext.value = value;
        this.baseActivate(ctxt);
    },
    capture: function(evt) {
        var ctxt = controller.newContext(evt);
        var platInfo = opendatakit.getPlatformInfo(ctxt);
        if (true || platInfo.container == 'Android') {
            // TODO: is this the right sequence?
            var outcome = collect.doAction('' + this.promptIdx, 'captureGeopoint', 'org.opendatakit.collect.android.activities.GeoPointActivity', null);
            ctxt.append('geopoint.capture', platInfo.container + " outcome is " + outcome);
            if (outcome === null || outcome !== "OK") {
                alert("Should be OK got >" + outcome + "<");
                ctxt.failure();
            } else {
                ctxt.success();
            }
        } else {
            ctxt.append('geopoint.capture.disabled', platInfo.container);
            alert("Not running on Android -- disabled");
            ctxt.failure();
        }
    },
    getCallback: function(ctxt, bypath, byaction) {
        var that = this;
        return function(ctxt, path, action, jsonString) {
            ctxt.append("prompts." + this.type + 'getCallback.actionFn', "px: " + this.promptIdx + " action: " + action);
            try {
                var jsonObject = JSON.parse(jsonString);
            } catch (e) {
                alert("Could not parse: " + jsonString);
            }
            if (jsonObject.status == -1 ) { // Activity.RESULT_OK
                ctxt.append("prompts." + this.type + 'getCallback.actionFn.resultOK', "px: " + this.promptIdx + " action: " + action);
                var geopoint = (jsonObject.result !== null) ? jsonObject.result.mediaPath : null;
                if (geopoint !== null) {
                    var oldGeopoint = database.getDataValue(that.name);
                    if ( geopoint != oldGeopoint) {
                        // TODO: delete old??? Or leave until marked as finalized?
                        // TODO: I'm not sure how the resuming works, but we'll need to make sure
                        // onActivate get's called AFTER this happens.
                        database.setData( ctxt, that.name, "file", geopoint);
                    }
                }
            }
            else {
                ctxt.append("prompts." + this.type + 'getCallback.actionFn.failureOutcome', "px: " + this.promptIdx + " action: " + action);
                console.log("failure returned");
                alert(jsonObject.result);
                ctxt.failure();
            }
        };
    }
});
*/
//TODO: How do we store geopoints?
promptTypes.geopoint = promptTypes.input_type.extend({
    type: "geopoint",
    datatype: "geopoint",
    label: 'Capture geopoint:',
    templatePath: "templates/geopoint.handlebars",
    events: {
        "click .captureAction": "capture"
    },
    capture: function(evt){
        var that = this;
        that.$('.status').text("Capturing...");
        that.$('.captureAction').addClass('ui-disabled');
        function success(position) {
            that.setValue($.extend({}, controller.newContext(evt), {
                success: function() {
                    that.renderContext.value = position;
                    that.render();
                }
            }), position);
        }
        function error(msg) {
            that.$('.status').val(typeof msg == 'string' ? msg : "failed");
            console.log(arguments);
        }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(success, error, {
                "enableHighAccuracy": true
            });
        } else {
            error('not supported');
        }
    },
    onActivate: function(ctxt) {
        var that = this;
        var value = that.getValue();
        that.renderContext.value = value;
        this.baseActivate(ctxt);
    }
});
//TODO: Bundle this with the form.
promptTypes.pulseox = promptTypes.base.extend({
    type: "pulseox",
    datatype: "pulseox",
    label: 'Capture pulseOx:',
    templatePath: "templates/launchIntent.handlebars",
    events: {
        "click .captureAction": "capture"
    },
    onActivate: function(ctxt) {
        var that = this;
        var value = that.getValue();
        that.renderContext.value = value;
        this.baseActivate(ctxt);
    },
    capture: function(evt) {
        var ctxt = controller.newContext(evt);
        var platInfo = opendatakit.getPlatformInfo(ctxt);
        if (true || platInfo.container == 'Android') {
            // TODO: is this the right sequence?
            var outcome = collect.doAction('' + this.promptIdx, 'capturePulseOx', 'org.opendatakit.collect.android.activities.PulseOxActivity', null);
            ctxt.append('geopoint.capture', platInfo.container + " outcome is " + outcome);
            if (outcome === null || outcome !== "OK") {
                alert("Should be OK got >" + outcome + "<");
                ctxt.failure();
            } else {
                ctxt.success();
            }
        } else {
            ctxt.append('geopoint.capture.disabled', platInfo.container);
            alert("Not running on Android -- disabled");
            ctxt.failure();
        }
    },
    getCallback: function(ctxt, bypath, byaction) {
        var that = this;
        return function(ctxt, path, action, jsonString) {
            ctxt.append("prompts." + this.type + 'getCallback.actionFn', "px: " + this.promptIdx + " action: " + action);
            try {
                var jsonObject = JSON.parse(jsonString);
            } catch (e) {
                alert("Could not parse: " + jsonString);
            }
            if (jsonObject.status == -1 /* Activity.RESULT_OK */ ) {
                ctxt.append("prompts." + this.type + 'getCallback.actionFn.resultOK', "px: " + this.promptIdx + " action: " + action);
                var geopoint = (jsonObject.result !== null) ? jsonObject.result.mediaPath : null;
                if (geopoint !== null) {
                    var oldGeopoint = database.getDataValue(that.name);
                    if ( geopoint != oldGeopoint) {
                        // TODO: delete old??? Or leave until marked as finalized?
                        // TODO: I'm not sure how the resuming works, but we'll need to make sure
                        // onActivate get's called AFTER this happens.
                        database.setData( ctxt, that.name, "file", geopoint);
                    }
                }
            }
            else {
                ctxt.append("prompts." + this.type + 'getCallback.actionFn.failureOutcome', "px: " + this.promptIdx + " action: " + action);
                console.log("failure returned");
                alert(jsonObject.result);
                ctxt.failure();
            }
        };
    }
});
promptTypes.screen = promptTypes.base.extend({
    type: "screen",
    prompts: [],
    initialize: function() {
        var that = this;
        this.prompts = builder.initializePrompts(this.prompts);
        //Wire up the prompts so that if any of them rerender the screen rerenders.
        //TODO: Think about whether there is a better way of doing this.
        //Maybe bind this or subprompts to database change events instead?
        _.each(this.prompts, function(prompt){
            prompt._screenRender = prompt.render;
            prompt.render = function(){
                that.render();
            };
        });
        this.initializeTemplate();
        this.initializeRenderContext();
        this.afterInitialize();
    },
    isInitializeComplete: function() {
        var i;
        for ( i = 0 ; i < this.prompts.length; ++i ) {
            var p = this.prompts[i];
            if ( !p.isInitializeComplete() ) return false;
        }
        return true;
    },
	getActivePrompts: function(context) {
        var that = this;
        var subPrompts;
        subPrompts = _.filter(that.prompts, function(prompt) {
			try {
				if('condition' in prompt) {
					return prompt.condition();
				}
			} catch (e) {
				if ( context ) {
					context.append('prompts.screen.getActivePrompts.condition.exception', e);
				} else {
					console.error('prompts.screen.getActivePrompts.condition.exception: ' + e);
				}
				return false;
			}
            return true;
        });
		return subPrompts;
	},
    beforeMove: function(context) {
        var that = this;
        var subPrompts, subPromptContext;
        subPrompts = that.getActivePrompts(context);
        subPromptContext = $.extend({},context,{
            success: _.after(subPrompts.length, context.success),
            failure: _.once(context.failure)
        });
        $.each(subPrompts, function(idx, prompt){
            prompt.beforeMove(subPromptContext);
        });
    },
    validate: function(context) {
        var that = this;
        var subPrompts, subPromptContext;
        subPrompts = that.getActivePrompts(context);
        subPromptContext = $.extend({},context,{
            success: _.after(subPrompts.length, context.success),
            failure: _.once(context.failure)
        });
        $.each(subPrompts, function(idx, prompt){
            prompt.validate(subPromptContext);
        });
    },
    onActivate: function(ctxt) {
        var that = this;
        var subPromptsReady = _.after(this.prompts.length, function () {
            ctxt.success();
        });
        _.each(this.prompts, function(prompt){
            prompt.onActivate($.extend({}, ctxt, {
                success:function() {
                    subPromptsReady(ctxt);
                }
            }));
        });
    },
    render: function(){
		var that = this;
		var subPrompts = that.getActivePrompts();
        this.$el.html('<div class="odk odk-prompts">');
        var $prompts = this.$('.odk-prompts');
        $.each(subPrompts, function(idx, prompt){
            //prompt.render();
            prompt._screenRender();
            if(!prompt.$el){
                alert("Sub-prompt has not been rendered. See console for details.");
                console.error("Prompts must have synchronous render functions. Don't debounce them or launch async calls before el is set.");
                console.error(prompt);
            }
            $prompts.append(prompt.$el);
            prompt.delegateEvents();
        });
        this.$el.trigger('create');
    }
});
promptTypes.label = promptTypes.base.extend({
    type: "label",
    isInitializeComplete: function() {
        return true;
    },
    onActivate: function(ctxt){
        alert("label.onActivate: Should never be called!");
        ctxt.failure();
    }
});
promptTypes.goto = promptTypes.base.extend({
    type: "goto",
    hideInHierarchy: true,
    isInitializeComplete: function() {
        return true;
    },
    onActivate: function(ctxt) {
        alert("goto.onActivate: Should never be called!");
        ctxt.failure();
    }
});
//TODO: Remove
promptTypes.goto_if = promptTypes.base.extend({
    type: "goto_if",
    hideInHierarchy: true,
    isInitializeComplete: function() {
        return true;
    },
    condition: function(){
        return false;
    },
    onActivate: function(ctxt) {
        alert("goto_if.onActivate: Should never be called!");
        ctxt.failure();
    }
});
promptTypes.note = promptTypes.base.extend({
    type: "note",
    templatePath: "templates/note.handlebars"
});
promptTypes.acknowledge = promptTypes.select.extend({
    type: "acknowledge",
    autoAdvance: false,
    modification: function(evt) {
        var ctxt = controller.newContext(evt);
        ctxt.append('acknowledge.modification', this.promptIdx);
        var that = this;
        var acknowledged = this.$('#acknowledge').is(':checked');
        this.setValue($.extend({}, ctxt, {
            success: function() {
                that.renderContext.choices = [{
                    "name": "acknowledge",
                    "label": "Acknowledge",
                    "checked": acknowledged
                }];
                if (acknowledged && that.autoAdvance) {
                    controller.gotoNextScreen(ctxt);
                }
                else {
                    ctxt.success();
                }
            }
        }), acknowledged);
    },
    onActivate: function(ctxt) {
        var that = this;
        var acknowledged;
        try{
            acknowledged = JSON.parse(that.getValue());
        } catch(e) {
            acknowledged = false;
        }
        that.renderContext.choices = [{
            "name": "acknowledge",
            "label": "Acknowledge",
            "checked": acknowledged
        }];
        this.baseActivate(ctxt);
    }
});
promptTypes.with_next = promptTypes.base.extend({
    type: "with_next",
    hideInHierarchy: true,
    assignToValue: function(ctxt){
        var that = this;
		var value;
		try {
			value = that.assign();
		} catch (e) {
			ctxt.append('prompts.'+that.type+'.assignToValue.assign.exception', e);
			ctxt.failure();
			return;
		}
		that.setValue(ctxt, value);
    }
});

//Ensure all prompt type names are lowercase.
_.each(_.keys(promptTypes), function(promptTypeName){
    if(promptTypeName !== promptTypeName.toLowerCase()) {
        alert("Invalid prompt type name: " + promptTypeName);
    }
});

});
