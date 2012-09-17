define(/* json start delimiter */{
    "settings": [
        {
            name: "formId",
            param: "json-media"
        },
        {
            name: "formVersion",
            param: "20120901"
        },
        {
            name: "formLocale",
            param: "en_us"
        },
        {
            name: "formName",
            param: {
                "en_us": 'Simple Test Form'
                }
        },
        {
            name: "formLogo",
            param: "img/form_logo.png"
        }
    ],
    "survey": [
        {
            "prompts": [
                {
                    "type": "text", 
                    "disabled": true,
                    "name": "name", 
                    "image": "img/test.gif",
                    "audio": "http://upload.wikimedia.org/wikipedia/commons/b/ba/Ru-audio_template-Wikipedia.ogg",
                    "video": "http://upload.wikimedia.org/wikipedia/commons/2/27/Lasercutting-video.ogg",
                    "param": null, 
                    "label": {
                        "en_us": "Enter your name {{name.value}}:"
                    },
                    "hint": "hi"
                }, 
                {
                    "type": "integer", 
                    "name": "age", 
                    "param": null, 
                    "label": {
                        "en_us": "Enter your age:"
                    }
                }, 
                {
                    "type": "number", 
                    "name": "bmi", 
                    "param": null, 
                    "label": {
                        "en_us": "Enter your bmi:"
                    }
                },
                {
                    "type": "select_one", 
                    "name": "gender", 
                    "param": "gender", 
                    "label": {
                        "en_us": "Enter your gender:"
                    }
                }
            ], 
            "type": "screen", 
            "name": "testScreen",
            "label":  {
                "en_us": "Screen Group"
            }
        }, 
        {
            "type": "goto_if",
            "param": "test2",
            "condition": "{{name}}"
        },
        {
            "name": "name", 
            "validate": true,
            "type": "text", 
            "param": null, 
            "label": {
                "en_us": "Enter your name:"
            }
        }, 
        {
            "type": "label", 
            "param": "test2"
        },
        {
            "type": "audio", 
            "name": "audio_test", 
            "param": null, 
            "label": {
                "en_us": "Audio test"
            }
        }, 
        {
            "type": "video", 
            "name": "video_test", 
            "param": null, 
            "label": {
                "en_us": "Video test"
            }
        }, 
        {
            "type": "image", 
            "name": "image_test", 
            "param": null, 
            "label": {
                "en_us": "Image test"
            }
        }, 
        {
            "qp": {
                "param": "foo"
            }, 
            "type": "repeat", 
            "param": "subform.html"
        }, 
        {
            "name": "specialTemplateTest", 
            "label": {
                "en_us": "Custom template test:"
            }, 
            "type": "text", 
            "param": null, 
            "templatePath": "test.handlebars"
        },
        {
            "type": "integer", 
            "name": "age", 
            "param": null, 
            "label": {
                "en_us": "Enter your age:"
            }
        }, 
        {
            "type": "number", 
            "name": "bmi", 
            "param": null, 
            "label": {
                "en_us": "Enter your bmi:"
            }
        }, 
        {
            "type": "select", 
            "name": "sel",
            "label": "Select all genders:",
            "param": "gender"
        }
    ], 
    "datafields": {
        "name": {
            "type": "string"
        }, 
        "specialTemplateTest": {
            "type": "string"
        }, 
        "age": {
            "type": "integer"
        }, 
        "bmi": {
            "type": "number"
        }, 
        "sel": {
            "type": "multiselect"
        }, 
        "image_test": {
            "type": "image/*"
        }, 
        "audio_test": {
            "type": "audio/*"
        }, 
        "video_test": {
            "type": "video/*"
        }
    }, 
    "choices": {
        "gender": [
            {
                "name": "male", 
                "label": "male"
            }, 
            {
                "name": "female", 
                "label": "female"
            }
        ]
    }
}/* json end delimiter */);
