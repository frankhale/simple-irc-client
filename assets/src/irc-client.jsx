var IrcClient = (() => {

  const irc = require('irc');
  const browser = require('remote').getCurrentWindow();
  const randomColor = require('randomcolor');

  const nick = "YOUR_NICK";
  const channel = "##YOUR_CHANNEL";
  const server = "irc.freenode.net";
  const client = new irc.Client(server, nick, { channels: [channel] });

  class CommandInput extends React.Component {
    constructor() {
      super();
      this.onCommandInputKeyUp = this.onCommandInputKeyUp.bind(this);
      this.state = {
        commandIndex: -1,
        commandsEntered: [],
        keys: {
          Enter: 13,
          Up: 38,
          Down: 40
        }
      };
    }
    componentDidMount() {
      // Make sure the command input box width is a consistant width based on the
      // width of the window.
      const $commandText = $("#commandText");

      this.setState({ commandText: $commandText });

      function resizeCommandInput() {
        $commandText.width(window.innerWidth - 50);
      }

      resizeCommandInput();

      $(window).resize((e) => {
        resizeCommandInput();
      });
    }
    onCommandInputKeyUp(e) {
      if(e.which === this.state.keys.Up) {
        let commandIndex = (this.state.commandIndex === -1) ?
                            this.state.commandsEntered.length - 1 :
                            --this.state.commandIndex;

        if(commandIndex < 0) {
          commandIndex = 0;
        }

        this.setState({ commandIndex: commandIndex}, function() {
          this.state.commandText.val(this.state.commandsEntered[commandIndex]);
        });

      } else if (e.which === this.state.keys.Down) {
        let commandIndex = (this.state.commandIndex === -1) ? 0 : ++this.state.commandIndex;

        if(commandIndex > this.state.commandsEntered.length) {
          commandIndex = this.state.commandsEntered.length;
        }

        this.setState({ commandIndex: commandIndex }, function() {
          this.state.commandText.val(this.state.commandsEntered[commandIndex]);
        });

      } else if(e.which === this.state.keys.Enter) {
        const textEntered = this.state.commandText.val();
        if(!(textEntered.length > 0)) return;

        this.state.commandText.val("");

        this.setState({
          commandsEntered: _.uniq(this.state.commandsEntered.concat([textEntered])),
          commandIndex: -1
        }, function() {
          if(this.props.onKeyEnter !== undefined) {
            this.props.onKeyEnter(textEntered);
          }
        });
      }
    }
    render() {
      const commandContainerStyle = {
        paddingLeft: "10px",
        position: "absolute",
        bottom: "10px"
      };

      const textInputStyle = {
        border: "none",
        outline: "none",
        paddingLeft: "2px"
      };

      return (
        <div id="commandContainer" style={commandContainerStyle}>
          &gt;<input id="commandText" style={textInputStyle} type="text" onKeyUp={this.onCommandInputKeyUp} autoFocus />
        </div>
      );
    }
  }

  class Client extends React.Component {
    constructor() {
      super();

      this.onCommandEntered = this.onCommandEntered.bind(this)

      this.state = {
        nicks: [],
        nickColors: {}
      };
    }
    scrollContentArea() {
      this.state.messages.scrollTop(this.state.messages[0].scrollHeight);
    }
    onCommandEntered(text) {
      if(text.startsWith("/")) {
        var textSplit = text.split(" ");
        if(textSplit[0] === "/users" ||
           textSplit[0] === "/nicks") {

          let nicks = this.state.nicks.map((n) => {
            return `<span style='color: ${this.state.nickColors[n]};'>${n}</span>`;
          });

          $("#messages").append(`Users: ${nicks.join(", ")}<br/>`);
          this.scrollContentArea();
        } else if (textSplit[0] === "/devtools") {
          browser.openDevTools();
        } else if (textSplit[0] === "/restart") {
          browser.reload();
        } else if (textSplit[0] === "/disconnect") {
          client.disconnect("See ya later!");
        } else if (textSplit[0] === "/identify") {
          if(textSplit.length > 1) {
            client.say("nickserv", `identify ${textSplit[1]}`);
          }
        } else if (textSplit[0] === "/clear") {
          this.state.messages.html();
        } else if (textSplit[0] === "/me") {
          client.say(channel, text);
        }
      } else {
        client.say(channel, text);
      }
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
    printResponse(text) {
      this.state.messages.append(text);
    }
    handleIRCMessages() {
      client.addListener('names', (channel, nicks) => {

        _.forEach(_.keys(nicks), (n) => {
          if(nick !== n) {
            this.state.nickColors[n] = randomColor({ luminosity: 'dark' });
          }
        });

        this.setState({
          nicks: _.keys(nicks)
        }, () => {
          let coloredNicks = _.keys(nicks).map((n) => {
            return `<span style='color: ${this.state.nickColors[n]};'>${n}</span>`;
          });

          this.printResponse(`<span>Users: ${coloredNicks.join(", ")}</span><br/>`);
          this.scrollContentArea();
        });
      });

      client.addListener('registered', (message) => {
        browser.setTitle(`${channel}@${server}`);
        this.printResponse(`<span>${this.sanitizeHTMLTag(message.args[1])}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('motd', (message) => {
        this.printResponse(`<span style='color: #345;'><pre>${this.sanitizeHTMLTag(message)}</pre></span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('topic', (channel, topic, nick, message) => {
        this.printResponse(`<span style='background-color: #777;'>${this.sanitizeHTMLTag(channel)}: ${this.sanitizeHTMLTag(topic)}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('message', (from, to, message) => {
        from = this.sanitizeHTMLTag(from);
        let fromNickColor = this.state.nickColors[from];

        if(fromNickColor === undefined) {
          fromNickColor = "#000";
        }

        this.printResponse(`<span><span style='color: ${fromNickColor};'>${from}</span>@${this.sanitizeHTMLTag(to)}: ${this.sanitizeHTMLTag(message)}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('selfMessage', (to, message) => {
        this.printResponse(`<span style='color:#777;'>${nick}@${this.sanitizeHTMLTag(to)}: ${this.sanitizeHTMLTag(message)}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('notice', (from, to, text, message) => {
        this.printResponse(`<span>${this.sanitizeHTMLTag(text)}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('action', (from, to, text, message) => {
        this.printResponse(`<span><i>${this.sanitizeHTMLTag(from)} - ${this.sanitizeHTMLTag(text)}</i></span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('error', (message) => {
        this.printResponse(`<span style='color:red;'>ERROR: ${this.sanitizeHTMLTag(message)}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('pm', (from, message) => {
        this.printResponse(`<span style='color:#678;'>PRIVATE: ${this.sanitizeHTMLTag(from)} - ${this.sanitizeHTMLTag(message)}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('join', (channel, nick, message) => {

        // TODO: Update the nicks array in the state object with the new nick

        nick = this.sanitizeHTMLTag(nick);

        let foundNick = _.find(this.state.nicks, nick);
        if(foundNick === undefined) {
          this.state.nickColors[nick] = randomColor({ luminosity: 'dark' });
        }

        this.printResponse(`<span><span style='color: ${this.state.nickColors[nick]};'>${nick}</span> has joined ${this.sanitizeHTMLTag(channel)}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('quit', (nick, reason, channels, message) => {
        this.printResponse(`<span><span style='color: ${this.state.nickColors[nick]};'>${nick}</span>: ${this.sanitizeHTMLTag(reason)}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('part', (nick, reason, channels, message) => {
        this.printResponse(`<span><span style='color: ${this.state.nickColors[nick]};'>${nick}</span>: ${this.sanitizeHTMLTag(reason)}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('kick', (nick, reason, channels, message) => {
        this.printResponse(`<span><span style='color: ${this.state.nickColors[nick]};'>${nick}</span>: ${this.sanitizeHTMLTag(reason)}</span><br/>`);
        this.scrollContentArea();
      });

      client.addListener('nick', (oldnick, newnick, channels, message) => {
        newnick = this.sanitizeHTMLTag(newnick);
        this.state.nickColors[newnick] = randomColor();
      });

      client.addListener('raw', (message) => {
        //console.log(message);
      });
    }
    componentDidMount() {
      var $messages = $("#messages");

      function resizeMessagesDiv() {
        $messages.height(window.innerHeight - 55);
      }

      resizeMessagesDiv();

      $(window).resize((e) => {
        resizeMessagesDiv();
      });

      this.setState({
        messages: $messages
      }, () => {
        this.handleIRCMessages();
      });
    }
    render() {
      return (
        <div>
          <div id="messages"></div>
          <CommandInput onKeyEnter={this.onCommandEntered} />
        </div>
      );
    }
  }

  return {
    init: () => {
      ReactDOM.render(<Client />, document.getElementById("ui"));
    }
  };
})();

$(document).ready(function() {
  IrcClient.init();
});
