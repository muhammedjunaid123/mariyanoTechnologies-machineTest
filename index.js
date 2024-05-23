const express = require('express');
const { Db } = require('mongodb');
const app = express();
const port = 3000;
require('dotenv').config()
// Database Details
const DB_USER = process.env['DB_USER'];
const DB_PWD = process.env['DB_PWD'];
const DB_URL = process.env['DB_URL'];
const DB_NAME = "task-jeff";
// const DB_COLLECTION_NAME = "match";

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const mongoose = require('mongoose');

// const { MongoClient, ServerApiVersion } = require('mongodb');
// //const uri = "mongodb+srv://"+DB_USER+":"+DB_PWD+"@"+DB_URL+"/?retryWrites=true&w=majority";
// const uri =process.env.db_url

// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

let db;

async function run() {
  try {

    await mongoose.connect(process.env.db_url);
    db = mongoose.connection.db;
    await db.command({ ping: 1 })



    console.log("You successfully connected to MongoDB!");

  }

  catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
  finally {

  }
}


// Sample create document
// async function sampleCreate() {
//   const demo_doc = { 
//     "demo": "doc demo",
//     "hello": "world"
//   };
//   const demo_create = await db.collection(DB_COLLECTION_NAME).insertOne(demo_doc);

//   console.log("Added!")
//   console.log(demo_create.insertedId);
// }

const team = require('./model/team_schema')
const Player = require('./model/player_schema')
const match = require('./model/match_schema')
const Result = require('./model/result_schema')


// Endpoints

app.get('/', async (req, res) => {
  res.send('Hello World!');
});

app.post('/add-team', async (req, res) => {
  try {
    const { players, team_name, captain, vice_captain } = req.body
    if (captain == vice_captain) {
      return res.status(400).json({ message: ' The captain and vice-captain cannot be the same person' })
    }
    if (team_name.trim() == '') {
      return res.status(400).json({ message: 'team name can not be empty' })
    }
    if (captain.trim() == '') {
      return res.status(400).json({ message: 'captain can not be empty' })
    }
    if (vice_captain.trim() == '') {
      return res.status(400).json({ message: 'vice captain can not be empty' })
    }
    if (players.length < 10 && players.length > 10) {
      return res.status(400).json({ message: 'select only 11 players' })
    }
    let counter_player = { 'WICKETKEEPER': 0, 'ALL-ROUNDER': 0, 'BOWLER': 0, 'BATTER': 0 }
    let c_flag = false
    let vc_flag = false
    players.forEach(element => {

      if (element.Player == captain) {
        c_flag = true
      }
      if (element.Player === vice_captain) {
        vc_flag = true
      }
      if (element.Role == 'WICKETKEEPER') {
        counter_player['WICKETKEEPER'] = counter_player['WICKETKEEPER'] + 1
      }
      if (element.Role == 'ALL-ROUNDER') {
        counter_player['ALL-ROUNDER'] = counter_player['ALL-ROUNDER'] + 1
      }
      if (element.Role == 'BOWLER') {
        counter_player['BOWLER'] = counter_player['BOWLER'] + 1
      }
      if (element.Role == 'BATTER') {
        counter_player['BATTER'] = counter_player['BATTER'] + 1
      }
    });
    if (c_flag == false) {
      return res.status(400).json({ message: `Please select a captain from the players you have already chosen` })
    }
    if (vc_flag == false) {
      return res.status(400).json({ message: `Please select a vice captain from the players you have already chosen` })
    }

    for (let i in counter_player) {
      if (counter_player[i] <= 0) {
        return res.status(400).json({ message: `add at least one ${i}` })
      }
      if (counter_player[i] >= 9) {
        return res.status(400).json({ message: `maximum number of ${i} is 8` })
      }
    }


    const _Team = new team({
      team_name: team_name,
      players: players,
      captain: captain,
      vice_captain: vice_captain
    })
    let result = await _Team.save()
    if (result) {
      return res.status(201).json({
        message: 'team created successfully'
      });
    } else {
      return res.status(500).json({
        message: 'An error occurred while creating the team',
      });
    }


  } catch (error) {
    return res.status(500).json({
      message: 'An error occurred while creating the team',
      Error: error
    });
  }

})
app.get('/process-result', async (req, res) => {
  let team_players = await team.aggregate([{ $project: { player: '$players', captain: '$captain', vice_captain: '$vice_captain', team_name: '$team_name' } }])

  let captain = team_players[0]['captain']
  let vice_captain = team_players[0]['vice_captain']
  let team_name = team_players[0]['$team_name']

  const teamPlayerNames = team_players[0]['player'].map(player => player.Player);

  const data = await match.aggregate([
    {
      $match: {
        $or: [
          { batter: { $in: teamPlayerNames } },
          { bowler: { $in: teamPlayerNames } }
        ]
      }
    }
  ])

  let result = {}
  teamPlayerNames.forEach((value) => {
    if (!result[value]) {
      result[value] = [0, true, true, true]

    }

  })
  let Maiden = true
  let i = 1
  let c = 0
  data.forEach(element => {
    if (result[element['batter']]) {


      if (element['isWicketDelivery'] == 1) {
        if (result[element['batter']][0] <= 0) {
          team_players[0]['player'].forEach(val => {
            if (element['batter'] === val.Player) {
              if (val.Role !== 'BOWLER') {
                result[element['batter']][0] += -2
              }
            }
          })
        }
      }


      if (element['batsman_run'] > 0) {
        result[element['batter']][0] += 1
      }
      if (element['batsman_run'] == 6) {
        result[element['batter']][0] += 6 + 2
      }
      if (element['batsman_run'] == 4) {
        result[element['batter']][0] += 4 + 1
      }

      if (result[element['batter']][0] >= 30 && result[element['batter']][1]) {
        result[element['batter']][0] += 4
        result[element['batter']][1] = false
      }
      if (result[element['batter']][0] >= 50 && result[element['batter']][2]) {
        result[element['batter']][0] += 8
        result[element['batter']][2] = false
      }
      if (result[element['batter']][0] >= 100 && result[element['batter']][3]) {
        result[element['batter']][0] += 16
        result[element['batter']][3] = false
      }

    }
    if (result[element['bowler']]) {
      if (element['batsman_run'] == 0 && Maiden !== false) {
        Maiden = true
      } else {
        Maiden = false
      }
      i++
      if (i == 6) {
        if (Maiden == true) {
          result[element['bowler']][0] += 12
        } else {
          Maiden = true
        }
        i = 1
      }


      if (element.isWicketDelivery == 1) {
        let kind = element.kind.split(' ')
        if (kind[0] === 'lbw' || kind[0] === 'bowled') {
          result[element['bowler']][0] += 25 + 8
        }
        if (result[element['bowler']][0] > 50 && result[element['bowler']][1] || result[element['bowler']][2] || result[element['bowler']][3]) {
          if (result[element['bowler']][1]) {
            result[element['bowler']][0] += 4

          } else if (result[element['bowler']][2]) {

            result[element['bowler']][0] += 8

          } else if (result[element['bowler']][3]) {
            result[element['bowler']][0] += 16
          }
        }

        if (kind[0] === 'caught') {
          c++
          if (c == 3) {
            result[element['fielders_involved']][0] += 4
          }
          if (result[element['fielders_involved']]) {

            result[element['fielders_involved']][0] += 8
          }
        }
        if (kind[0] === 'Stumping') {
          if (result[element['fielders_involved']]) {

            result[element['fielders_involved']][0] += 12
          }
        }
        if (kind[0] === 'run-out') {
          if (result[element['fielders_involved']]) {

            result[element['fielders_involved']][0] += 6
          }
        }
      }
    }
  });

  const playersArray = Object.entries(result).map(([name, [score]]) => ({ name, score }));
  await Result.insertMany(playersArray)

  return res.status(200).json({ playersArray })
})
app.get('/team-result', async (req, res) => {
  let data=await Result.aggregate([{
    $lookup: {
      from: 'players',
      localField: 'name',
      foreignField: 'Player',
      as: 'name'
    }
  }, {
    $addFields: {
      name: { $first: '$name.Team' }
    }
  }, {
    $group: {
      _id: '$name',
      total: {
        $sum: '$score'
      }
    }
  }]).sort({total:-1})
   return res.status(200).json({data})
})


// app.get('/demo', async (req, res) => {
//   await sampleCreate();
//   res.send({status: 1, message: "demo"});
// });

//

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

run();