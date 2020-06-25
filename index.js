if (Number(process.version.slice(1).split(".")[0]) < 8)
  throw new Error(
    "Node 8.0.0 or higher is required. Update Node on your system."
  );

//discord client
const { Client } = require("discord.js");
const Enmap = require("enmap");

const cron = require("node-cron");

const pinger = require("minecraft-pinger");
const Query = require("mcquery");

const fs = require("fs");

require("dotenv").config();

var HOST = process.env.MC_SERVER || "play.sentinelcraft.net";
var PORT = process.env.MC_PORT || 25565;

const query = new Query(HOST, PORT, { timeout: 30000 });
const Server = { OFFLINE: 1, ONLINE: 2, FAILED: 3, STARTUP: 4 };
Object.freeze(Server);
const MESSAGE_CHAR_LIMIT = 2000;

//DISCORD CLIENT
const client = new Client();
client.settings = new Enmap();
//OWN FILES
const roles = require("./roles.json");
const staff = require("./staff.json");
const rules = require("./rules.json");

client.settings.disableping = false;
//ALL ADMINS OF THE BOT, THESE PEOPLE HAVE FULL ACCESS TO ALL COMMANDS
client.admins = [
  staff.AMNOTBANANAAMA.id,
  staff.Toxic_Demon93.id,
  staff.PaulinaCarrot.id,
  staff.ninja5132.id,
  staff.Fjerreiro.id,
  staff.migas94.id,
];

client.once("ready", () => {
  console.log("Ready!");

  setInterval(function () {
    client.user
      .setPresence({
        game: {
          name: `${process.env.PREFIX}${
            triggers[Math.floor(Math.random() * triggers.length)]
          }`,
        },
      })
      .catch(console.error);
  }, 600000);

  ping()
    .then((s) => {
      SetState.online = s["online"];
      setOnlineTime();
    })
    .catch((e) => {
      SetState.online = e["online"];
      console.error(e);
    });

  cron.schedule("7,17,27,37,47,57 * * * *", async () => {
    ping()
      .then((s) => {
        SetState.online = s["online"];
        setOnlineTime();
      })
      .catch((e) => {
        SetState.online = e["online"];
        console.error(e);
      });
    console.log(
      `${getTime()} Server is ${state.online == 2 ? "online" : "offline"}`
    );
  });
});

const checkForContent = async (message) => {
  const content = message.content.split(" ");
  const group = ["when", "1.16", "update", "server", "nether", "updated"];

  //intersect
  const test = group.filter((value) => content.includes(value));

  if (test.length >= 3) {
    const channel = await message.author.createDM();

    channel
      .send({
        embed: {
          title: `**SERVER UPDATE TO 1.16**`,
          description: `There is currently no estimated release date for 1.16.\nIn order to update, we have to wait for several factors outside of our control, such as updates to plugins and bug fixes. \n\n**The most important thing for us is that the server updates safely and smoothly.**\n\n Until/if we can guarantee that, we will wait to update. Please be patient, \nsupporting new versions is a lot of work.`,
          color: 3066993,
          image: {
            url: "https://i.imgur.com/ErkdrOQ.png",
          },
        },
      })
      .catch(console.error);
  }
};

//MAIN LISTENER FOR ALL MESSAGES
client.on("message", async (message) => {
  if (message.author.bot) return;
  checkForContent(message);
  if (
    !message.content.startsWith(process.env.PREFIX) ||
    !process.env.CHANNEL_ID.includes(message.channel.id)
  )
    return;
  const content = message.content.slice(process.env.PREFIX.length).split(/ +/);
  console.log(content);
  const command = content.shift().toLowerCase();

  const args = content;

  if (triggers.includes(command)) {
    message.channel
      .send(`Checking server for players, please wait...`)
      .then(async (m) => {
        await ping()
          .then((s) => {
            state.online = s["online"];
            setOnlineTime();
          })
          .catch((e) => {
            state.online = e["online"];
            console.error(e);
          });
        if (state.online == Server.OFFLINE)
          return SendToDiscord(m, Server.OFFLINE);
        GetPlayers()
          .then((res) => {
            if (query.outstandingRequests === 0) {
              query.close();
            }

            let playerarray = res.players;
            let memberarray = [];
            let staffarray = [];

            playerarray.sort((a, b) => a.localeCompare(b));

            playerarray.forEach((el) => {
              if (staff.hasOwnPropertyCI(el)) {
                staffarray.push(
                  `  - [${staff[
                    Object.keys(staff).find(
                      (key) => key.toLowerCase() === el.toLowerCase()
                    )
                  ].rank.toUpperCase()}] ${el}`
                );
              } else {
                memberarray.push(`  - ${el}`);
              }
            });

            let answer = "";
            m.edit(
              `**Currently ${res.onlinePlayers}/${
                res.maxPlayers
              } Players Online at ${getTime()}**`
            )
              .then((m) => {
                if (staffarray.length == 0 && memberarray.length > 0) {
                  answer = `\`\`\`ini\n[MEMBERS]\n\n${memberarray.join(
                    "\t\n"
                  )}\n\n\`\`\``;
                } else if (memberarray.length == 0 && staffarray.length > 0) {
                  answer = `\`\`\`ini\n[STAFF]\n\n${staffarray.join(
                    "\t\n"
                  )}\`\`\``;
                } else if (memberarray.length == 0 && staffarray.length == 0) {
                  answer = `\`\`\`ini\nNoone is currently online, you can change this by joining right now!!\`\`\``;
                } else {
                  answer = `\`\`\`ini\n[MEMBERS]\n\n${memberarray.join(
                    "\t\n"
                  )}\n\n[STAFF]\n\n${staffarray.join("\t\n")}\`\`\``;
                }

                splitString(answer).forEach((el) => {
                  m.channel.send(el).catch(console.error);
                });
              })
              .catch((e) => {
                state.online == Server.OFFLINE
                  ? SendToDiscord(m, Server.OFFLINE)
                  : SendToDiscord(m, Server.FAILED),
                  console.error(e);
              });
          })
          .catch((e) => {
            state.online == Server.OFFLINE
              ? SendToDiscord(m, Server.OFFLINE)
              : SendToDiscord(m, Server.FAILED),
              console.error(e);
          });
      });
  } else if (command == "help") {
    message.channel
      .send({
        embed: {
          title: "**HELP**",
          description: "This bot was custom made for Sentinelcraft",
          fields: [
            {
              name: "**COMMANDS**",
              value: commandarray
                .map((i) => `${process.env.PREFIX}` + i)
                .join("\n"),
            },
            {
              name: "**IP**",
              value: process.env.IP,
            },
            {
              name: "**WEBSITE**",
              value: "https://www.sentinelcraft.net",
            },
            {
              name: "**FORUM**",
              value: process.env.FORUM,
            },
          ],
        },
      })
      .catch(console.error);
  } else if (command == "ip") {
    message.channel
      .send({
        embed: {
          title: "**SERVER IP**",
          description: process.env.IP,
        },
      })
      .catch(console.error);
  } else if (command == "donate") {
    message.channel
      .send({
        embed: {
          title: "**DONATE SITE**",
          description: process.env.DONATE,
        },
      })
      .catch(console.error);
  } else if (command == "forum") {
    message.channel
      .send({
        embed: {
          title: "**FORUM**",
          description: process.env.FORUM,
        },
      })
      .catch(console.error);
  } else if (command == "map") {
    message.channel
      .send({
        embed: {
          title: "**MAP**",
          description: process.env.MAP,
        },
      })
      .catch(console.error);
  } else if (command == "vote") {
    message.channel
      .send({
        embed: {
          title: "**VOTE SITES**",
          description: process.env.VOTE,
        },
      })
      .catch(console.error);
  } else if (command == "appeal") {
    message.channel
      .send({
        embed: {
          title: "**BAN APPEAL**",
          description: `- Follow this format to appeal:\n ${process.env.FORMAT_APPEAL}\n\n- And post it here:\n ${process.env.APPEAL}`,
        },
      })
      .catch(console.error);
  } else if (command == "rules") {
    message.channel
      .send({
        embed: {
          title: "**RULES**",
          fields: [
            {
              name: "**DISCORD RULES**",
              value: `\`\`\`${rules.discord
                .map((i) => "-" + i)
                .join("\n\n")}\`\`\``,
            },
            {
              name: "**SERVER RULES**",
              value: process.env.RULES,
            },
          ],
        },
      })
      .catch(console.error);
  } else if (command == "music") {
    message.channel
      .send({
        embed: {
          title: "**MUSIC COMMANDS**",
          fields: [
            {
              name: `**>play**`,
              value: `\`\`\`Plays a song with the given name or url.\`\`\``,
            },
            {
              name: `**>queue**`,
              value: `\`\`\`View the queue. To view different pages, type the command with the specified page number after it (>queue 2).\`\`\``,
            },
            {
              name: `**>lyrics**`,
              value: `\`\`\`Ever wondered what the songtext is? Or if you want to sing along like Joel, use this to get the text of the requested song.\`\`\``,
            },
            {
              name: `**>search**`,
              value: `\`\`\`Search for a specific song, found one you like? reply with the number of the track to play it.\`\`\``,
            },
            {
              name: `**>np**`,
              value: `\`\`\`Lists the current song playing.\`\`\``,
            },
            {
              name: `**>loop**`,
              value: `\`\`\`Loop the currently playing song.\`\`\``,
            },
          ],
        },
      })
      .catch(console.error);
  } else if (command == "userinfo") {
    let user = message.mentions.members.first();
    if (!message.mentions.members.first()) {
      user = message.guild.members.find(
        (u) =>
          u.displayName == args.join(" ") ||
          u.tag == args.join(" ") ||
          u.id == args
      );
    }
    if (!user) return message.channel.send("Could not find this user");
    var nickname = user.nickname;
    var joined = user.joinedAt.toString().substring(4, 15);
    var created = user.user.createdAt.toString().substring(4, 15);

    const joineddays = getDays(Date.now(), new Date(user.joinedAt));
    const createddays = getDays(Date.now(), new Date(user.user.createdAt));

    var roles = user.roles
      .filter((role) => role.id !== message.channel.guild.id)
      .map((r) => `${r.name}`)
      .join(` - `);
    if (!roles) {
      roles = "I have no roles";
    }
    if (!nickname) {
      nickname = user.displayName;
    }

    const sortedmembers = message.guild.members.sort(
      (a, b) => a.joinedAt - b.joinedAt
    );

    const position = sortedmembers
      .map(function (obj) {
        return obj.id;
      })
      .indexOf(user.id);

    message.channel.send({
      embed: {
        title: `${user.displayName}#${user.user.discriminator}`,
        description: `Chilling in ${user.presence.status} status`,
        color: 13632027,
        thumbnail: {
          url: user.user.avatarURL,
        },
        footer: {
          icon_url: client.user.avatarURL,
          text: `#${position + 1} | User ID ${user.id}`,
        },
        fields: [
          {
            name: "**Nickname**",
            value: nickname,
            inline: false,
          },
          {
            name: "**Created Discord account on**",
            value: `${created} \n(${createddays} days ago)`,
            inline: true,
          },
          {
            name: "**Joined Sentinelcraft discord on**",
            value: `${joined} \n(${joineddays} days ago)`,
            inline: true,
          },

          {
            name: "**Roles**",
            value: roles,
            inline: false,
          },
        ],
      },
    });
  } else if (command === "ping" && client.admins.includes(message.author.id)) {
    if (args.length === 0)
      return message.channel.send({
        embed: {
          title: `**PING**`,
          description: `Pinging of staff is currently ${
            client.settings.disableping ? "**off**" : "**on**"
          }`,
          color: 3066993,
        },
      });
    const suffix = args.toString() === "off";
    //changing the setting
    client.settings.disableping = suffix ? true : false;

    message.channel.send({
      embed: {
        title: `**PING**`,
        description: `Changed pinging of staff to ${
          client.settings.disableping ? "**off**" : "**on**"
        } do **!ping ${suffix ? "on" : "off"}** to ${
          suffix ? "enable" : "disable"
        } it`,
        color: 3066993,
      },
    });
  } else if (
    command === "fakejoin" &&
    client.admins.includes(message.author.id)
  ) {
    client.emit(
      "guildMemberAdd",
      message.member || message.guild.fetchMember(message.author)
    );
    message.channel.send("I added a fake join");
  } else if (command === "invite") {
    message.channel
      .createInvite({
        maxAge: 3600,
        maxUses: 5,
        unique: true,
        reason: `Invite requested by ${message.author}`,
      })
      .then((invite) => {
        message.channel.send({
          embed: {
            title: `**Invite**`,
            description: `Succesfully created a temporary invite valid for 1 hour`,
            color: 3066993,
            fields: [
              {
                name: "**URL**",
                value: invite.url,
                inline: false,
              },
            ],
          },
        });
      })
      .catch(console.error);
  } else if (
    command === "promote" &&
    client.admins.includes(message.author.id)
  ) {
    if (args.length === 2) {
      promote(args[0], args[1], message);
    } else {
      return message.channel.send("invalid amount of arguments");
    }
  } else if (command === "1.16" || command == "update") {
    message.channel
      .send({
        embed: {
          title: `**SERVER UPDATE TO 1.16**`,
          description: `There is currently no estimated release date for 1.16.\nIn order to update, we have to wait for several factors outside of our control, such as updates to plugins and bug fixes. \n\n**The most important thing for us is that the server updates safely and smoothly.**\n\n Until/if we can guarantee that, we will wait to update. Please be patient, \nsupporting new versions is a lot of work.`,
          color: 3066993,
          image: {
            url: "https://i.imgur.com/ErkdrOQ.png",
          },
        },
      })
      .catch(console.error);
  }
});

const getDays = (dt1, dt2) => {
  var start = new Date(dt2);
  var end = new Date(dt1);
  var days = (end - start) / 1000 / 60 / 60 / 24;
  days =
    days - (end.getTimezoneOffset() - start.getTimezoneOffset()) / (60 * 24);
  return Math.floor(days);
};

client.on("guildMemberAdd", async (member) => {
  const welcomechannel = member.guild.channels.find(
    (c) => c.id == process.env.WELCOME_CHANNEL
  );
  if (!welcomechannel) return;
  welcomechannel
    .send({
      embed: {
        color: 5693462,
        title: `Welcome to the server **${member.user.username}**`,
        thumbnail: {
          url: "https://i.imgur.com/MEhv2WJ.gif",
        },
        fields: [
          {
            name: "Membercount",
            value: `${member.guild.name} has ${
              member.guild.members.filter((member) => !member.user.bot).size
            } members`,
          },
          {
            name: "Info",
            value: `Use ${process.env.PREFIX}help to see my commands`,
          },
        ],
        footer: {
          icon_url: member.user.avatarURL,
          text: `Automatic message on new guildmember`,
        },
      },
    })
    .catch(console.error);
  assignBasicRole(member);
});

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));

client.login(process.env.TOKEN);

//HELPER FUNCTIONS

const assignBasicRole = (member) => {
  member
    .addRole(roles.Member.id)
    .catch(() => console.error(`Failed to assign role : ${roles.Member.id}`));
};

//ADD TRIGGERS FOR THE BOT HERE AS STRINGS, IT WILL REPLY TO THESE WITH THE PLAYERLIST COMMAND
const triggers = ["players", "list", "online", "status", "who"];

//ADD ALL OTHER COMMANDS HERE, THEY WILL BE MERGED TO 1 LIST AND APPEAR IN THE HELP
const commandarray = [
  ...triggers,
  "ip",
  "forum",
  "donate",
  "vote",
  "map",
  "music",
  "appeal",
  "userinfo",
  "invite",
  "update",
  "1.16",
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

const promote = (target, role, msg) => {
  if (staff[target]) {
    staff[target].rank = role;
  } else {
    staff[target] = { rank: role };
  }

  saveStaff();
  msg.channel.send(`Updated ${target}'s role to ${role} in the JSON.`);
};

const saveStaff = () => {
  let data = JSON.stringify(staff, null, 2);
  fs.writeFile("staff.json", data, (err) => {
    if (err) throw err;
    console.log("Data written to file");
  });
};

/**
 * Description (function that will look for all online and idle staff in discord and alert them witht he message).
 * @global
 * @param {String} message Message that will be send to all online/idle staff
 */
const alertStaff = (message) => {
  console.log("ALERTSTAFF");
  if (client.settings.disableping)
    return console.info(
      `DID NOT ALERT STAFF AT ${new Date()} because pings were turned off`
    );
  let Sentinel = client.guilds.find((guild) => guild.id == process.env.ID);
  if (!Sentinel) return console.error("Did not find any guilds");
  let SA = Sentinel.members.filter((m) => client.admins.includes(m.id));
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
          if (err != null) {
            console.log(err);
          }
          reject({ message: "Server is offline", error: err });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

//EVENT HANDLER WHEN SERVERSTATE CHANGES
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
        `Server went offline at ${getTime()}, this message was sent to all online and idle staff`
      );
    }
    target[key] = value;
    return true;
  },
});
