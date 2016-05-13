const IrcClient = (() => {
  const irc = require('irc');
  const shell = require('electron');
  const browser = require('electron').remote;
  const randomColor = require('randomcolor');

  class IRCClient extends React.Component {
    constructor() {
      super();
      this.onCommandEntered = this.onCommandEntered.bind(this)

      this.commands = [
        {
          synonyms: ["/devtools", "/debug"],
          func: (args) => {
            browser.openDevTools();
          }
        },
        {
          synonyms: ["/restart", "/reload"],
          func: (args) => {
            browser.reload();
          }
        },
        {
          synonyms: ["/nicks", "/users"],
          func: (args) => {
            if(this.state.client !== undefined) {
              const nicks = _.keys(this.state.nickColors[this.state.currentChannel]);
              let coloredNicks = [];
              _.forEach(nicks, (n) => {
                coloredNicks.push(`<span style="color: ${this.state.nickColors[this.state.currentChannel][n]}">${n}</span>`);
              });

              this.state.messages.append(`Nicks: ${coloredNicks.join(", ")}<br/>`);
            }
          }
        },
        {
          synonyms: ["/me", "/action"],
          func: (args) => {
            if(this.state.client !== undefined) {
            }
          }
        },
        {
          synonyms: ["/clear", "/cls"],
          func: (args) => {
            this.state.messages.html("");
          }
        },
        {
          synonyms: ["/identify", "/i"],
          func: (args) => {
            if(this.state.client !== undefined &&
               args.length === 1) {
              client.say("nickserv", `identify ${args[0]}`);
            }
          }
        },
        {
          synonyms: ["/disconnect", "/dc"],
          func: (args) => {
            if(this.state.client !== undefined) {
              this.state.client.disconnect();
            }
          }
        },
        {
          synonyms: ["/login", "/server", "/irc"],
          func: (args) => {
            // args -> [server, nick, channel1, channel2, channel3, etc...]

            // /login irc.freenode.net majyk_DEV ##sandbox

            // TODO: Check to see if this.state.client is already initalized and
            // if so, disconnect gracefully and then perform the login the user
            // requested.

            if(args.length >= 2) {
              const server = args[0];
              const nick = args[1];
              let channels = [];

              if(args.length > 1) {
                channels = args.slice(2);
              }

              //console.log(server, nick, channels);

              this.printResponse(`<hr noshade />Logging into: ${server}...<p>`);

              let client = new irc.Client(server, nick, { channels: channels });

              this.setState({
                server: server,
                client: client,
                nick: nick,
                currentChannel: channels[0],
                myNickColor: this.getRandomColor()
              }, () => {
                this.setupIRCEventHandlers(client);
              });
            }
          }
        },
        {
          synonyms: ["/join"],
          func: (args) => {
            if(args.length >= 1) {
              this.state.currentChannel === args[0];
              this.state.client.join(args[0]);
            }
          }
        },
        {
          synonyms: ["/part"],
          func: (args) => {
            if(this.state.client !== undefined &&
               args.length >= 1) {
              this.state.client.part(args[0]);
            }
          }
        },
        {
          synonyms: ["/help", "/h"],
          func: (args) => {
          }
        },
        {
          synonyms: ["/debugChannel", "/debugChan", "/dc"],
          func: (args) => {
            if(args.length === 1) {
              console.log(this.getChannelInfo(args[0]));
            }
          }
        },
        {
          synonyms: ["/channel", "/chan"],
          func: (args) => {
            if(args.length === 1) {
              this.switchChannel(args[0]);
            }
          }
        },
        {
          synonyms: ["/topic"],
          func: (args) => {
            if(this.state.client !== undefined &&
               args.length === 1) {
              this.state.client.send("topic", args[0]);
            }
          }
        },
        {
          synonyms: ["/listChannels", "/lc"],
          func: (args) => {
            if(this.state.client !== undefined) {
              let channelsHtml = [];
              _.forEach(_.keys(this.state.channelColors), (c) => {
                channelsHtml.push(`<span style="color: ${this.state.channelColors[c]};">${c}</span>`);
              });

              this.state.messages.append(`Channels: ${channelsHtml.join(", ")}<br/>`);
            }
          }
        }
      ];

      this.eventHandlers = {
        names: (channel, nicks) => {
          //console.log("names", channel, nicks);

          let channelNickColors = {};
          _.forEach(_.keys(nicks), (n) => {
            if(this.state.nick !== n) {
              channelNickColors[n] = this.getRandomColor();
            }
          });

          this.state.nickColors[channel] = channelNickColors;

          if(this.state.currentChannel === channel) {
            let coloredNicksHtml = _.keys(nicks).map((n) => {
              let color = (n === this.state.nick) ?
                this.state.myNickColor : this.state.nickColors[channel][n];

              return `<span style='color: ${color};'>${n}</span>`;
            });

            this.printResponse(`<span>Nicks: ${coloredNicksHtml.join(", ")}</span><br/>`);
            this.scrollContentArea();
          }
        },
        registered: (message) => {
          this.state.channels.push({
            type: "registered",
            to: "server",
            from: "server",
            message: message
          });

          //console.log("registered", message);

          this.printResponse(`<span>${this.sanitizeHTMLTag(message.args[1])}</span><br/>`);
          this.scrollContentArea();
        },
        motd: (message) => {
          this.state.channels.push({
            type: "motd",
            to: "server",
            from: "server",
            message: message
          });

          this.printResponse(`<span style='color: #345;'><pre>${this.sanitizeHTMLTag(message)}</pre></span><br/>`);
          this.scrollContentArea();
        },
        topic: (channel, topic, nick, message) => {
          this.state.channels.push({
            type: "topic",
            to: channel,
            topic: topic,
            nick: nick,
            message: message
          });

          if(this.state.currentChannel === channel) {
            this.printResponse(`<span style='background-color: #777;'>${this.sanitizeHTMLTag(channel)}: ${this.sanitizeHTMLTag(topic)} set by ${nick}</span><br/>`);
            this.scrollContentArea();
          }
        },
        message: (from, to, message) => {
          this.state.channels.push({
            type: "message",
            to: to,
            from: from,
            message: message
          });

          //console.log(`${to}@${from}: ${message}`);

          if(this.state.currentChannel === to) {
            this.appendToCurrentChannel(from, to, message);
          }
        },
        selfMessage: (to, message) => {
          this.state.channels.push({
            type: "selfMessage",
            to: to,
            from: this.state.nick,
            message: message
          });

          //console.log(`me@${to}: ${message}`);

          if(this.state.currentChannel === to) {
            this.printResponse(`<span style='color:#777;'>${this.state.nick}@${this.sanitizeHTMLTag(to)}: ${this.sanitizeHTMLTag(message)}</span><br/>`);
            this.scrollContentArea();
          }
        },
        notice: (from, to, text, message) => {
          if(from === null) {
            from = "server";
          }

          this.state.channels.push({
            type: "notice",
            to: to,
            from: from,
            text: text,
            message: message
          });

          if(this.state.currentChannel === to ||
            this.state.nick === to) {
            this.printResponse(`<span>${this.sanitizeHTMLTag(text)}</span><br/>`);
            this.scrollContentArea();
          } else {
            //console.log("received Notice event but not for this current channel");
            //console.log(`${from}@${to}: text = ${text} | message = ${message}`);
          }
        },
        action: (from, to, text, message) => {},
        error: (message) => {},
        pm: (from, message) => {},
        join: (channel, nick, message) => {
          if(this.state.client !== undefined) {
            this.setState({
              currentChannel: channel
            }, () => {
              // set the messages HTML to be that of the current channel
              // output the topic at the top
              this.switchChannel(channel);
            });
          }
        },
        quit: (nick, reason, channels, message) => {},
        part: (nick, reason, channels, message) => {},
        kick: (nick, reason, channels, message) => {},
        nick: (oldnick, newnick, channels, message) => {},
        raw: (message) => { /*console.log(message);*/ }
      };

      this.state = {
        currentChannel: "",
        channels: [], // will contain channel name and messages,
        nickColors: {}, // key is a channel name which has a value of an object
                        // with nicks as keys and values as the color
        channelColors: {}
      };
    }
    switchChannel(channel) {
      const chan = this.getChannelInfo(channel);
      if(chan !== undefined) {
        if(messages !== undefined) {
          // YOLO: this is not scalable but I'm going to do it anyway for
          // a little while... LOL!

          this.state.messages.html("");
          browser.setTitle(`${this.state.nick}@${this.state.currentChannel}:${this.state.server}`);

          let chanColor = this.state.channelColors[channel];
          if(chanColor === undefined) {
            this.state.channelColors[channel] = this.getRandomColor();
          }

          if(this.state.currentChannel !== channel) {
            this.setState({
              currentChannel: channel
            }, () => {
              this.state.client.send("topic", this.state.currentChannel);
              _.forEach(chan, (c) => {
                this.appendToCurrentChannel(c.from, c.to, c.message);
              });
            });
          } else {
            _.forEach(chan, (c) => {
              this.appendToCurrentChannel(c.from, c.to, c.message);
            });
          }
        }
      }
    }
    getChannelInfo(channel) {
      const chan = _.where(this.state.channels, { "to" : channel, "type": "message" });
      if(chan !== undefined) {
        return chan;
      } else {
        return [];
      }
    }
    getRandomColor() {
      return randomColor({ luminosity: 'dark' });
    }
    sanitizeHTMLTag(text) {
      if(text !== undefined && typeof text !== "object") {
        text = text.replace("<", "&lt;");
        text = text.replace(">", "&gt;");
      } else {
        return "";
      }
      return text;
    }
    printWelcomeMessage() {
      const welcomeMessage =
        `Welcome to Simple IRC Client for Electron.
        <p>
        Github repository: <a href="external">https://github.com/frankhale/simple-irc-client</a>
        <p>
        By: Frank Hale &lt;frankhale@gmail.com&gt;
        <br/>
        Date: 12 May 2016
        <p>`;

      this.printResponse(welcomeMessage);
    }
    printResponse(text) {
      this.state.messages.append(text);
    }
    appendToCurrentChannel(from, to, message) {
      //console.log("nickColors", this.state.nickColors);
      //console.log(`appendToCurrentChannel: to = ${to}`);
      //console.log(`appendToCurrentChannel: from = ${from}`);

      let fromNickColor = this.state.nickColors[to][from];
      let toChanColor = this.state.channelColors[to];

      if(fromNickColor === undefined) {
        fromNickColor = "#000";
      }

      if(toChanColor === undefined) {
        toChanColor = "#000";
      }

      this.printResponse(`<span><span style='color: ${fromNickColor};'>${from}</span>@<span style='color: ${toChanColor};'>${this.sanitizeHTMLTag(to)}</span>: ${this.sanitizeHTMLTag(message)}</span><br/>`);
      this.scrollContentArea();
    }
    scrollContentArea() {
      this.state.messages.scrollTop(this.state.messages[0].scrollHeight);
    }
    onCommandEntered(text) {
      if(text.startsWith("/") && text.length > 1) {
        const textSplit = text.split(" ");
        const command = textSplit[0];
        const args = textSplit.slice(1);

        //console.log(command, args);

        _.forEach(this.commands, (cmd) => {
          if(_.indexOf(cmd.synonyms, command) > -1) {
            cmd.func(args);
          }
        });
      } else {
        if(this.state.client !== undefined &&
           this.state.currentChannel !== undefined) {
          this.state.client.say(this.state.currentChannel, text);
        }
      }
    }
    setupIRCEventHandlers(client) {
      client.addListener('names', (channel, nicks) => { this.eventHandlers.names(channel, nicks); });
      client.addListener('registered', (message) => { this.eventHandlers.registered(message); });
      client.addListener('motd', (message) => { this.eventHandlers.motd(message); });
      client.addListener('topic', (channel, topic, nick, message) => { this.eventHandlers.topic(channel, topic, nick, message); });
      client.addListener('message', (from, to, message) => { this.eventHandlers.message(from, to, message); });
      client.addListener('selfMessage', (to, message) => { this.eventHandlers.selfMessage(to, message); });
      client.addListener('notice', (from, to, text, message) => { this.eventHandlers.notice(from, to, text, message); });
      client.addListener('action', (from, to, text, message) => { this.eventHandlers.action(from, to, text, message); });
      client.addListener('error', (message) => { this.eventHandlers.error(message); });
      client.addListener('pm', (from, message) => { this.eventHandlers.pm(from, message); });
      client.addListener('join', (channel, nick, message) => { this.eventHandlers.join(channel, nick, message); });
      client.addListener('quit', (nick, reason, channels, message) => { this.eventHandlers.quit(nick, reason, channels, message); });
      client.addListener('part', (nick, reason, channels, message) => { this.eventHandlers.part(nick, reason, channels, message); });
      client.addListener('kick', (nick, reason, channels, message) => { this.eventHandlers.kick(nick, reason, channels, message); });
      client.addListener('nick', (oldnick, newnick, channels, message) => { this.eventHandlers.nick(oldnick, newnick, channels, message); });
      client.addListener('raw', (message) => { this.eventHandlers.raw(message); });
    }
    componentDidMount() {
      const $messages = $("#messages");
      const resizeMessagesDiv = () => { $messages.height(window.innerHeight - 55); };
      resizeMessagesDiv();
      $(window).resize((e) => { resizeMessagesDiv(); });
      this.setState({ messages: $messages }, () => {
        this.printWelcomeMessage();
        $(`#ui a[href="external"]`).each(function() {
          $(this).click(() => {
            this.href="#";
            shell.openExternal(this.innerHTML);
          });
        })
      });
    }
    render() {
      return (
        <div>
          <div id="messages"></div>
          <CommandBox onKeyEnter={this.onCommandEntered} />
        </div>
      );
    }
  }

  return {
    init: () => {
      ReactDOM.render(<IRCClient />, document.getElementById("ui"));
    }
  };
})();

$(document).ready(function() {
  IrcClient.init();
});
