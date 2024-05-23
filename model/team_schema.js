const mongoose = require('mongoose')
const team_schema = new mongoose.Schema({
    team_name: {
        type: String,
        required: true
    },
    players:
        [{
            Player: {
                type: String,
                required: true
            },
            Team: {
                type: String,
                required: true
            },
            Role: {
                type: String,
                required: true
            }
        }],
    captain: {
        type: String,
        required: true
    },
    vice_captain: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("team", team_schema)




