'use strict';
/**
 * NOTE: builder.js sets controller.prompts property.
 *
 * Manages the execution state and page history of the overall survey, 
 * including form validation, saving and marking the form as 'complete'.
 *
 * Delegates the display of individual prompts to the screenManager. 
 * Delegates the evaluation of individual constraints, etc. to the prompts.
 *
 */
define(['screenManager','opendatakit','database', 'jquery'],
function(ScreenManager,  opendatakit,  database,   $) {
window.controller = {
    eventCount: 0,
    screenManager : null,
    currentPromptIdx : -1,
    prompts : [],
    calcs: [],
    previousScreenIndices : [],
    beforeMove: function(ctxt){
        ctxt.append('controller.beforeMove');
        var that = this;
        var prompt = null;
        if ( this.currentPromptIdx != -1 ) {
            prompt = this.prompts[this.currentPromptIdx];
        }
        try {
            if ( prompt != null ) {
                prompt.beforeMove(ctxt);
            } else {
                ctxt.success();
            }
        } catch(ex) {
            var e = (ex != null) ? ex.message + " stack: " + ex.stack : "undef";
            console.error("controller.beforeMove: Exception: " + e);
            ctxt.append('controller.beforeMove.exception', e );
            ctxt.failure({message: "Exception while advancing to next prompt."});
        }
    },
    validate: function(ctxt){
        ctxt.append('controller.validate');
        var that = this;
        var prompt;
        if ( this.currentPromptIdx != -1 ) {
            prompt = this.prompts[this.currentPromptIdx];
        }
        try {
            if ( prompt ) {
                prompt.validate(ctxt);
            } else {
                ctxt.success();
            }
        } catch(ex) {
            var e = (ex != null) ? ex.message  + " stack: " + ex.stack : "undef";
            console.error(prompt);
            console.error("controller.validate: Exception: " + e );
            ctxt.append('controller.validate.exception', e );
            ctxt.failure({message: "Exception occurred while evaluating constraints"});
        }
    },
    gotoPreviousScreen: function(ctxt){
        var that = this;
        ctxt.append('controller:gotPreviousScreen');
        that.beforeMove($.extend({}, ctxt,{
            success: function() {
                ctxt.append("gotoPreviousScreen.beforeMove.success", "px: " +  that.currentPromptIdx);
                while (that.hasPromptHistory(ctxt)) {
                    console.log("gotoPreviousScreen: poppreviousScreenNames ms: " + (+new Date()) + 
                                " page: " + that.currentPromptIdx);
                    var prmpt = that.getPromptByName(that.previousScreenIndices.pop(), {reverse:true});
                    var t = prmpt.type;
                    if ( t == "goto_if" || t == "goto" || t == "label" || t == "calculate" ) {
                        console.error("Invalid previous prompt type");
                        console.log(prmpt);
                    }
                    // todo -- change to use hash?
                    that.setPrompt(ctxt, prmpt, {omitPushOnReturnStack:true, reverse:true});
                    return;
                }
                ctxt.append("gotoPreviousScreen.beforeMove.success.noPreviousPage");
                // display the 'no previous prompt' screen message.
                // then transition to the start of the form.
                that.screenManager.noPreviousPage($.extend({}, ctxt,{
                                        success: function() {
                                            // pop ctxt
                                            ctxt.append("gotoPreviousScreen.noPrompts");
                                            that.gotoRef($.extend({},ctxt,{
                                                success:function() {
                                                    ctxt.failure({message: "Returning to start of form."});
                                                }}),"0");
                                        }}));
            },
            failure: function(m) {
                ctxt.append("gotoPreviousScreen.beforeMove.failure", "px: " +  that.currentPromptIdx);
                // should stay on this screen...
                if ( that.screenManager != null ) {
                    that.screenManager.unexpectedError($.extend({},ctxt,{
                        success:function() {
                            ctxt.failure(m); 
                        }}), "beforeMove");
                } else {
                    ctxt.failure(m);
                }
            }
        }));
    },
    /**
     * If 'prompt' is a label or goto, advance through the 
     * business logic until it is resolved to a renderable screen prompt.
     *
     * return that renderable screen prompt.
     */
    advanceToScreenPrompt: function(ctxt, prompt) {
        var nextPrompt = null;
        var that = this;
        try {
            // ***The order of the else-if statements below is very important.***
            // i.e., First test if the 'condition' is false, and skip to the next 
            // question if it is; if the 'condition' is true or not present, then 
            // execute the 'goto'
            if ( prompt.type == "label" ) {
                nextPrompt = that.getPromptByName(prompt.promptIdx + 1);
            } else if('condition' in prompt && !prompt.condition()) {
                nextPrompt = that.getPromptByName(prompt.promptIdx + 1);
            } else if ( prompt.type == "goto" ) {
                nextPrompt = that.getPromptByLabel(prompt.param);
            } else if( prompt.type == "error" ) {
                if('condition' in prompt && prompt.condition()) {
                    alert("Error prompt triggered.");
                    that.fatalError();
                }
            }
        } catch (e) {
            if ( ctxt.strict ) {
                ctxt.append("controller.advanceToScreenPrompt.exception.strict", e);
                console.error(prompt);
                console.error(nextPrompt);
                ctxt.failure({message: "Exception while evaluating condition() expression. See console log."});
                return;
            } else {
                ctxt.append("controller.advanceToScreenPrompt.exception.ignored", e);
                nextPrompt = that.getPromptByName(prompt.promptIdx + 1);
            }
        }
        
        if(nextPrompt) {
            that.advanceToScreenPrompt(ctxt, nextPrompt);
        } else {
            ctxt.success(prompt);
        }
    },
    validateQuestionHelper: function(ctxt, promptCandidate) {
        var that = this;
        return function() {
            try {
                // pass in 'render':false to indicate that rendering will not occur.
                // call onActivate() to ensure that we have values (assignTo) initialized for validate()
                promptCandidate.onActivate( $.extend({render: false}, ctxt, {
                    success: function(renderContext) {
                        promptCandidate.validate( $.extend({}, ctxt, {
                            success: function() {
                                if ( promptCandidate.type == 'finalize' ) {
                                    ctxt.append("validateQuestionHelper.advanceToScreenPrompt.success.atFinalize", "px: " + promptCandidate.promptIdx + " nextPx: no prompt!");
                                    ctxt.success();
                                } else {
                                    var nextPrompt = that.getPromptByName(promptCandidate.promptIdx + 1);
                                    that.advanceToScreenPrompt($.extend({}, ctxt, {
                                        success: function(prompt){
                                            if(prompt) {
                                                ctxt.append("validateQuestionHelper.advanceToScreenPrompt.success", "px: " + promptCandidate.promptIdx + " nextPx: " + prompt.promptIdx);
                                                var fn = that.validateQuestionHelper(ctxt,prompt);
                                                (fn)();
                                            } else {
                                                ctxt.append("validateQuestionHelper.advanceToScreenPrompt.success.noPrompt", "px: " + promptCandidate.promptIdx + " nextPx: no prompt!");
                                                ctxt.success();
                                            }
                                        },
										failure: function(m) {
											ctxt.append("validateQuestionHelper.advanceToScreenPrompt.failure", "px: " + promptCandidate.promptIdx);
											that.setPrompt( $.extend({}, ctxt, {
												success: function() {
													setTimeout(function() {
														ctxt.append("validateQuestionHelper.advanceToScreenPrompt.failure.setPrompt.setTimeout", "px: " + that.currentPromptIdx);
														ctxt.failure(m);
														}, 500);
												}}), nextPrompt);
										}}), nextPrompt);
                                }
                            },
                            failure: function(msg) {
                                ctxt.append("validateQuestionHelper.validate.failure", "px: " + promptCandidate.promptIdx);
                                that.setPrompt( $.extend({}, ctxt, {
                                    success: function() {
                                        var simpleCtxt = $.extend({}, ctxt, {
                                            success: function() {
                                                // should never get here...
                                                ctxt.append("validateQuestionHelper.validate.failure.setPrompt.validate", "px: " + promptCandidate.promptIdx);
                                                ctxt.failure({message: "Internal error - Unexpected execution path."});
                                            }});
                                        setTimeout(function() {
                                            simpleCtxt.append("validateQuestionHelper.validate.failure.setPrompt.setTimeout", "px: " + that.currentPromptIdx);
                                            that.validate( simpleCtxt );
                                            }, 500);
                                    }}), promptCandidate);
                            }}));
                    }}) );
            } catch(e) {
                ctxt.append("validateQuestionHelper.validate.exception", "px: " + promptCandidate.promptIdx + " exception: " + e);
                that.setPrompt( $.extend({}, ctxt, {
                    success: function() {
                        var simpleCtxt = $.extend({}, ctxt, {
                            success: function() {
                                // should never get here...
                                ctxt.append("validateQuestionHelper.validate.exception.setPrompt.validate", "px: " + promptCandidate.promptIdx);
                                ctxt.failure({message: "Internal error - Unexpected execution path."});
                            }});
                        setTimeout(function() {
                            simpleCtxt.append("validateQuestionHelper.validate.failure.setPrompt.setTimeout", "px: " + that.currentPromptIdx);
                            that.validate( simpleCtxt );
                            }, 500);
                    }}), promptCandidate);
            }
        };
    },
    validateAllQuestions: function(ctxt){
        var that = this;
        var promptCandidate = that.prompts[0];
        // set the 'strict' attribute on the context to report all 
        // formula exceptions and errors.
		var oldvalue = ctxt.strict;
        ctxt.strict = true;
        // ensure we drop the spinner overlay when we complete...
        var newctxt = $.extend({},ctxt,{
			success: function() {
				ctxt.append("validateQuestionHelper.advanceToScreenPrompt.success.noPrompt", "px: " + promptCandidate.promptIdx + " nextPx: no prompt!");
				that.screenManager.hideSpinnerOverlay();
				ctxt.strict = oldvalue;
				ctxt.success();
            },
            failure: function(m) {
                that.screenManager.hideSpinnerOverlay();
                if ( m && m.message ) {
                    that.screenManager.showScreenPopup(m);
                }
				ctxt.strict = oldvalue;
                ctxt.failure(m);
            }});
        that.screenManager.showSpinnerOverlay({text:"Validating..."});
        
        // call advanceToScreenPrompt, since prompt[0] is always a goto_if...
        that.advanceToScreenPrompt($.extend({},newctxt, {
            success: function(prompt) {
                if(prompt) {
                    newctxt.append("validateAllQuestions.advanceToScreenPrompt.success", "px: " + promptCandidate.promptIdx + " nextPx: " + prompt.promptIdx);
                    var fn = that.validateQuestionHelper(newctxt,prompt);
                    (fn)();
                } else {
                    newctxt.append("validateAllQuestions.advanceToScreenPrompt.success.noPrompt", "px: " + promptCandidate.promptIdx + " nextPx: no prompt!");
                    newctxt.success();
                }
            },
			failure: function(m) {
				newctxt.append("validateAllQuestions.advanceToScreenPrompt.failure", "px: " + promptCandidate.promptIdx);
				that.setPrompt( $.extend({}, newctxt, {
					success: function() {
						setTimeout(function() {
							newctxt.append("validateAllQuestions.advanceToScreenPrompt.failure.setPrompt.setTimeout", "px: " + that.currentPromptIdx);
							newctxt.failure(m);
							}, 500);
					}}), promptCandidate);
            }}), promptCandidate);
    },
    gotoNextScreen: function(ctxt, options){
        var that = this;
        that.beforeMove($.extend({}, ctxt,
            { success: function() {
                ctxt.append("gotoNextScreen.beforeMove.success", "px: " +  that.currentPromptIdx);
                // we are ready for move -- validate...
                that.validate( $.extend({}, ctxt, {
                    success: function() {
                        ctxt.append("gotoNextScreen.validate.success", "px: " +  that.currentPromptIdx);
                        // navigate through all gotos, goto_ifs and labels.
                        var promptCandidate = null;
                        if ( that.currentPromptIdx >= 0 ) {
                            promptCandidate = that.getPromptByName(that.currentPromptIdx + 1);
                        } else {
                            promptCandidate = that.prompts[0];
                        }

                        // abort and display error if we don't have any prompts...
                        if ( promptCandidate == null ) {
                            that.screenManager.noNextPage($.extend({}, ctxt,{
                                        success: function() {
                                            ctxt.append("gotoNextScreen.noPrompts");
                                            that.gotoRef($.extend({},ctxt,{
                                                success:function(){
                                                    ctxt.failure({message: "Returning to start of form."});
                                                }}),"0");
                                        }}));
                            return;
                        }
                        
                        that.advanceToScreenPrompt($.extend({}, ctxt, {
                            success: function(prompt){
                                if(prompt) {
                                    ctxt.append("gotoNextScreen.advanceToScreenPrompt.success", "px: " + that.currentPromptIdx + " nextPx: " + prompt.promptIdx);
                                    // todo -- change to use hash?
                                    that.setPrompt(ctxt, prompt, options);
                                } else {
                                    ctxt.append("gotoNextScreen.advanceToScreenPrompt.success", "px: " + that.currentPromptIdx + " nextPx: no prompt!");
                                    that.screenManager.noNextPage($.extend({}, ctxt,{
                                            success: function() {
                                                ctxt.append("gotoNextScreen.noPrompts");
                                                that.gotoRef(ctxt,"0");
                                            }}));
                                }
                        }}), promptCandidate);
                    },
                    failure: function(m) {
                        ctxt.append("gotoNextScreen.validate.failure", "px: " +  that.currentPromptIdx);
                        that.screenManager.showScreenPopup(m); 
                        ctxt.failure(m);
                    }
                }));
            },
            failure: function(m) {
                ctxt.append("gotoNextScreen.beforeMove.failure", "px: " +  that.currentPromptIdx);
                if ( that.screenManager != null ) {
                    that.screenManager.unexpectedError($.extend({},ctxt,{
                        success:function() {
                            ctxt.failure(m); 
                        }}), "beforeMove");
                } else {
                    ctxt.failure(m);
                }
            }
        }));
    },
    getPromptByName: function(name){
        if ( name == null ) {
			return null;
		}
        if ( ('' + name).match(/^\d+$/g) ) {
            var idx = Number(name);
            if(idx >= 0 && idx < this.prompts.length){
                return this.prompts[idx];
            }
        }
        for(var i = 0; i < this.prompts.length; i++){
            var promptName = this.prompts[i].name;
            if(promptName == name){
                return this.prompts[i];
            }
        }
        alert("Unable to find screen: " + name);
        return null;
    },
    getPromptByLabel: function(name){
        var prompts = this.prompts;
        for(var i = 0; i < prompts.length; i++){
            if(prompts[i].type !== 'label') {
				continue;
			}
            if(prompts[i].param === name){
                return prompts[i];
            }
        }
        alert("Unable to find label: " + name);
        return null;
    },
    setPrompt: function(ctxt, prompt, passedInOptions){
        var options;
        ctxt.append('controller.setPrompt', "nextPx: " + prompt.promptIdx);

        if ( this.currentPromptIdx == prompt.promptIdx ) {
            if ( passedInOptions == null || !passedInOptions.changeLocale) {
                ctxt.append('controller.setPrompt:ignored', "nextPx: " + prompt.promptIdx);
                ctxt.success();
                return;
            } else {
                options = {
                    omitPushOnReturnStack : true
                };
            }
        } else {
            options = {
                omitPushOnReturnStack : false
            };
        }
        
        if(passedInOptions){
            $.extend(options, passedInOptions);
        }
        if (!options.omitPushOnReturnStack) {
            if ( this.currentPromptIdx >= 0 && this.currentPromptIdx < this.prompts.length ) {
                this.previousScreenIndices.push(this.currentPromptIdx);
            }
        }
        this.currentPromptIdx = prompt.promptIdx;
        this.screenManager.setPrompt(ctxt, prompt, options);
        // the prompt should never be changed at this point!!!
        if ( this.currentPromptIdx != prompt.promptIdx ) {
            ctxt.log('assumption violation');
            console.error("controller.setPrompt: prompt index changed -- assumption violation!!!");
            alert("controller.setPrompt: should never get here");
            ctxt.failure({message: "Internal error - unexpected change in prompt index!"});
            return;
        }
        var idx = this.currentPromptIdx;
        var newhash = opendatakit.getHashString(opendatakit.getCurrentFormPath(), opendatakit.getCurrentInstanceId(), ''+idx);
        if ( newhash != window.location.hash ) {
            window.location.hash = newhash;
        }
    },
    /*
     * Callback interface from ODK Collect into javascript.
     * Handles all dispatching back into javascript from external intents
    */
    opendatakitCallback:function(promptPath, internalPromptContext, action, jsonString) {
        var ctxt = this.newCallbackContext();
        ctxt.append('controller.opendatakitCallback', ((this.currentPromptIdx != null) ? ("px: " + this.currentPromptIdx) : "no current prompt"));
        
		// promptPath is a dot-separated list. The first element of 
		// which is the index of the prompt in the global prompts list.
		var promptPathParts = promptPath.split('.');
        var selpage = this.getPromptByName(promptPathParts[0]);
        if ( selpage == null ) {
            ctxt.append('controller.opendatakitCallback.noMatchingPrompt', promptPath);
            console.log("opendatakitCallback: ERROR - PAGE NOT FOUND! " + promptPath + " internalPromptContext: " + internalPromptContext + " action: " + action );
            ctxt.failure({message: "Internal error. Unable to locate matching prompt for callback."});
            return;
        }
        
		try {
			// ask this page to then get the appropriate handler
			var handler = selpage.getCallback(promptPath, internalPromptContext, action);
			if ( handler != null ) {
				handler( ctxt, internalPromptContext, action, jsonString );
			} else {
				ctxt.append('controller.opendatakitCallback.noHandler', promptPath);
				console.log("opendatakitCallback: ERROR - NO HANDLER ON PAGE! " + promptPath + " internalPromptContext: " + internalPromptContext + " action: " + action );
				ctxt.failure({message: "Internal error. No matching handler for callback."});
				return;
			}
		} catch (e) {
			ctxt.append('controller.opendatakitCallback.exception', promptPath, e);
			console.log("opendatakitCallback: EXCEPTION ON PAGE! " + promptPath + " internalPromptContext: " + internalPromptContext + " action: " + action + " exception: " + e);
			ctxt.failure({message: "Internal error. Exception while handling callback."});
			return;
		}
    },
    opendatakitGotoPreviousScreen:function() {
        var ctxt = controller.newCallbackContext();
        ctxt.append("controller.opendatakitGotoPreviousScreen", this.currentPromptIdx);
        this.screenManager.gotoPreviousScreenAction(ctxt);
    },
    opendatakitIgnoreAllChanges:function() {
        var ctxt = controller.newCallbackContext();
        ctxt.append("controller.opendatakitIgnoreAllChanges", this.currentPromptIdx);
        if ( opendatakit.getCurrentInstanceId() == null ) {
            collect.ignoreAllChangesFailed( opendatakit.getSettingValue('formId'), null );
            ctxt.failure({message: "No instance selected."});
        } else {
            this.ignoreAllChanges($.extend({},ctxt,{success:function() {
                                collect.ignoreAllChangesCompleted( opendatakit.getSettingValue('formId'), opendatakit.getCurrentInstanceId());
                                ctxt.success();
                            }, failure:function(m) {
                                collect.ignoreAllChangesFailed( opendatakit.getSettingValue('formId'), opendatakit.getCurrentInstanceId());
                                ctxt.failure(m);
                            }}));
        }
    },
    ignoreAllChanges:function(ctxt) {
        database.ignore_all_changes(ctxt);
    },
    opendatakitSaveAllChanges:function(asComplete) {
        var that = this;
        var ctxt = controller.newCallbackContext();
        ctxt.append("controller.opendatakitSaveAllChanges", this.currentPromptIdx);
        if ( opendatakit.getCurrentInstanceId() == null ) {
            collect.saveAllChangesFailed( opendatakit.getSettingValue('formId'), null );
            ctxt.failure({message: "No instance selected."});
        } else {
            this.saveAllChanges(ctxt, asComplete);
        }
    },
    saveAllChanges:function(ctxt, asComplete) {
        var that = this;
        // NOTE: only success is reported up to collect here.
        // if there are any failures, the failure callback is only invoked if the save request
        // was initiated from within collect (via controller.opendatakitSaveAllChanges(), above).
        if ( asComplete ) {
            database.save_all_changes($.extend({},ctxt,{
                success:function(){
                    that.validateAllQuestions($.extend({},ctxt,{
                        success:function(){
                            database.save_all_changes($.extend({},ctxt,{
                                success:function() {
                                    collect.saveAllChangesCompleted( opendatakit.getSettingValue('formId'), opendatakit.getCurrentInstanceId(), true);
                                    ctxt.success();
                                },
                                failure:function(m) {
                                    collect.saveAllChangesFailed( opendatakit.getSettingValue('formId'), opendatakit.getCurrentInstanceId(), true);
                                    ctxt.failure(m);
                                }}), true);
                        }}));
                }}), false);
        } else {
            database.save_all_changes($.extend({},ctxt,{
                success:function() {
                    collect.saveAllChangesCompleted( opendatakit.getSettingValue('formId'), opendatakit.getCurrentInstanceId(), false);
                    ctxt.success();
                }}), false);
        }
    },
    gotoRef:function(ctxt, pageRef) {
        var that = this;
        if ( this.prompts.length == 0 ) {
            console.error("controller.gotoRef: No prompts registered in controller!");
            alert("controller.gotoRef: No prompts registered in controller!");
            ctxt.failure({message: "Internal error. No prompts registered in controller!"});
            return;
        }
        if ( pageRef == null ) {
            pageRef = '0';
        }
        // process the pageRef... -- each part is separated by slashes
        var hlist = pageRef.split('/');
        var hleading = hlist[0];

        var promptCandidate; 
        if ( hleading != null ) {
            promptCandidate = this.getPromptByName(hleading);
            if ( promptCandidate == null ) {
                promptCandidate = this.prompts[0];
                hlist = [];
            }
        } else {
            promptCandidate = this.prompts[0];
            hlist = [];
        }
        
        if ( promptCandidate == null ) {
            alert("controller.gotoRef: null prompt after resolution!");
            ctxt.failure({message: "Requested prompt not found."});
            return;
        }
        
        this.advanceToScreenPrompt($.extend({}, ctxt, {
            success:function(prompt){
                if ( prompt == null ) {
                    ctxt.append('controller.gotoRef', "no prompt after advance");
                    alert("controller.gotoRef: null prompt after advanceToScreenPrompt!");
                    ctxt.failure({message: "No next prompt."});
                    return;
                }
                that.setPrompt(ctxt, prompt, { hlist : hlist });
            }}), promptCandidate);
        
    },
    hasPromptHistory: function(ctxt) {
        return (this.previousScreenIndices.length !== 0);
    },
    clearPromptHistory: function(ctxt) {
        this.previousScreenIndices.length = 0;
    },
    reset: function(ctxt,sameForm) {
        ctxt.append('controller.reset');
        this.clearPromptHistory(ctxt);
        if ( this.screenManager != null ) {
            this.screenManager.cleanUpScreenManager(ctxt);
        } else {
            ctxt.append('controller.reset.newScreenManager');
            this.screenManager = new ScreenManager({controller: this});
        }
        this.currentPromptIdx = -1;
        if ( !sameForm ) {
            this.prompts = [];
            this.calcs = [];
        }
    },
    fatalError: function() {
        //Stop the survey.
        //There might be better ways to do it than this.
        this.beforeMove = null;
        this.setPrompt = null;
        $('body').empty();
    },
    setLocale: function(ctxt, locale) {
        var that = this;
        database.setInstanceMetaData($.extend({}, ctxt, {
            success: function() {
                var prompt = that.getPromptByName(that.currentPromptIdx);
                that.setPrompt(ctxt, prompt, {changeLocale: true} );
            }
        }), 'locale', locale);
    },
    getFormLocales: function() {
        return opendatakit.getFormLocalesValue();
    },
  
    ///////////////////////////////////////////////////////
    // Logging context
    baseContext : {
        contextChain: [],
        
        append : function( method, detail ) {
            this.contextChain.push( {method: method, detail: detail} );
        },
        
        success: function(){
            this.log('success!');
        },
        
        failure: function(m) {
            this.log('failure! ' + (( m != null && m.message != null) ? m.message : ""));
        },
        
        log: function( contextMsg ) {
            var flattened = "seqAtEnd: " + window.controller.eventCount;
            $.each( this.contextChain, function(index,value) {
                flattened += "\nmethod: " + value.method + ((value.detail != null) ? " detail: " + value.detail : "");
            });
            console.log(contextMsg + " execution_chain: " + flattened);
        }
    },
    
    newCallbackContext : function( actionHandlers ) {
        this.eventCount = 1 + this.eventCount;
        var count = this.eventCount;
        var now = new Date().getTime();
        var detail =  "seq: " + count + " timestamp: " + now;
        var ctxt = $.extend({}, this.baseContext, {contextChain: []}, actionHandlers );
        ctxt.append('callback', detail);
        return ctxt;
    },
    newStartContext: function( actionHandlers ) {
        this.eventCount = 1 + this.eventCount;
        var count = this.eventCount;
        var now = new Date().getTime();
        var detail =  "seq: " + count + " timestamp: " + now;
        var ctxt = $.extend({}, this.baseContext, {contextChain: []}, actionHandlers );
        ctxt.append('startup', detail);
        return ctxt;
    },
    newContext: function( evt, actionHandlers ) {
        this.eventCount = 1 + this.eventCount;
        var count = this.eventCount;
		var detail =  "seq: " + count + " timestamp: " + evt.timeStamp + " guid: " + evt.handleObj.guid;
		var evtActual;
		var evtTarget;
		if ( 'currentTarget' in evt ) {
			detail += ' curTgt: ';
			evtActual = evt.currentTarget;
		} else {
			detail += ' tgt: ';
			evtActual = evt.target;
		}
		
		if ( evtActual == window) {
			detail += 'Window';
		} else {
			evtTarget = ('innerHTML' in evtActual) ? evtActual.innerHTML : evtActual.activeElement.innerHTML;
			detail += evtTarget.replace(/\s+/g, ' ').substring(0,80);
		}
		
        var ctxt = $.extend({}, this.baseContext, {contextChain: []}, actionHandlers );
        ctxt.append( evt.type, detail);
        return ctxt;
    }
};
return window.controller;
});