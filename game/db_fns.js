const path = require("path")
const fs = require("fs")
const sqlite3 = require("sqlite3")
const gamedb = new sqlite3.Database("game/game.db")
exports._db = gamedb // same as user._db
const utils = require("../utils")
exports.init = function(reset_data) {
  // called on bot start
  fs.readFile(path.join(__dirname, 'game.db'), {encoding: "utf-8"}, function(err, data){
    if(err) throw err;
    if (data === '' || reset_data) { // database is empty and needs to be created
      fs.readFile(path.join(__dirname, 'game_db_schema.sql'), {encoding: "utf-8"}, function(er, schema) {
        if (er) throw er
        else {
          utils.warningMessage(reset_data?"You chose to reset the game database for this bot, creating new game database.":"game database not found - creating a new one");
          gamedb.exec(schema);
          if(reset_data){
            utils.warningMessage("Database reset.");
          }else{
            utils.successMessage("Database created!");
          }
        }
      })
    }
  })
}

// NB: nothing here actually checks to see if a user exists or if a tag is valid!
exports.tags = {}
exports.tags.add_tag = function(id, tag) {
  utils.debugMessage(`add tag: giving ${id} tag ${tag}`)
  // adds a tag to a user
  gamedb.run("insert into player_tags (user_id, tag_name) values ($id, $t);", {$id:id,$t:tag}, function(err) { if (err) throw err})
}
exports.tags.remove_tag = function(id, tag) {
  utils.debugMessage(`remove tag: taking ${id}'s' tag ${tag}`)
  // removes tag from user
  gamedb.run("delete from player_tags where user_id = $id and tag_name = $t;", {$id:id,$t:tag}, function(err) {if (err) throw err})
}
exports.tags.has_tag = function(id, tag) {
  // true or false, whether user `id` has tag `tag`
  return new Promise(function(resolve, reject) {
    gamedb.get("select user_id from player_tags where user_id = $id and tag_name  = $t;", {$id:id,$t:tag}, function(err, row) {
      if (err) { throw err; }
      resolve(!!row)
    })
  })
}
exports.tags.all_tags_of = function(id) {
  utils.debugMessage(`getting all tags of ${id}`)
  return new Promise(function(resolve, reject) {
    // promise of list of tags a user has, or [] if none
    gamedb.all("select tag_name from player_tags where user_id = ?;", id, function(err, rows) {
      if (err) { throw err; }
      var res = rows.map(row=>row.tag_name)
      utils.debugMessage(`they were: ${res}`)
      resolve(res)
    })
  })
}

exports.tags.all_with_tag = function(tag) {
  utils.debugMessage(`geting all people with tag ${tag}`)
  return new Promise(function(resolve, reject) {
    // promise of a list of users who have that tag.
    gamedb.all("select user_id from player_tags where tag_name = ?;", tag, function(err, rows){
      if (err) { throw err; }
      resolve(rows.map(row=>row.user_id))
    })
  })
}

exports.win_teams = {}
exports.win_teams.add_win_team = function(id, team) {
  utils.debugMessage(`add win team: giving ${id} team ${team}`)
  // adds a team to a user
  gamedb.run("insert into win_teams (user_id, team) values ($id, $t);", {$id:id,$t:team}, function(err) { if (err) throw err})
}
exports.win_teams.remove_win_team = function(id, team) {
  utils.debugMessage(`remove win_team: taking ${id}'s team ${team}`)
  // removes team from user
  gamedb.run("delete from win_teams where user_id = $id and team = $t;", {$id:id,$t:team}, function(err) {if (err) throw err})
}
exports.win_teams.has_win_team = function(id, team) {
  // true or false, whether user `id` has team `yeam`
  return new Promise(function(resolve, reject) {
    gamedb.get("select user_id from win_teams where user_id = $id and team = $t;", {$id:id,$t:tag}, function(err, row) {
      if (err) { throw err; }
      resolve(!!row)
    })
  })
}
exports.win_teams.all_have_win_team = function(num_alive, team) {
  // true or false, depending on whether all players have team
  return new Promise(function(resolve, reject) {
    gamedb.all("select user_id from win_teams where team = $t;", {$t:team}, function(err, rows) {
      if (err) throw err
      resolve(rows.length === num_alive)
    })
  })
}

exports.timings = {}
// functions for managing ability timings
exports.timings.add_next_time = function(user_id, ability_name, next_time_can_use) {
  utils.debugMessage(`add_next_time: user ${user_id}, abn ${ability_name}, next time ${next_time_can_use}`)
  // makes it so u can't use abn till next_cycle time
  gamedb.serialize(function() {
    gamedb.run("delete from ability_timings where user_id = $u and ability_name = $a", {
      $u:user_id,$a:ability_name
    })
    gamedb.run("replace into ability_timings (user_id, ability_name, next_time_can_use) values ($u,$a,$n)", {
      $u:user_id,
      $a:ability_name,
      $n:next_time_can_use
    }, function(err){
      utils.debugMessage("=== in the add_next_time === err is "+err+" ===")
    })
  })

}

exports.timings.can_use = function(user_id, ability_name, current_cycle) {
  utils.debugMessage(`can_use: user ${user_id}, abn ${ability_name}, current cycle ${current_cycle}`)
  return new Promise(function(resolve, reject) {
    gamedb.get("select next_time_can_use from ability_timings where user_id = $u and ability_name = $a", {
      $u:user_id,
      $a:ability_name
    }, function(err, row) {
      if (err) throw err
      if (!row) {
        resolve(true) // no data, so can use
      } else {
        var can = row.next_time_can_use <= current_cycle
        resolve(can) // can
      }
    })
  })
}
