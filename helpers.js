const roles = require("./roles.json");
const pinger = require("minecraft-pinger");
const Query = require("mcquery");
const staff = require("./staff.json");

require("dotenv").config();

var HOST = process.env.MC_SERVER || "play.sentinelcraft.net";
var PORT = process.env.MC_PORT || 25565;

const query = new Query(HOST, PORT, { timeout: 1000 });
const Server = { OFFLINE: 1, ONLINE: 2, FAILED: 3, STARTUP: 4 };
Object.freeze(Server);

const MESSAGE_CHAR_LIMIT = 2000;

/**
 * Description (function to assign roles ).
 * @global
 * @augments Object
 * @param {Object} date First date
 */
const assignBasicRole = (member) => {
  member
    .addRole(roles.Member.id)
    .catch(() => console.error(`Failed to assign role : ${roles.Member.id}`));
};


/**
 * Description  Variable to store the triggers types for the bot. It Will reply to these with playlist command
 * @global
 * @param {Array} triggers array of triggers for the bot
 * Add all the trigers to the array in string format
 */
const triggers = ["players", "list", "online", "status", "who"];

/**
 * Description  Variable that holds the commands 
 * @global
 * @param {Array} commandarray array of commands 
 * Add all the commands in the string format 
 */
const commandarray = [
  ...triggers,
  "ip",
  "forum",
  "donate",
  "vote",
  "map",
  "music",
];

/**
 * Description Variable to store the current state of the server in.
 * @global
 * @param {Array} last_online array of date time objects when server was last online
 * @param {Server} online the state of the server, enum from Server class
 * @return {Object}
 */
var state = {
  last_online: [],
  online: Server.STARTUP,
};

/**
 * Description (Extension of Date to calculate difference between 2 dates in minutes).
 * @global
 * @augments Date
 * @param {Date} date1 First date
 * @param {Date} date2 Second date
 * @return {Number}
 */
Date.minutesBetween = function (date1, date2) {
  return Math.abs(new Date(date1) - new Date(date2)) / 1000 / 60;
};

/**
 * Description (Extension of Date to return full minutestring).
 * @global
 * @augments Date
 * @param {Date} dt First date
 * @return {Number}
 */
Date.getFullMinutes = function (dt) {
  return (dt.getMinutes() < 10 ? "0" : "") + dt.getMinutes();
};

/**
 * Description (Searches for a case insensitive key inside the object).
 * @global
 * @augments Object
 * @param {String} prop String to look for in the object
 * @return {Object}
 */
Object.prototype.hasOwnPropertyCI = function (prop) {
  return (
    Object.keys(this).filter(function (v) {
      return v.toLowerCase() === prop.toLowerCase();
    }).length > 0
  );
};

/**
 * Description (function to split large strings into an array of strings).
 * @global
 * @param {String} string the original string
 * @param {String} prepend every string will be prepended with this, default value
 * @param {String} append every string will be appended with this, default value
 * @return {Array}
 */
const splitString = (string, prepend = `\`\`\`ini\n`, append = `\`\`\``) => {
  if (string.length <= MESSAGE_CHAR_LIMIT) {
    return [string];
  }
  const splitIndex = string.lastIndexOf(
    "\n",
    MESSAGE_CHAR_LIMIT - prepend.length - append.length
  );
  const sliceEnd =
    splitIndex > 0
      ? splitIndex
      : MESSAGE_CHAR_LIMIT - prepend.length - append.length;
  const rest = splitString(string.slice(sliceEnd), prepend, append);
  return [
    `${string.slice(0, sliceEnd)}${append}`,
    `${prepend}${rest[0]}`,
    ...rest.slice(1),
  ];
};

/**
 * Description (function returns the last index of  array ).
 * @global
 * @param {Number} date First date
 */
Array.prototype.last = function () {
  return this[this.length - 1];
};

/**
 * Description (function that will log a message to discord).
 * @global
 * @param {Object} msg Message object to edit
 * @param {Enum} status status of the server
 */
const SendToDiscord = (msg, status) => {
  switch (status) {
    case Server.OFFLINE:
      if (state.last_online.last()) {
        let diff = Math.round(
          Date.minutesBetween(state.last_online.last(), new Date())
        );
        msg
          .edit(
            `Server is unavailable! Last online **${
              diff >= 60 ? Math.round(diff / 60) + " hours" : diff + " minutes"
            }** ago`
          )
          .catch(console.error);
      } else {
        msg
          .edit(
            `Server is unavailable! Please try again later!\nIf Senior Admins have not been contacted you can ping them, please only do this once so they are not spammed!`
          )
          .catch(console.error);
      }
      break;
    case Server.FAILED:
      msg
        .edit(`Failed getting the list of Members, please try again later!`)
        .catch(console.error);
      break;
  }
};

/**
 * Description (function that pings the server to see if it's online).
 * @global
 * @returns {Promise}
 */
const ping = async () => {
  return new Promise((resolve, reject) => {
    pinger.ping("play.sentinelcraft.net", 25565, (error, result) => {
      if (error) return reject({ status: error, online: Server.OFFLINE });
      return resolve({ status: result, online: Server.ONLINE });
    });
  });
};

/**
 * Description (function that will look for all online and idle staff in discord and alert them witht he message).
 * @global
 * @param {String} message Message that will be send to all online/idle staff
 */
const alertStaff = (message, client) => {
  console.log("ALERTSTAFF");
  let Sentinel = client.guilds.find((guild) => guild.id == process.env.ID);
  if (!Sentinel) return console.error("Did not find any guilds");
  let SA = Sentinel.members.filter((m) =>
    [
      staff.AMNOTBANANAAMA.id,
      staff.Toxic_Demon93.id,
      staff.PaulinaCarrot.id,
      staff.ninja5132.id,
      staff.Fjerreiro.id,
      staff.migas94.id,
      //ADD ID TO THE STAFF.JSON FILE TO REACH THEM, otherwise this will throw errors
    ].includes(m.id)
  );
  if (!SA) return console.error("Did not find any staff");
  let onlinestaff = [
    ...new Set(
      SA.filter(
        (m) => m.presence.status == "online" || m.presence.status == "idle"
      )
    ),
  ];
  onlinestaff.forEach((element) => {
    element[1]
      .send(`**${message}**\n ${onlinestaff.map((el) => el[1]).join("\n")}`)
      .catch((e) => console.error);
  });
};
/**
 * Description (function that format's the time to a readable string).
 * @global
 * @return {String}
 */
const getTime = () => {
  let now = new Date();
  return `${now.toLocaleDateString()} ${now.getHours()}:${Date.getFullMinutes(
    now
  )}`;
};

/**
 * Description (function that saves the last online time into an array and checks if not more than 2 dates are saved).
 * @global
 */
const setOnlineTime = () => {
  state.last_online.push(new Date());
  if (state.last_online.length >= 2) {
    state.last_online.shift();
  }
};

/**
 * Description (function that queries the server and returns a custom made object).
 * @global
 * @return {Object}
 */
const GetPlayers = () => {
  return new Promise(async (resolve, reject) => {
    try {
      query.connect(function (err) {
        query.full_stat((err, stats) => {
          stats != null || stats != undefined
            ? resolve({
                players: stats.player_,
                onlinePlayers: stats.numplayers,
                maxPlayers: stats.maxplayers,
              })
            : (SetState.online = Server.OFFLINE);
          reject({ message: "Server is offline", error: err });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Description (Event handler which handles the events when the state of the serve changes).
 * @global
 * @return {Object}
 */

var SetState = new Proxy(state, {
  set: function (target, key, value) {
    if (target[key] == value) return;
    console.log(
      `STATUS went from ${Object.keys(Server).find(
        (k) => Server[k] === target[key]
      )} to ${Object.keys(Server).find((k) => Server[k] === value)}`
    );
    if (key == "online" && value == 1) {
      alertStaff(
        `Server went offline at ${getTime()}, this message was sent to all online and idle staff`,
        client
      );
    }
    target[key] = value;
    return true;
  },
});

exports.query = query;
exports.Server = Server;
exports.assignBasicRole = assignBasicRole;
exports.triggers = triggers;
exports.commandarray = commandarray;
exports.state = state;
exports.GetPlayers = GetPlayers;
exports.setOnlineTime = setOnlineTime;
exports.getTime = getTime;
exports.alertStaff = alertStaff;
exports.ping = ping;
exports.SendToDiscord = SendToDiscord;
exports.splitString = splitString;
exports.SetState = SetState;
