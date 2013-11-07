'use strict';
/**
* circular dependency: 
*
* Responsibilities:
*    Performs the actions necessary to make a prompt visible on the screen (setScreen).
*    Receives click and swipe events for navigating across pages.
*    Displays pop-up dialogs and toasts.
*    Displays the options dialog for changing languages and navigations.
*/
define(['screenTypes','opendatakit','controller','backbone','jquery','underscore','handlebars','jqmobile','handlebarsHelpers', 'translations'], 
function(screenTypes,  opendatakit,  controller,  Backbone,  $,       _,           Handlebars, _jqmobile, _hh, translations) {
verifyLoad('screens',
    ['screenTypes','opendatakit','controller','backbone','jquery','underscore','handlebars','jqmobile','handlebarsHelpers', 'translations'],
    [screenTypes,   opendatakit,  controller,  Backbone,  $,       _,           Handlebars,  _jqmobile, _hh, translations]);

screenTypes.waiting = Backbone.View.extend({
    type: "waiting",
    controller: controller,
    templatePath: "templates/waiting.handlebars",
    //renderContext is static data for the dynamic _renderContext object 
    // that is passed into the render function.
    renderContext: {showContents: false, dataTheme: "d"},
    baseInputAttributes: {},
    //inputAttributes overrides baseInputAttributes
    inputAttributes: {},
    // _section_name...
    // _row_num...
    activePrompts: [],
    initialize: function(args) {
        var that = this;
        $.extend(this, args);
    },
    getActivePrompts: function(context) {
        return activePrompts;
    },
    getScreenPath: function() {
        return this._section_name + '/' + this._op.operationIdx;
    },
    getJqmScreen: function() {
        return this.$el.find(".odk-screen");
    },
    whenTemplateIsReady: function(ctxt){
        var that = this;
        if(this.template) {
            ctxt.success();
        } else if(this.templatePath) {
            try {
                require(['text!'+this.templatePath], function(source) {
                    try {
                        that.template = Handlebars.compile(source);
                        // ensure that require is unwound
                        setTimeout(function() { ctxt.success(); }, 0 );
                    } catch (e) {
                        ctxt.append("screens."+that.type+
                            ".whenTemplateIsReady.exception", e);
                        console.error("screens."+that.type+
                            ".whenTemplateIsReady.exception " + String(e) +
                            " px: " + that.promptIdx);
                        ctxt.failure({message: "Error compiling handlebars template."});
                    }
                }, function(err) {
                    ctxt.append("screens."+that.type+
                        ".whenTemplateIsReady.require.failure " + err.requireType + " modules: ", err.requireModules);
                    shim.log('E',"screens."+that.type+
                        ".whenTemplateIsReady.require.failure " + err.requireType + " modules: " + err.requireModules.toString());
                    ctxt.failure({message: "Error loading handlebars template (" + err.requireType + ")."});
                });
            } catch (e) {
                ctxt.append("screens."+that.type+
                    ".whenTemplateIsReady.require.exception", e);
                console.error("screens."+that.type+
                    ".whenTemplateIsReady.require.exception " + String(e) +
                    " px: " + that.promptIdx);
                ctxt.failure({message: "Error reading handlebars template."});
            }
        } else {
            ctxt.append("screens." + that.type +
                ".whenTemplateIsReady.noTemplate", "px: " + that.promptIdx);
            console.error("screens."+that.type+
                ".whenTemplateIsReady.noTemplate px: " + that.promptIdx);
            ctxt.failure({message: "Configuration error: No handlebars template found!"});
        }
    },
    initializeRenderContext: function() {
        //Object.create is used because we don't want to modify the class's render context.
        this._renderContext = Object.create(this.renderContext);
        this._renderContext.inputAttributes = 
                $.extend({}, this.baseInputAttributes, this.inputAttributes);
    },
    buildRenderContext: function(ctxt) {
        var that = this;
        that.whenTemplateIsReady($.extend({}, ctxt, {success:function() {
            that.initializeRenderContext();
            ctxt.success();
        }}));
    },
    /**
     * stopPropagation is used in the events map to disable swiping on various elements
     **/
    stopPropagation: function(evt){
        var ctxt = this.controller.newContext(evt);
        ctxt.append("screens." + this.type + ".stopPropagation", "px: " + this.promptIdx);
        shim.log("D","screens." + this.type + ".stopPropagation px: " + this.promptIdx + "evt: " + evt);
        evt.stopImmediatePropagation();
        ctxt.success();
    },
    reRender: function(ctxt) {
        var that = this;
        that.buildRenderContext($.extend({},ctxt,{success:function() {
            that.render($.extend({},ctxt,{success:function() {
                that.$el.trigger('create');
                that.afterRender(ctxt);
            }}));
        }}));
    },
    afterRender: function(ctxt) {
        ctxt.success();
    },
    render: function(ctxt) {
        var that = this;
        // TODO: understand what Nathan was trying to do here with a virtual element.
        try {
            var tmplt = that.template(that._renderContext);
            that.$el.html(tmplt);
            that.$el.attr('data-theme', that._renderContext.dataTheme);
            that.$el.attr('data-content-theme', that._renderContext.dataTheme);
            that.$el.attr('data-role','page');
        } catch(e) {
            console.error("screens." + that.type + ".render.exception: " +
                            String(e) + ' px: ' + that.promptIdx);
            console.error(that);
            alert("Error in template.");
        }
        ctxt.success();
    },
    recursiveUndelegateEvents: function() {
        var that = this;
        that.undelegateEvents();
        $.each(that.activePrompts, function(idx, prompt){
            prompt.undelegateEvents();
        });
    },
    recursiveDelegateEvents: function() {
        var that = this;
        $.each(that.activePrompts, function(idx, prompt){
            prompt.delegateEvents();
        });
        that.delegateEvents();
    },
    /**
     * Give the prompts a chance to save their state to the database.
     * Also, enable the screen to enforce its own criteria for when it
     * is allowable to move off the screen. E.g., after saving or 
     * rolling back all changes.
     */
    beforeMove: function(isStrict, advancing, validateValues) {
        return null;
    }
});

screenTypes.screen = Backbone.View.extend({
    type: "screen",
    controller: controller,
    templatePath: "templates/navbar.handlebars",
    //renderContext is static data for the dynamic _renderContext object 
    // that is passed into the render function.
    renderContext: {showContents: true, dataTheme: "d"},
    baseInputAttributes: {},
    //inputAttributes overrides baseInputAttributes
    inputAttributes: {},
    // _section_name...
    // _row_num...
    activePrompts: [],
    initialize: function(args) {
        var that = this;
        $.extend(this, args);
    },
    getActivePrompts: function(context) {
        return activePrompts;
    },
    getScreenPath: function() {
        return this._section_name + '/' + this._op.operationIdx;
    },
    getJqmScreen: function() {
        return this.$(".odk-screen");
    },
    whenTemplateIsReady: function(ctxt){
        var that = this;
        if(this.template) {
            ctxt.success();
        } else if(this.templatePath) {
            try {
                require(['text!'+this.templatePath], function(source) {
                    try {
                        that.template = Handlebars.compile(source);
                        ctxt.success();
                    } catch (e) {
                        ctxt.append("screens."+that.type+
                            ".whenTemplateIsReady.exception", e);
                        console.error("screens."+that.type+
                            ".whenTemplateIsReady.exception " + String(e));
                        ctxt.failure({message: "Error compiling handlebars template."});
                    }
                }, function(err) {
                    ctxt.append("screens."+that.type+
                        ".whenTemplateIsReady.require.failure " + err.requireType + " modules: ", err.requireModules);
                    console.error("screens."+that.type+
                        ".whenTemplateIsReady.require.failure " + err.requireType + " modules: " + err.requireModules.toString());
                    ctxt.failure({message: "Error loading handlebars template (" + err.requireType + ")."});
                });
            } catch (e) {
                ctxt.append("screens."+that.type+
                    ".whenTemplateIsReady.require.exception", e);
                console.error("screens."+that.type+
                    ".whenTemplateIsReady.require.exception " + String(e) +
                    " px: " + that.promptIdx);
                ctxt.failure({message: "Error reading handlebars template."});
            }
        } else {
            ctxt.append("screens." + that.type +
                ".whenTemplateIsReady.noTemplate", "px: " + that.promptIdx);
            console.error("screens."+that.type+
                ".whenTemplateIsReady.noTemplate px: " + that.promptIdx);
            ctxt.failure({message: "Configuration error: No handlebars template found!"});
        }
    },
    initializeRenderContext: function() {
        //Object.create is used because we don't want to modify the class's render context.
		this._renderContext = Object.create(this.renderContext);
        if ( this.display == null ) {
            var section = opendatakit.getSettingObject(opendatakit.getCurrentFormDef(), this._section_name);
            this._renderContext.display = section.display;
        } else {
            this._renderContext.display = this.display;
        }
        var locales = opendatakit.getFormLocalesValue();
        this._renderContext.disabled = this.disabled;
        this._renderContext.form_title = this.controller.getSectionTitle();
        this._renderContext.locales = locales;
        this._renderContext.hasTranslations = (locales.length > 1);
        this._renderContext.showHeader = true;
        this._renderContext.showFooter = false;
        this._renderContext.showContents = this.controller.getSectionShowContents();
        this._renderContext.enableForwardNavigation = true;
        this._renderContext.enableBackNavigation = true;
        this._renderContext.enableNavigation = true;

        //It's probably not good to get data like this in initialize
        //Maybe it would be better to use handlebars helpers to get metadata?
        this._renderContext.form_version = opendatakit.getSettingValue('form_version');
        this._renderContext.inputAttributes = 
                $.extend({}, this.baseInputAttributes, this.inputAttributes);
    },
    configureRenderContext: function(ctxt) {
        var that = this;
        // We do not support dependent default values within screen groups.
        // If we are to do so, we will need to add code here to ensure
        // their on activate functions are called in the right order.
        var subPromptsReady = _.after(that.activePrompts.length, function () {
            ctxt.success();
        });
        _.each(that.activePrompts, function(prompt){
            prompt.buildRenderContext($.extend({}, ctxt, {success:function() {
                    subPromptsReady(ctxt);
                }
            }));
        });
    },
    buildRenderContext: function(ctxt) {
        var that = this;
        // this once held the code to invoke with_next and with_next_validate actions
        that.whenTemplateIsReady($.extend({}, ctxt, {success:function() {
            // determine the active prompts
            that.activePrompts = []; // clear all prompts...
            var activePromptIndices = that._operation._screen_block();
            var sectionPrompts = that.controller.getCurrentSectionPrompts();
            var ap = [];
            var i;
            for ( i = 0 ; i < activePromptIndices.length ; ++i ) {
                var prompt = sectionPrompts[activePromptIndices[i]];
                if ( prompt == null ) {
                    ctxt.append("Error! unable to resolve prompt!");
                    ctxt.failure({message: "bad prompt index!"});
                    return;
                }
                prompt._screen = that;
                ap.push(prompt);
            }
            that.activePrompts = ap;
            // we now know what we are going to render.
            // work with the controller to ensure that all
            // intermediate state has been written to the 
            // database before commencing the rendering
            that.controller.commitChanges($.extend({},ctxt,{success:function() {
                    that.initializeRenderContext();
                    that.configureRenderContext(ctxt);
            }}));
        }}));
    },
    /**
     * stopPropagation is used in the events map to disable swiping on various elements
     **/
    stopPropagation: function(evt){
        var ctxt = this.controller.newContext(evt);
        ctxt.append("screens." + this.type + ".stopPropagation", "px: " + this.promptIdx);
        shim.log("D","screens." + this.type + ".stopPropagation px: " + this.promptIdx + "evt: " + evt);
        evt.stopImmediatePropagation();
        ctxt.success();
    },
    reRender: function(ctxt) {
        var that = this;
        that._screenManager.refreshScreen(ctxt);
    },
    afterRender: function(ctxt) {
        var that = this;
        $.each(that.activePrompts, function(idx, prompt){
            prompt.afterRender();
        });
        ctxt.success();
    },
    render: function(ctxt) {
        var that = this;
        // TODO: understand what Nathan was trying to do here with a virtual element.
        try {
            var tmplt = that.template(that._renderContext);
            that.$el.html(tmplt);
            that.$el.attr('data-theme', that._renderContext.dataTheme);
            that.$el.attr('data-content-theme', that._renderContext.dataTheme);
            that.$el.attr('data-role','page');
        } catch(e) {
            console.error("screens." + that.type + ".render.exception: " +
                            String(e) + ' px: ' + that.promptIdx);
            console.error(that);
            alert("Error in template.");
        }
        var $container = that.$('.odk-container');
        $.each(that.activePrompts, function(idx, prompt){
            prompt._render();
            if(!prompt.$el){
                console.error("render px: " + that.promptIdx + 
                    " Prompts must have synchronous render functions. " +
                    "Don't debounce them or launch async calls before el is set.");
                console.error(prompt);
                alert("Sub-prompt has not been rendered. See console for details.");
            }
            $container.append(prompt.$el);
        });
        ctxt.success();
    },
    recursiveUndelegateEvents: function() {
        var that = this;
        that.undelegateEvents();
        $.each(that.activePrompts, function(idx, prompt){
            prompt.undelegateEvents();
        });
    },
    recursiveDelegateEvents: function() {
        var that = this;
        $.each(that.activePrompts, function(idx, prompt){
            prompt.delegateEvents();
        });
        that.delegateEvents();
    },
    /**
     * allowMove
     *   advancing == true if the user is not going 'back'
     *
     * Return { outcome: true/false, message: 'failure message' }
     * to caller to indicate whether or not the screen allows the
     * user to move off of it.
     */
    allowMove: function(advancing) {
        return { outcome: true };
    },
    /**
     * Give the prompts a chance to save their state to the database.
     * Also, enable the screen to enforce its own criteria for when it
     * is allowable to move off the screen. E.g., after saving or 
     * rolling back all changes.
     */
    beforeMove: function(isStrict, advancing, validateValues) {
        var that = this;
        var allowMoveHandler = function(advancing) {
            var allowed = that.allowMove(advancing);
            if ( allowed.outcome ) {
                return null;
            } else {
                return { message: allowed.message };
            }
        };
        
        var beforeMoveError;
        for ( var i = 0; i < that.activePrompts.length; i ++)
        {
            beforeMoveError = that.activePrompts[i].beforeMove();
            if ( beforeMoveError != null ) {
                break;
            }
        }
        
        if ( beforeMoveError == null )
        {
            if ( validateValues ) {
                var validateError;
                for ( var i = 0; i < that.activePrompts.length; i++ )
                {
                    validateError = that.activePrompts[i]._isValid(isStrict);
                    if ( validateError != null ) { 
                        break; 
                    }
                }
                if ( validateError == null ) { 
                    allowMoveHandler(advancing); 
                } else {
                    return validateError;
                }
            } 
            else {
                allowMoveHandler(advancing);
            }
        } else {
            return beforeMoveError;
        }
    },
    __test__: function(evt){
        //This is a utility function for checking to make sure event maps are working.
        console.log(evt);
    }
    /*
    registerChangeHandlers: function() {
        // TODO: code that is executed after all page prompts are inserted into the DOM.
        // This code would, e.g., handle value-change events to propagate changes across
        // a page (e.g., update calculated fields).
    },
    //TODO: I can't find any refrences to these, so we should probably remove them.
    validationFailedAction: function(isMoveBackward) {
        alert(this.validationFailedMessage);
    },
    requiredFieldMissingAction: function(isMovingBackward) {
        alert(this.requiredFieldMissingMessage);
    }
    */
});

screenTypes.columns_2 = Backbone.View.extend({
    type: "columns_2",
    controller: controller,
    templatePath: "templates/navbar.handlebars",
    //renderContext is static data for the dynamic _renderContext object 
    // that is passed into the render function.
    renderContext: {showContents: true, dataTheme: "d"},
    baseInputAttributes: {},
    //inputAttributes overrides baseInputAttributes
    inputAttributes: {},
    // _section_name...
    // _row_num...
    activePrompts: [],
    initialize: function(args) {
        var that = this;
        $.extend(this, args);
    },
    getActivePrompts: function(context) {
        return activePrompts;
    },
    getScreenPath: function() {
        return this._section_name + '/' + this._op.operationIdx;
    },
    getJqmScreen: function() {
        return this.$(".odk-screen");
    },
    whenTemplateIsReady: function(ctxt){
        var that = this;
        if(this.template) {
            ctxt.success();
        } else if(this.templatePath) {
            try {
                require(['text!'+this.templatePath], function(source) {
                    try {
                        that.template = Handlebars.compile(source);
                        ctxt.success();
                    } catch (e) {
                        ctxt.append("screens."+that.type+
                            ".whenTemplateIsReady.exception", e);
                        console.error("screens."+that.type+
                            ".whenTemplateIsReady.exception " + String(e));
                        ctxt.failure({message: "Error compiling handlebars template."});
                    }
                }, function(err) {
                    ctxt.append("screens."+that.type+
                        ".whenTemplateIsReady.require.failure " + err.requireType + " modules: ", err.requireModules);
                    console.error("screens."+that.type+
                        ".whenTemplateIsReady.require.failure " + err.requireType + " modules: " + err.requireModules.toString());
                    ctxt.failure({message: "Error loading handlebars template (" + err.requireType + ")."});
                });
            } catch (e) {
                ctxt.append("screens."+that.type+
                    ".whenTemplateIsReady.require.exception", e);
                console.error("screens."+that.type+
                    ".whenTemplateIsReady.require.exception " + String(e) +
                    " px: " + that.promptIdx);
                ctxt.failure({message: "Error reading handlebars template."});
            }
        } else {
            ctxt.append("screens." + that.type +
                ".whenTemplateIsReady.noTemplate", "px: " + that.promptIdx);
            console.error("screens."+that.type+
                ".whenTemplateIsReady.noTemplate px: " + that.promptIdx);
            ctxt.failure({message: "Configuration error: No handlebars template found!"});
        }
    },
    initializeRenderContext: function() {
        //Object.create is used because we don't want to modify the class's render context.
        this._renderContext = Object.create(this.renderContext);
        if ( this.display == null ) {
            var section = opendatakit.getSettingObject(opendatakit.getCurrentFormDef(), this._section_name);
            this._renderContext.display = section.display;
        } else {
            this._renderContext.display = this.display;
        }
        var locales = opendatakit.getFormLocalesValue();
        this._renderContext.disabled = this.disabled;
        this._renderContext.form_title = this.controller.getSectionTitle();
        this._renderContext.locales = locales;
        this._renderContext.hasTranslations = (locales.length > 1);
        this._renderContext.showHeader = true;
        this._renderContext.showFooter = false;
        this._renderContext.showContents = this.controller.getSectionShowContents();
        this._renderContext.enableForwardNavigation = true;
        this._renderContext.enableBackNavigation = true;
        this._renderContext.enableNavigation = true;

        //It's probably not good to get data like this in initialize
        //Maybe it would be better to use handlebars helpers to get metadata?
        this._renderContext.form_version = opendatakit.getSettingValue('form_version');
        this._renderContext.inputAttributes = 
                $.extend({}, this.baseInputAttributes, this.inputAttributes);
    },
    configureRenderContext: function(ctxt) {
        var that = this;
        // We do not support dependent default values within screen groups.
        // If we are to do so, we will need to add code here to ensure
        // their on activate functions are called in the right order.
        var subPromptsReady = _.after(that.activePrompts.length, function () {
            ctxt.success();
        });
        _.each(that.activePrompts, function(prompt){
            prompt.buildRenderContext($.extend({}, ctxt, {success:function() {
                    subPromptsReady(ctxt);
                }
            }));
        });
    },
    buildRenderContext: function(ctxt) {
       var that = this;
        // this once held the code to invoke with_next and with_next_validate actions
        that.whenTemplateIsReady($.extend({}, ctxt, {success:function() {
            // determine the active prompts
            that.activePrompts = []; // clear all prompts...
            var activePromptIndices = that._operation._screen_block();
            var sectionPrompts = that.controller.getCurrentSectionPrompts();
            var ap = [];
            var i;
            for ( i = 0 ; i < activePromptIndices.length ; ++i ) {
                var prompt = sectionPrompts[activePromptIndices[i]];
                if ( prompt == null ) {
                    ctxt.append("Error! unable to resolve prompt!");
                    ctxt.failure({message: "bad prompt index!"});
                    return;
                }
                prompt._screen = that;
                ap.push(prompt);
            }
            that.activePrompts = ap;
            // we now know what we are going to render.
            // work with the controller to ensure that all
            // intermediate state has been written to the 
            // database before commencing the rendering
            that.controller.commitChanges($.extend({},ctxt,{success:function() {
                that.initializeRenderContext();
                that.configureRenderContext(ctxt);
            }}));
        }}));
    },
    /**
     * stopPropagation is used in the events map to disable swiping on various elements
     **/
    stopPropagation: function(evt){
        var ctxt = this.controller.newContext(evt);
        ctxt.append("screens." + this.type + ".stopPropagation", "px: " + this.promptIdx);
        shim.log("D","screens." + this.type + ".stopPropagation px: " + this.promptIdx + "evt: " + evt);
        evt.stopImmediatePropagation();
        ctxt.success();
    },
    reRender: function(ctxt) {
        var that = this;
        that._screenManager.refreshScreen(ctxt);
    },
    afterRender: function(ctxt) {
        var that = this;
        $.each(that.activePrompts, function(idx, prompt){
            prompt.afterRender();
        });
        ctxt.success();
    },
    render: function(ctxt) {

        var that = this;
        // TODO: understand what Nathan was trying to do here with a virtual element.
        try {
            var tmplt = that.template(that._renderContext);
            that.$el.html(tmplt);
            that.$el.attr('data-theme', that._renderContext.dataTheme);
            that.$el.attr('data-content-theme', that._renderContext.dataTheme);
            that.$el.attr('data-role','page');
        } catch(e) {
            console.error("screens." + that.type + ".render.exception: " +
                            String(e) + ' px: ' + that.promptIdx);
            console.error(that);
            alert("Error in template.");
        }
        var $container = that.$('.odk-container');

        // Create columns
        var grid = $('<div class="ui-grid-a">');
        var col_a = $('<div class="ui-block-a">');
        var col_b = $('<div class="ui-block-b">');

        $.each(that.activePrompts, function(idx, prompt){
            prompt._render();
            if(!prompt.$el){
                console.error("render px: " + that.promptIdx + 
                    " Prompts must have synchronous render functions. " +
                    "Don't debounce them or launch async calls before el is set.");
                console.error(prompt);
                alert("Sub-prompt has not been rendered. See console for details.");
            }

            // Append element to appropriate column
            if (prompt.screen_column === 2) {
                col_b.append(prompt.$el);
            } 
            else {
                col_a.append(prompt.$el);
            }
        });
        
        grid.append(col_a);
        grid.append(col_b);
        $container.append(grid);

        ctxt.success();
    },
    recursiveUndelegateEvents: function() {
        var that = this;
        that.undelegateEvents();
        $.each(that.activePrompts, function(idx, prompt){
            prompt.undelegateEvents();
        });
    },
    recursiveDelegateEvents: function() {
        var that = this;
        $.each(that.activePrompts, function(idx, prompt){
            prompt.delegateEvents();
        });
        that.delegateEvents();
    },
    /**
     * allowMove
     *   advancing == true if the user is not going 'back'
     *
     * Return { outcome: true/false, message: 'failure message' }
     * to caller to indicate whether or not the screen allows the
     * user to move off of it.
     */
    allowMove: function(advancing) {
        return { outcome: true };
    },
    /**
     * Give the prompts a chance to save their state to the database.
     * Also, enable the screen to enforce its own criteria for when it
     * is allowable to move off the screen. E.g., after saving or 
     * rolling back all changes.
     */
    beforeMove: function(isStrict, advancing, validateValues) {
        var that = this;
        var allowMoveHandler = function(advancing) {
            var allowed = that.allowMove(advancing);
            if ( allowed.outcome ) {
                return null;
            } else {
                return { message: allowed.message };
            }
        };
        
        var beforeMoveError;
        for ( var i = 0; i < that.activePrompts.length; i ++)
        {
            beforeMoveError = that.activePrompts[i].beforeMove();
            if ( beforeMoveError != null ) {
                break;
            }
        }
        
        if ( beforeMoveError == null )
        {
            if ( validateValues ) {
                var validateError;
                for ( var i = 0; i < that.activePrompts.length; i++ )
                {
                    validateError = that.activePrompts[i]._isValid(isStrict);
                    if ( validateError != null ) { 
                        break; 
                    }
                }
                if ( validateError == null ) { 
                    allowMoveHandler(advancing); 
                } else {
                    return validateError;
                }
            } 
            else {
                allowMoveHandler(advancing);
            }
        } else {
            return beforeMoveError;
        }
    },
    __test__: function(evt){
        //This is a utility function for checking to make sure event maps are working.
        console.log(evt);
    }
    /*
    registerChangeHandlers: function() {
        // TODO: code that is executed after all page prompts are inserted into the DOM.
        // This code would, e.g., handle value-change events to propagate changes across
        // a page (e.g., update calculated fields).
    },
    //TODO: I can't find any refrences to these, so we should probably remove them.
    validationFailedAction: function(isMoveBackward) {
        alert(this.validationFailedMessage);
    },
    requiredFieldMissingAction: function(isMovingBackward) {
        alert(this.requiredFieldMissingMessage);
    }
    */
});

return screenTypes;
});
