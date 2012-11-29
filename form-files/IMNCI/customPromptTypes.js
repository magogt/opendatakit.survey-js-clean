define(['promptTypes','jquery','underscore', 'prompts'],
function(promptTypes, $,       _) {
    return {
        "pulseox" : promptTypes.launch_intent.extend({
            type: "pulseox",
            datatype: "pulseox",
            intentString: 'org.opendatakit.sensors.PULSEOX',
            buttonLabel: {
                'default': 'Launch PulseOx',
                'hindi': 'शुरू करना PulseOx'
            }
        }),
        "breathcounter" : promptTypes.launch_intent.extend({
            type: "breathcounter",
            datatype: "breathcounter",
            buttonLabel: {
                'default': 'Launch breath counter',
                'hindi': 'शुरू करना सांस की गिनती'
            },
            intentString: 'change.uw.android.BREATHCOUNT',
            parseValue: function(unparsedValue) {
                return { 'value' : unparsedValue };
            },
            serializeValue: function(value) {
                return value.value;
            }
        })
    };
});