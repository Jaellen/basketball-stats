"use strict";

/* ----------------------- Module Dependencies ----------------------------- */

var Promise = require('promise');
var Observable = require('rxjs/Observable').Observable;
  require('rxjs/add/operator/map');
  require('rxjs/add/operator/concatAll');
  require('rxjs/add/operator/filter');
  require('rxjs/add/operator/reduce');
  require('rxjs/add/operator/zip');
var searchIndex = require('./js/components/data-service.js');

//For testing 
var chai = require('chai');
var assert = chai.assert;

/* ------------------------------ Logic ------------------------------------ */

/* Program Steps:
1. XMLHttpRequest for Stats Data and AutoComplete Search Functionality  
  a) GET request for cumulative player stats data 
  b) Create an array of all players' first and last names for search recommendations
  c) Use array to recommend and display search results from user's search input   
  d) When user selects from search results, 
    - GET Request for player's profile stats
    - Display that players' relevant data from both GET requests    
*/

//1. XMLHttpRequest for Stats Data and AutoComplete Search Functionality

//Declare global variables
var stats_array;
var index1;

var profile_array;
var index2;


var current_player_clicked; 

// 1.a) GET request for cumulative player stats data
getJSON('https://www.mysportsfeeds.com/api/feed/pull/nba/2015-2016-regular/cumulative_player_stats.json?')
.then( function(response) {

  //Set the global variable to the playerstatsentry array from the JSON object   
  stats_array = response.cumulativeplayerstats.playerstatsentry;

  //1.b) Create an array of all players' first and last names for search recommendations 
  var createFirstandLastNameArray = function() { 
    return stats_array.
      map(function(entry) { return entry.player.FirstName + " " + entry.player.LastName; })
    };
  var activePlayers = createFirstandLastNameArray();
  
  //pass on this array to then
  return activePlayers;
})
.then( function(activePlayers) {
    
  var input = document.getElementById("searchBox")
  var ul = document.getElementById("searchResults")
  var inputTerms, termsArray, prefix, terms, results, sortedResults;

  //1.c) Use array to recommend and display search results from user's search input    
  var search = function() {
    inputTerms = input.value.toLowerCase();
    results = [];
    termsArray = inputTerms.split(' ');
    prefix = termsArray.length === 1 ? '' : termsArray.slice(0, -1).join(' ') + ' ';
    terms = termsArray[termsArray.length -1].toLowerCase();

    for (var i = 0; i < activePlayers.length; i++) {
      var a = activePlayers[i].toLowerCase(),
          t = a.indexOf(terms);
      if (t > -1) {
        results.push(a);
      }
    }
     evaluateResults();
  };
    
  var sortResults = function(a,b) {
    if (a.indexOf(terms) < b.indexOf(terms)) return -1;
    if (a.indexOf(terms) > b.indexOf(terms)) return 1;
    return 0;
  }

  var evaluateResults = function() {
    if (results.length > 0 && inputTerms.length > 0 && terms.length !== 0) {
      sortedResults = results.sort(sortResults);
      appendResults();
    }
    else if (inputTerms.length > 0 && terms.length !== 0) {
      ul.innerHTML = '<li><strong>' + inputTerms + ' is not a current active player <br></strong></li>';
    }
    else if (inputTerms.length !== 0 && terms.length === 0) {
      return;
    }
    else {
      clearResults();
    }
  };

  //display recommendations
  var appendResults = function () {
  
    clearResults();

    //Note: A maximum of 5 recommendations set here 
    for (var i = 0; i < sortedResults.length && i < 5; i++) {
       
      var li = document.createElement("li");
      var a = document.createElement("a");

      //Set an attribute and click event listener to each recommendation result 
      a.setAttribute('id', i.toString());
      a.addEventListener("click", function(event) {
              
        //retrieve the name of the player clicked
        current_player_clicked = sortedResults[event.currentTarget.getAttribute('id')];

        // display that player's data
        displayStats();
        displayCarousel();
      });
   
      var result = prefix + sortedResults[i].toLowerCase().replace(terms, '<strong>' + terms + '</strong>' );
      li.innerHTML = result;
      ul.appendChild(a);
      a.appendChild(li);
    }

    if (ul.className !== "term-list") {
      ul.className = "term-list";
    }
  };

  var clearResults = function() {
    ul.className = "term-list hidden";
    ul.innerHTML = '';
  };

  input.addEventListener("keyup", search, false);
});

var displayStats = function(player) {

  //CLEAR THE RESULTS HERE!
  
  document.getElementById("profile").innerHTML = '';
  document.getElementById("stats-main").innerHTML = '';
  document.getElementById("stats-secondary").innerHTML = '';

  //1.d) GET Request for player's profile stats
  getJSON('https://www.mysportsfeeds.com/api/feed/pull/nba/2015-2016-regular/active_players.json')
  .then( function(response) {

    // 1.d) Display that players' relevant data from both GET requests 
    //Display profile data

    profile_array = response.activeplayers.playerentry;    
    
    //index2 is for profile_array
    index2 = findPlayerClickedIndex(profile_array, current_player_clicked);

    document.getElementById("profile").appendChild(createElement("li", profile_array[index2].player.FirstName, " ", profile_array[index2].player.LastName));
    document.getElementById("profile").appendChild(createElement("li", "Position: ", profile_array[index2].player.Position));
    document.getElementById("profile").appendChild(createElement("li", profile_array[index2].team.City, " ", profile_array[index2].team.Name));
    document.getElementById("profile").appendChild(createElement("li", "Jersey#: ", profile_array[index2].player.JerseyNumber));
    document.getElementById("profile").appendChild(createElement("li", profile_array[index2].player.Age, " yrs old"));
    document.getElementById("profile").appendChild(createElement("li", profile_array[index2].player.Height, " ft"));
    document.getElementById("profile").appendChild(createElement("li", profile_array[index2].player.Weight, " lbs"));
    document.getElementById("profile").appendChild(createElement("li", "Rookie? ", profile_array[index2].player.IsRookie));
    document.getElementById("profile").appendChild(createElement("li", "Injury Status: "));
  });

  //Display stats data

  //index1 is for stats_array
  index1 = findPlayerClickedIndex(stats_array, current_player_clicked); 
    
    //Stats Main
    document.getElementById("stats-main").appendChild(createElement("li", "PTS/G: ", stats_array[index1].stats.PtsPerGame["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "AST/G: ", stats_array[index1].stats.AstPerGame["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "REB/G: ", stats_array[index1].stats.RebPerGame["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "BLK/G: ", stats_array[index1].stats.BlkPerGame["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "PF/G: ", stats_array[index1].stats.FoulPersPerGame["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "FG%: ", stats_array[index1].stats.FgPct["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "2P%: ", stats_array[index1].stats.FtPct["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "3P%: ", stats_array[index1].stats.Fg2PtPct["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "FT%: ", stats_array[index1].stats.Fg3PtPct["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "2PM/G: ", stats_array[index1].stats.Fg2PtMadePerGame["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "3PM/G: ", stats_array[index1].stats.Fg3PtMadePerGame["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "+/-: ", stats_array[index1].stats.PlusMinus["#text"]));
    document.getElementById("stats-main").appendChild(createElement("li", "MPG: ", stats_array[index1].stats.MinSecondsPerGame["#text"]));   

    //Stats Secondary
    document.getElementById("stats-secondary").appendChild(createElement("li", "GP: ", stats_array[index1].stats.GamesPlayed["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "MIN: ", stats_array[index1].stats.MinSeconds["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "PTS: ", stats_array[index1].stats.Pts["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "FGA: ", stats_array[index1].stats.FgAtt["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "FGM: ", stats_array[index1].stats.FgMade["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "2PM: ", stats_array[index1].stats.Fg2PtMade["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "3PM: ", stats_array[index1].stats.Fg3PtMade["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "3PA: ", stats_array[index1].stats.Fg3PtAtt["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "FTA: ", stats_array[index1].stats.FtAtt["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "FTM: ", stats_array[index1].stats.FtMade["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "OREB: ", stats_array[index1].stats.OffReb["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "DREB: ", stats_array[index1].stats.DefReb["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "REB: ", stats_array[index1].stats.Reb["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "AST: ", stats_array[index1].stats.Ast["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "BLK: ", stats_array[index1].stats.Blk["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "STL: ", stats_array[index1].stats.Stl["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "TOV: ", stats_array[index1].stats.Tov["#text"]));
    document.getElementById("stats-secondary").appendChild(createElement("li", "PF: ", stats_array[index1].stats.FoulPers["#text"]));
};

var displayCarousel = function() {
  
  //clear any previous results 
  document.getElementById("team").innerHTML = '';
  document.getElementById("team-list").innerHTML = '';

  //extract the city and team name from the current player clicked
  var team = stats_array.
              filter(function(entry) { 
                return (entry.player.FirstName + " " + entry.player.LastName).toLowerCase() === current_player_clicked 
              }).
              map(function(entry) {
                return entry.team.City + " " + entry.team.Name
              });

  //Display the team name header 
  document.getElementById("team").appendChild(createElement( "h4", team.toString() ));

  //Display the other team players
  var team_list = stats_array.
                    filter(function(entry) { 
                      return (entry.team.City + " " + entry.team.Name) === team.toString() 
                    }).
                    map(function(entry) {
                      return entry.player.FirstName + " " + entry.player.LastName + ", " + entry.player.Position
                    });

  team_list.forEach(function(value, i) {
    document.getElementById("team-list").appendChild(createElement( "li", team_list[i] ));
  }) 
};


  



/* -------------------------- Utility functions ---------------------------- */

function getJSON(url) {
  return get(url).then(JSON.parse);
}

function get(url) {
  //Return a new promise
  return new Promise(function(resolve, reject) {
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    
    //Authorization details go here 
    req.setRequestHeader("Authorization", "Basic " + btoa("jaellen:adanaC4032"));

    req.onload = function() {
      //Check the status
      if (req.status === 200) {
          resolve(req.response);
      }
      else {
        reject(Error(req.statusText));
      }
    };
    //Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"))
    };
    //Make the request
    req.send();
  });
}

function findPlayerClickedIndex (array, player) {
      var index;
  
      for (var i = 0; i < array.length; i++) {
        if (  (array[i].player.FirstName + " " + array[i].player.LastName).toLowerCase() == player ) {
          index = i;
          return index;
        }  
      }  
}

function createElement(type){
  var node = document.createElement(type);
  for (var i = 1; i < arguments.length; i++) {
    var child = arguments[i];
    if (typeof child == "string") {
      child = document.createTextNode(child);
    }
    node.appendChild(child);
  }
  return node;
} 

/* -------------------------- Test and Assertions -------------------------- */


