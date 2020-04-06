const { Client } = require("discord.js");

const cron = require("node-cron");

const {
  assignBasicRole,
  Server,
  state,
  commandarray,
  triggers,
  ping,
  setOnlineTime,
  GetPlayers,
  SendToDiscord,
  query,
  getTime,
  splitString,
  SetState,
} = require("./helpers");

require("dotenv").config();

const client = new Client();

const staff = require("./staff.json");
const rules = require("./rules.json");

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

//MAIN LISTENER FOR ALL MESSAGES
client.on("message", async (message) => {
  if (
    !message.content.startsWith(process.env.PREFIX) ||
    message.author.bot ||
    !process.env.CHANNEL_ID.includes(message.channel.id)
  )
    return;
  const args = message.content.slice(process.env.PREFIX.length).split(/ +/);
  const command = args.shift().toLowerCase();
  if (triggers.includes(command)) {
    message.channel
      .send(`Checking server for players, please wait...`)
      .then(async (m) => {
        await ping()
          .then((s) => {
            SetState.online = s["online"];
            setOnlineTime();
          })
          .catch((e) => {
            SetState.online = e["online"];
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
  }
});

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
